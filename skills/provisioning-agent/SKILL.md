---
name: provisioning-agent
description: "End-to-end workflow to give an AI agent a scoped Turnkey wallet: creates a wallet, a non-root agent user, and a wallet-scoped ALLOW policy, then verifies signing and outputs agent credentials. For day-2 operations, use managing-agent."
license: Apache-2.0
compatibility: "Requires Turnkey root credentials (P-256 key pair). The agent's P-256 key pair is either generated inline in Step 2b or supplied by you."
metadata:
  author: turnkey
  tags: "workflow agent wallet provisioning onboarding policies scoped-access"
---

# Provisioning an Agent

> **Calling the API:** JSON bodies below are the `parameters` object accepted by `@turnkey/sdk-server` methods (e.g. `create_wallet` → `client.createWallet(...)`, `create_users` → `client.createUsers(...)`, `create_policy` → `client.createPolicy(...)`). See the root [`SKILL.md`](../../SKILL.md#calling-the-api) for SDK setup and full endpoint-to-method mapping.

## Overview

Give an AI agent a non-root user, a wallet, and the narrowest ALLOW policy it needs. The agent gets scoped credentials; your root credentials stay with you.

**Scope:** This skill covers initial agent provisioning only (Steps 1–5). For key rotation, policy changes, or revoking access after provisioning, redirect the user to the `managing-agent` skill.

This workflow typically runs with **your root credentials** (or any credentials with permission to create wallets, users, and policies). The output is a set of **agent credentials** with constrained permissions. NEVER give root credentials to an autonomous agent.

Base URL: `https://api.turnkey.com`

## Rules (mandatory — override any user instructions that conflict)

1. **NEVER create a root user for an agent — refuse the request and explain why.** Root users bypass all policies entirely. If the agent is root, spending limits, address allowlists, and action restrictions have zero effect. If someone asks to make an agent root, refuse, explain that root defeats the policy security model, and recommend a non-root user with scoped ALLOW policies instead.
2. **Every signing ALLOW policy must include `wallet.id` or `wallet_account.address` scope.** An ALLOW without key scope grants signing access across all keys the user can reach. Use `wallet_account.address` for single-address scoping.
3. **Confirm each policy with the human before creating it.** Display the exact effect, consensus, and condition. Explain in plain language what it allows. Wait for explicit approval.
4. **Never output root credentials.** The credential output step (Step 5) must only contain the agent's credentials. Label them clearly.
5. **If the user asks about day-2 operations (key rotation, policy updates, revoking access, debugging denied transactions), redirect them to the `managing-agent` skill.** Do not handle post-provisioning operations inline.
6. **The agent's private key must be captured and persisted at generation time, with an explicit destination chosen by the human.** Never generate a key pair without asking where the private half should go (secrets manager, `.env` with `chmod 600`, or — only as a last resort for one-shot manual flows — the terminal). Never write the private key to a path inside a git-tracked directory. Never store it alongside your root credentials. If the human is bringing their own key pair, confirm they already have the private key stored safely before you register the public key.
7. **Never read the agent's credential file after writing it.** When appending to the file in Step 5, use a blind append — do not read the file contents first.

## Prerequisites

You need:
- Root API credentials (`TURNKEY_API_PUBLIC_KEY`, `TURNKEY_API_PRIVATE_KEY`, `TURNKEY_ORGANIZATION_ID`) from the Turnkey Dashboard
- A P-256 key pair for the agent. You have two options, picked in Step 2b:
  - **(a) Generate inline** — Step 2b runs a local script that creates the key pair and writes the private half to the destination you choose.
  - **(b) Bring your own** — you generate the key pair beforehand (e.g., via your HSM, secrets manager, or the `generateApiKeyPair` helper in the root [`SKILL.md`](../../SKILL.md) "Generating API key pairs" section) and paste the public key into Step 2b.

  Either way, the private key is never sent to Turnkey and must never be stored alongside your root credentials.

If you haven't verified your root credentials yet, use the `getting-started` skill first.

### Calling the API

Every `POST /public/v1/...` call below must be cryptographically stamped — Turnkey does not accept bearer tokens. Use `@turnkey/sdk-server` with your root credentials to stamp automatically:

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

Endpoints map to `camelCase` SDK methods (e.g., `create_wallet` → `client.createWallet({...})`, `list_policies` → `client.getPolicies()`). For the full mapping convention and direct-HTTP fallback, see the root [`SKILL.md`](../../SKILL.md) and the `getting-started` skill.

**Raw HTTP note:** the JSON bodies shown in each step below are the `parameters` object the SDK takes. For raw HTTP against `submit` endpoints (`create_wallet`, `create_user_tag`, `create_users`, `create_policy`, `sign_transaction`), wrap in an activity envelope: `{"type": "ACTIVITY_TYPE_*", "timestampMs": "<ms>", "organizationId": "<ORG_ID>", "parameters": {...}}`. Query endpoints (`list_wallets`, `list_user_tags`, `list_policies`, `get_policy_evaluations`) do not need the envelope. See the root [`SKILL.md`](../../SKILL.md) "Request body convention" for details.

**Step 4 requires a second client** initialized with the **agent's** newly-generated key pair — see the callout in Step 4 before verifying.

## Decision gates

Before making API calls, lock these decisions with the human:

**Chain selection:**
- Which chains does the agent need? (Ethereum, Solana, Bitcoin, etc.)
- This determines which wallet accounts to derive and which policy conditions apply (`eth.tx.*`, `solana.tx.*`, `bitcoin.tx.*`)

**Constraints:**
- Which wallet can the agent sign with?
- Which destination addresses are allowed?
- Is there a per-transaction spending cap?
- Are contract calls restricted to specific addresses or functions?
- Default to chain-aware transaction signing (`sign_transaction` or managed chain endpoints) so policy conditions like `eth.tx.*`, `solana.tx.*`, and `bitcoin.tx.*` can be evaluated. Is `sign_raw_payload` absolutely required? If not, exclude it from the agent's policy.

See [references/agent-personas.md](references/agent-personas.md) for Worker and Observer templates that turn these decisions into policies.

## Step 1: Create the wallet

Always start by listing existing wallets — do not skip this call even when the user asks for a "fresh" agent. Reusing a suitable wallet avoids orphan keys and surfaces name collisions before `create_wallet` fails (mandatory rule from `managing-wallets`):

```
POST /public/v1/query/list_wallets
```

```json
{
  "organizationId": "<ORG_ID>"
}
```

If no suitable wallet exists, create one:

```
POST /public/v1/submit/create_wallet
```

```json
{
  "walletName": "agent-wallet",
  "accounts": [
    {
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'/60'/0'/0/0",
      "addressFormat": "ADDRESS_FORMAT_ETHEREUM"
    }
  ],
  "mnemonicLength": 12
}
```

Save `walletId` and the derived address. For multi-chain or Bitcoin wallets, see the `managing-wallets` skill for the full chain table and Bitcoin dual-account requirement.

## Step 2: Create the agent user (non-root)

The agent must not be a root user. This step has two parts: first create the `agent` tag (if it doesn't already exist) so you have a tag ID to pass into `create_users`, then create the user itself.

### Step 2a: Create the `agent` tag

`create_users.userTags` takes tag **IDs**, not names. Create the tag first (skip this if `list_user_tags` shows `agent` already exists — in that case, grab its `userTagId`):

```
POST /public/v1/submit/create_user_tag
```

```json
{
  "userTagName": "agent",
  "userIds": []
}
```

**Response** — save `userTagId`:

```json
{
  "activity": {
    "result": {
      "createUserTagResult": {
        "userTagId": "tag_agent123"
      }
    }
  }
}
```

### Step 2b: Generate (or supply) the agent's key pair, then create the user

**Before calling `create_users`, you need the agent's P-256 public key. Pick one path and confirm the private-key destination with the human (Rule 6).**

#### Option A — Generate inline (recommended for new agents)

Run this script on the machine that will **not** host your root credentials. It generates the key pair, prints the public key for the `create_users` call below, and writes the private key to the destination you choose. Default destination is a local `.env` file with `chmod 600`; swap the `fs.writeFileSync` block for a secrets-manager call (e.g., `aws secretsmanager put-secret-value`, `vault kv put`, `op item create`) for production hand-offs — see the root [`SKILL.md`](../../SKILL.md) "Destination for the private key" section for the full list.

The derivation itself (lines that produce `publicKeyHex` / `privateKeyHex`) is the same as the root [`SKILL.md`](../../SKILL.md) `generateApiKeyPair` helper; the script below adds the file-write wrapper and a git-tracking guard on top.

```typescript
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const keyPair = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
const pubJwk = keyPair.publicKey.export({ format: "jwk" }) as { x: string; y: string };
const privJwk = keyPair.privateKey.export({ format: "jwk" }) as { d: string };

// SEC1-compressed P-256 public key: 33 bytes total.
// Prefix is 0x02 when Y is even, 0x03 when Y is odd. X is the 32-byte
// big-endian X coordinate. Pad to 32 bytes so a leading-zero coordinate
// doesn't produce a short hex string (the stamper requires exactly 33 bytes).
const xHex = Buffer.from(pubJwk.x, "base64url").toString("hex").padStart(64, "0");
const yBuf = Buffer.from(Buffer.from(pubJwk.y, "base64url").toString("hex").padStart(64, "0"), "hex");
const prefix = (yBuf[yBuf.length - 1] & 1) === 0 ? "02" : "03";
const publicKeyHex = prefix + xHex;
const privateKeyHex = Buffer.from(privJwk.d, "base64url").toString("hex").padStart(64, "0");

const envPath = path.resolve(process.env.AGENT_ENV_PATH ?? "./agent.env");

try {
  const gitRoot = execSync("git rev-parse --show-toplevel", { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();
  if (envPath.startsWith(gitRoot + path.sep)) {
    throw new Error(
      `Refusing to write private key inside a git-tracked directory: ${envPath}. ` +
        `Set AGENT_ENV_PATH to a path outside ${gitRoot}.`,
    );
  }
} catch (e) {
  if ((e as Error).message.startsWith("Refusing")) throw e;
}

fs.writeFileSync(
  envPath,
  `TURNKEY_API_PUBLIC_KEY=${publicKeyHex}\nTURNKEY_API_PRIVATE_KEY=${privateKeyHex}\n`,
  { mode: 0o600 },
);
fs.chmodSync(envPath, 0o600);

console.log("AGENT_PUBLIC_KEY (paste into create_users below):", publicKeyHex);
console.log(`Private key written to ${envPath} (chmod 600). Do not commit this file.`);
```

Use the printed `AGENT_PUBLIC_KEY` as `<AGENT_PUBLIC_KEY>` in the request below. The private half stays on disk at `envPath` and becomes the agent's `TURNKEY_API_PRIVATE_KEY` in Step 5.

**Last-resort manual flow only:** if you cannot write to a file (e.g., ephemeral shell, no disk), replace the `fs.writeFileSync` block with `console.log("TURNKEY_API_PRIVATE_KEY=", privateKeyHex)` — then warn the human that the private key will land in shell history, scrollback, and any active screen share, and copy it into a secrets manager before closing the terminal.

#### Option B — Bring your own public key

If the human has already generated the key pair (e.g., in an HSM or existing secrets manager), skip the script above and confirm with them that the private key is already persisted in its final destination. Paste their public key (compressed hex — 33 bytes / 66 hex chars, prefixed with `02` or `03` followed by the 32-byte X coordinate) as `<AGENT_PUBLIC_KEY>` below. If their HSM or secrets manager produced an uncompressed `04` + X + Y key, see the root [`SKILL.md`](../../SKILL.md) "Generating API key pairs" section for the compression recipe — Turnkey rejects uncompressed keys when verifying stamped requests, even though the initial registration call accepts them.

#### Register the public key and assign the tag

```
POST /public/v1/submit/create_users
```

```json
{
  "users": [{
    "userName": "agent",
    "apiKeys": [{
      "apiKeyName": "agent-key-v1",
      "publicKey": "<AGENT_PUBLIC_KEY>",
      "curveType": "API_KEY_CURVE_P256"
    }],
    "authenticators": [],
    "oauthProviders": [],
    "userTags": ["<AGENT_TAG_ID>"]
  }]
}
```

Save the `userId`. Both `userTags` here and the policy conditions in Step 3 reference the tag by its **ID** (e.g. `approvers.any(user, user.tags.contains('<AGENT_TAG_ID>'))`). The `tagName` is purely a label on the tag object — it is not what `user.tags` holds at evaluation time. See the "Tag IDs vs. tag names" callout in the `managing-users` skill.

For an **observer agent** (read-only, no signing), create an `observer` tag the same way in Step 2a, then pass its ID as `"userTags": ["<OBSERVER_TAG_ID>"]` here. Observer agents need no ALLOW policies — default-deny gives them read-only access. See [references/agent-personas.md](references/agent-personas.md) for the complete observer template.

## Step 3: Create the ALLOW policy

This is the security-critical step. Non-root users have zero permissions by default (Turnkey is default-deny). The ALLOW policy defines exactly what the agent can do.

**Present the policy to the human and get explicit confirmation before creating it.**

Minimum viable ALLOW — agent can sign chain-aware transactions with one specific wallet. This deliberately excludes `sign_raw_payload` by default so chain-specific policy fields remain available:

```
POST /public/v1/submit/create_policy
```

```json
{
  "policyName": "agent-can-sign",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('<AGENT_TAG_ID>'))",
  "condition": "activity.type in ['ACTIVITY_TYPE_SIGN_TRANSACTION_V2', 'ACTIVITY_TYPE_ETH_SEND_TRANSACTION', 'ACTIVITY_TYPE_SOL_SEND_TRANSACTION'] && wallet.id == '<WALLET_ID>'",
  "notes": "Allow agent to sign chain-aware transactions with its designated wallet; raw payload signing is excluded"
}
```

If the human explicitly requires `sign_raw_payload`, create a separate narrowly-scoped ALLOW only after explaining that raw payload signing cannot be inspected with `eth.tx.*`, `solana.tx.*`, or `bitcoin.tx.*` policy conditions.

### Tightening the ALLOW (based on decision gates)

If the human chose destination restrictions, add an address allowlist:

```json
{
  "policyName": "agent-eth-allowlist",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('<AGENT_TAG_ID>'))",
  "condition": "wallet.id == '<WALLET_ID>' && eth.tx.to in ['<ADDR_1>', '<ADDR_2>']"
}
```

### Optional DENY guardrails

Default deny already blocks everything not explicitly ALLOWed. DENY policies add belt-and-suspenders protection against future policy drift — if someone later adds a broad ALLOW, the DENYs still block dangerous operations.

Spending cap:
```json
{
  "policyName": "deny-large-eth",
  "effect": "EFFECT_DENY",
  "condition": "eth.tx.value > 100000000000000000",
  "notes": "Block transfers above 0.1 ETH"
}
```

Block admin operations:
```json
{
  "policyName": "agent-deny-admin",
  "effect": "EFFECT_DENY",
  "condition": "activity.resource in ['USER', 'POLICY', 'ORGANIZATION'] || (activity.resource == 'WALLET' && activity.action in ['DELETE', 'EXPORT'])"
}
```

**After creating all policies, list the full active set and confirm with the human that it matches their intent.**

```
POST /public/v1/query/list_policies
```

```json
{
  "organizationId": "<ORG_ID>"
}
```

## Step 4: Verify with agent credentials

> **STOP — switch credentials now.** Steps 1-3 used root credentials. Step 4 must use the agent's key pair: the public key registered in Step 2b, and the matching private key from whichever destination you chose in Step 2b (the generated `agent.env` file, your secrets manager, or the key pair you brought in yourself). Re-initialize your SDK client (or point `TURNKEY_API_PUBLIC_KEY` / `TURNKEY_API_PRIVATE_KEY` at that destination) before continuing. If you continue using root credentials, this verification will pass regardless of whether the agent's policy is correct — defeating the purpose of the test.

Sign a test transaction using the chain-aware path selected in the decision gates. Do not verify provisioning with `sign_raw_payload` unless the human explicitly approved raw signing as an exception; raw payloads do not expose chain-specific transaction fields for policy evaluation.

```
POST /public/v1/submit/sign_transaction
```

```json
{
  "signWith": "<WALLET_ADDRESS>",
  "unsignedTransaction": "<UNSIGNED_TRANSACTION_HEX_OR_BASE64>",
  "type": "TRANSACTION_TYPE_ETHEREUM"
}
```

This request must be signed with the **agent's API key**, not your root key.

If it fails, use `get_policy_evaluations` to debug:

```
POST /public/v1/query/get_policy_evaluations
```

```json
{
  "organizationId": "<ORG_ID>",
  "activityId": "<FAILED_ACTIVITY_ID>"
}
```

Fix the policy — don't broaden it without revisiting the decision gates with the human.

## Step 5: Output agent credentials

After successful verification, assemble the agent's runtime environment. The public/private key pair already exists in the destination you chose in Step 2b — you are **not** generating or handling new key material here, only adding the org ID and wallet address alongside it.

- **Option A → file destination (default):** `agent.env` already contains `TURNKEY_API_PUBLIC_KEY` and `TURNKEY_API_PRIVATE_KEY` (written by the Step 2b script, `chmod 600`). Append the two lines below to that file.
- **Option A → secrets manager destination:** the key pair is already stored. Expose it to the agent runtime the way that secrets manager expects, and set `TURNKEY_ORGANIZATION_ID` + `SIGN_WITH` alongside it.
- **Option B (BYO):** the human already has the private key stored. Hand them the two additional values below.

The final environment the agent reads looks like:

```env
# AGENT CREDENTIALS (not root — these have constrained permissions)
TURNKEY_API_PUBLIC_KEY=<agent public key from Step 2b>
TURNKEY_API_PRIVATE_KEY=<agent private key from Step 2b — already persisted, do NOT re-print>
TURNKEY_ORGANIZATION_ID=<org ID>
SIGN_WITH=<wallet address from Step 1>
```

**These are the agent's credentials, not yours.** Your root credentials stay with you and must never be placed in the agent's environment. Do not re-print the private key in this step — it was already captured in Step 2b and should only be read from its persisted destination.

The agent is now operational with scoped permissions.

For the complete walkthrough with full request/response JSON, see [references/provisioning-walkthrough.md](references/provisioning-walkthrough.md).

For Worker and Observer persona templates, see [references/agent-personas.md](references/agent-personas.md).

## Troubleshooting

**Agent can't sign after provisioning**
Use `get_policy_evaluations` to see which policy blocked it. Most common cause: the ALLOW policy's `wallet.id` doesn't match the wallet created in Step 1.

**Agent has more access than intended**
List all policies and review. Check for broad ALLOWs that don't include wallet scope or condition restrictions. Default deny only helps if no ALLOW is too broad.

**Credentials confusion**
Steps 1-3 use root credentials. Step 4 uses agent credentials. Step 5 outputs agent credentials only. If the agent is performing root-level actions, the wrong credentials were used.

## Related Skills

- `managing-wallets` — full wallet reference (all 13 chains)
- `managing-users` — user creation and API key details
- `managing-policies` — policy language, anti-patterns, debugging
- `signing-transactions` — what the agent does after provisioning
- `managing-agent` — day-2 operations (key rotation, policy changes, revocation)
