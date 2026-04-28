---
name: turnkey-agent-skills
description: "Use when working with Turnkey wallet infrastructure — creating wallets, signing blockchain transactions, managing users and policies, provisioning agents, or monitoring activities. Supports Ethereum/EVM, Solana, Bitcoin, and 10+ other chains. Keys stay in hardware-backed secure enclaves."
license: Apache-2.0
compatibility: "Requires TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: "turnkey wallet signing blockchain ethereum solana bitcoin crypto policy agent"
---

# Turnkey Skills

Wallet infrastructure skills for [Turnkey](https://turnkey.com). Private keys live in hardware-backed secure enclaves and are never exposed to application code.

## Skills

**Workflows** are guided multi-step procedures (start here if you're new or doing first-time setup). **Primitives** are individual operations (use these for ongoing work and one-off tasks).

### Primitives

| Skill | Path | Use when… |
|-------|------|-----------|
| Signing Transactions | `skills/signing-transactions/SKILL.md` | signing, broadcasting, gasless/sponsored transactions on any chain |
| Managing Wallets | `skills/managing-wallets/SKILL.md` | creating wallets, deriving addresses, adding chains, import/export |
| Managing Users | `skills/managing-users/SKILL.md` | creating users, API key rotation, user tags |
| Managing Policies | `skills/managing-policies/SKILL.md` | access control, spending limits, allowlists, multi-sig, policy debugging |
| Monitoring Activities | `skills/monitoring-activities/SKILL.md` | activity status, consensus approvals, automated agent approver, audit |

### Workflows

| Skill | Path | Use when… |
|-------|------|-----------|
| Getting Started | `skills/getting-started/SKILL.md` | new to Turnkey, verifying credentials, creating first wallet |
| Provisioning Agent | `skills/provisioning-agent/SKILL.md` | giving an agent a scoped wallet with constrained credentials |
| Managing Agent | `skills/managing-agent/SKILL.md` | debugging denied transactions, changing agent policies, key rotation, revocation |

## Environment Variables

```env
TURNKEY_API_PUBLIC_KEY=    # API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Organization UUID
SIGN_WITH=                 # Address or public key to sign with (signing skills only)
```

Get credentials from the [Turnkey Dashboard](https://app.turnkey.com) under **Settings → API Keys**.

## Calling the API

All Turnkey API requests must be cryptographically signed ("stamped") with your P-256 API key. The `@turnkey/sdk-server` package handles stamping automatically and is the recommended way to call the API.

### Setup

```
npm install @turnkey/sdk-server
```

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();
```

### Mapping endpoints to SDK methods

Skills describe operations using HTTP endpoints (e.g., `POST /public/v1/query/list_wallets`). The SDK exposes these as typed TypeScript methods in `camelCase`:

- `snake_case` endpoint → `camelCase` method: `create_wallet` → `client.createWallet(...)`
- Most query endpoints rename `list_` to `get`: `list_wallets` → `client.getWallets()`. A few retain `list` (e.g., `list_user_tags` → `client.listUserTags()`, `list_private_key_tags` → `client.listPrivateKeyTags()`) — rely on the SDK's TypeScript types for the exact method name when in doubt.
- Rely on the SDK's TypeScript types for exact method names and parameters

For example, when a skill shows:

```
POST /public/v1/query/list_wallets
```
```json
{
  "organizationId": "<ORG_ID>"
}
```

The equivalent SDK call is:

```typescript
const wallets = await client.getWallets();
```

### Direct HTTP

If you cannot use the SDK, every request must include an `X-Stamp` header containing a base64url-encoded signature over the POST body. See [Turnkey docs on stamps](https://docs.turnkey.com/developer-reference/api-overview/stamps) for the stamping protocol.

### Request body convention

JSON bodies shown in skills and reference files are the **`parameters` object** — the exact shape SDK methods accept (e.g., `client.createWallet({walletName, accounts, mnemonicLength})`). When making raw HTTP calls, the wrapping differs by endpoint prefix:

- **`POST /public/v1/query/*`** (read-only, e.g. `whoami`, `list_wallets`): send the body as shown. No envelope.
- **`POST /public/v1/submit/*`** (mutations, e.g. `create_wallet`, `sign_raw_payload`): wrap in the activity envelope:

```json
{
  "type": "ACTIVITY_TYPE_CREATE_WALLET",
  "timestampMs": "1700000000000",
  "organizationId": "<ORG_ID>",
  "parameters": { /* body shown in the skill goes here */ }
}
```

The activity `type` follows the endpoint path: `create_wallet` → `ACTIVITY_TYPE_CREATE_WALLET`, `sign_raw_payload` → `ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2`, `create_users` → `ACTIVITY_TYPE_CREATE_USERS_V3`, etc. Canonical list in the [Turnkey API reference](https://docs.turnkey.com/api-reference/activities/create-wallet). `timestampMs` must be a stringified millisecond Unix timestamp and must change between otherwise-identical retries (Turnkey uses the body hash as an idempotency fingerprint).

The SDK constructs this envelope for you — this is why `client.createWallet({...})` takes only the `parameters` fields.

## Generating API key pairs

Agent provisioning and key rotation require generating a P-256 key pair locally. The private key never leaves the machine — only the public key is registered with Turnkey.

The helper below is the **derivation step only**: it returns the key pair as hex strings. The caller decides where the private half goes — persisting it is a separate, deliberate step (see "Destination for the private key" below). Do not paste the raw snippet into an ad-hoc console and walk away; that is how private keys end up in shell history.

```typescript
import crypto from "crypto";

export function generateApiKeyPair(): { publicKeyHex: string; privateKeyHex: string } {
  const keyPair = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
  const pubJwk = keyPair.publicKey.export({ format: "jwk" }) as { x: string; y: string };
  const privJwk = keyPair.privateKey.export({ format: "jwk" }) as { d: string };

  const publicKeyHex =
    "04" +
    Buffer.from(pubJwk.x, "base64url").toString("hex") +
    Buffer.from(pubJwk.y, "base64url").toString("hex");
  const privateKeyHex = Buffer.from(privJwk.d, "base64url").toString("hex");

  return { publicKeyHex, privateKeyHex };
}
```

Use `publicKeyHex` as the `publicKey` field when calling `create_api_keys` or `create_users`. `privateKeyHex` becomes the agent's `TURNKEY_API_PRIVATE_KEY`.

### Destination for the private key

Pick exactly one, in this order of preference:

1. **Secrets manager (recommended for production).** Pipe `privateKeyHex` straight into AWS Secrets Manager, HashiCorp Vault, 1Password, etc. Example: `aws secretsmanager put-secret-value --secret-id agent/turnkey --secret-string "$privateKeyHex"`. The agent runtime reads it from there; it never touches disk in cleartext.
2. **`.env` file with `chmod 600`.** Acceptable for local development and hand-off to a single machine. Write to a path **outside any git-tracked directory**. The end-to-end pattern — including the git-root guard, `chmod 600`, and wire-up to the `create_users` call — is documented in `provisioning-agent` Step 2b, Option A. Reuse that script rather than reinventing it.
3. **Terminal print (last resort, manual flows only).** Only when you cannot write to disk or a secrets manager (e.g., ephemeral shell). Treat the terminal session as compromised afterward: private key will be in shell history, scrollback, and any active screen share. Copy into a secrets manager and close the terminal.

Whichever destination you pick: never log `privateKeyHex` to application logs, never commit it, never store it alongside your root credentials, and never transmit it to Turnkey.

### Where this helper is used

- **Agent provisioning** (`provisioning-agent` Step 2b, Option A): wraps this helper with a file-write + git-tracking guard. Use that wrapper directly.
- **Key rotation** (`managing-agent` → `references/key-rotation-examples.md` Step 1): generate a new pair, register the public key while the old key is still active, verify with the new key, then delete the old one. The new `privateKeyHex` replaces the old value in whichever destination the agent's runtime reads from.
