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
- Query endpoints rename `list_` to `get`: `list_wallets` → `client.getWallets()`
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

## Generating API key pairs

Agent provisioning and key rotation require generating a P-256 key pair locally. The private key never leaves the machine — only the public key is registered with Turnkey.

```typescript
import crypto from "crypto";

const keyPair = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });

// Export as hex for Turnkey
const pubJwk = keyPair.publicKey.export({ format: "jwk" });
const privJwk = keyPair.privateKey.export({ format: "jwk" });

// Uncompressed public key: 04 || x || y
const x = Buffer.from(pubJwk.x!, "base64url");
const y = Buffer.from(pubJwk.y!, "base64url");
const publicKeyHex = "04" + x.toString("hex") + y.toString("hex");

// Private key scalar
const privateKeyHex = Buffer.from(privJwk.d!, "base64url").toString("hex");

console.log("Public key (register with Turnkey):", publicKeyHex);
console.log("Private key (store securely):", privateKeyHex);
```

Use `publicKeyHex` as the `publicKey` field when calling `create_api_keys` or `create_users`. Store `privateKeyHex` as the agent's `TURNKEY_API_PRIVATE_KEY` — never log it or commit it to source control.
