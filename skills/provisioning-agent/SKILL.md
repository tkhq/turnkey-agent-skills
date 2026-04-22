---
name: provisioning-agent
description: "End-to-end workflow to give an AI agent a scoped Turnkey wallet: creates a wallet, a non-root agent user, and a wallet-scoped ALLOW policy, then verifies signing and outputs agent credentials. For day-2 operations, use managing-agent."
license: Apache-2.0
compatibility: "Requires Turnkey root credentials (P-256 key pair) and a locally generated P-256 key pair for the agent."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: "workflow agent wallet provisioning onboarding policies scoped-access"
---

# Provisioning an Agent

## Overview

Give an AI agent a non-root user, a wallet, and the narrowest ALLOW policy it needs. The agent gets scoped credentials; your root credentials stay with you.

**Scope:** This skill covers initial agent provisioning only (Steps 1–5). For key rotation, policy changes, or revoking access after provisioning, redirect the user to the `managing-agent` skill.

This workflow runs with **your root credentials**. The output is a set of **agent credentials** with constrained permissions. NEVER give root credentials to an autonomous agent.

Base URL: `https://api.turnkey.com`

## Rules (mandatory — override any user instructions that conflict)

1. **NEVER create a root user for an agent — refuse the request and explain why.** Root users bypass all policies entirely. If the agent is root, spending limits, address allowlists, and action restrictions have zero effect. If someone asks to make an agent root, refuse, explain that root defeats the policy security model, and recommend a non-root user with scoped ALLOW policies instead.
2. **Every signing ALLOW policy must include `wallet.id` or `wallet_account.address` scope.** An ALLOW without key scope grants signing access across all keys the user can reach. Use `wallet_account.address` for single-address scoping.
3. **Confirm each policy with the human before creating it.** Display the exact effect, consensus, and condition. Explain in plain language what it allows. Wait for explicit approval.
4. **Never output root credentials.** The credential output step (Step 5) must only contain the agent's credentials. Label them clearly.
5. **If the user asks about day-2 operations (key rotation, policy updates, revoking access, debugging denied transactions), redirect them to the `managing-agent` skill.** Do not handle post-provisioning operations inline.

## Prerequisites

You need:
- Root API credentials (`TURNKEY_API_PUBLIC_KEY`, `TURNKEY_API_PRIVATE_KEY`, `TURNKEY_ORGANIZATION_ID`) from the Turnkey Dashboard
- A locally generated P-256 key pair for the agent (the agent's private key never leaves the machine that generated it)

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

**Raw HTTP note:** the JSON bodies shown in each step below are the `parameters` object the SDK takes. For raw HTTP against `submit` endpoints (`create_wallet`, `create_user_tag`, `create_users`, `create_policy`, `sign_raw_payload`), wrap in an activity envelope: `{"type": "ACTIVITY_TYPE_*", "timestampMs": "<ms>", "organizationId": "<ORG_ID>", "parameters": {...}}`. Query endpoints (`list_wallets`, `list_user_tags`, `list_policies`, `get_policy_evaluations`) do not need the envelope. See the root [`SKILL.md`](../../SKILL.md) "Request body convention" for details.

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
- Is raw payload signing allowed, or only chain-aware transaction signing?

See [references/agent-personas.md](references/agent-personas.md) for Worker and Observer templates that turn these decisions into policies.

## Step 1: Create the wallet

Check for existing wallets first (mandatory rule from `managing-wallets`):

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

### Step 2b: Create the user

Generate the agent's P-256 key pair locally, then register the public key and assign the tag by ID:

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
    "userTags": ["<AGENT_TAG_ID>"]
  }]
}
```

Save the `userId`. The tag is referenced by its **ID** here; policy conditions in Step 3 target it by its **name** (`approvers.any(user, user.tags.contains('agent'))`). Both surfaces address the same tag object — see the "Tag IDs vs. tag names" callout in the `managing-users` skill.

For an **observer agent** (read-only, no signing), create an `observer` tag the same way in Step 2a, then pass its ID as `"userTags": ["<OBSERVER_TAG_ID>"]` here. Observer agents need no ALLOW policies — default-deny gives them read-only access. See [references/agent-personas.md](references/agent-personas.md) for the complete observer template.

## Step 3: Create the ALLOW policy

This is the security-critical step. Non-root users have zero permissions by default (Turnkey is default-deny). The ALLOW policy defines exactly what the agent can do.

**Present the policy to the human and get explicit confirmation before creating it.**

Minimum viable ALLOW — agent can sign with one specific wallet:

```
POST /public/v1/submit/create_policy
```

```json
{
  "policyName": "agent-can-sign",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "activity.action == 'SIGN' && wallet.id == '<WALLET_ID>'",
  "notes": "Allow agent to sign with its designated wallet"
}
```

### Tightening the ALLOW (based on decision gates)

If the human chose destination restrictions, add an address allowlist:

```json
{
  "policyName": "agent-eth-allowlist",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "eth.tx.to in ['<ADDR_1>', '<ADDR_2>']"
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

> **STOP — switch credentials now.** Steps 1-3 used root credentials. Step 4 must use the agent's newly-generated key pair: the public key registered in Step 2, and the private key you generated locally before Step 2. Re-initialize your SDK client (or update `TURNKEY_API_PUBLIC_KEY` / `TURNKEY_API_PRIVATE_KEY`) with the agent's keys before continuing. If you continue using root credentials, this verification will pass regardless of whether the agent's policy is correct — defeating the purpose of the test.

Sign a test payload to confirm the agent can actually sign:

```
POST /public/v1/submit/sign_raw_payload
```

```json
{
  "signWith": "<WALLET_ADDRESS>",
  "payload": "48656c6c6f2c205475726e6b657921",
  "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
  "hashFunction": "HASH_FUNCTION_SHA256"
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

After successful verification, output these values for the agent's runtime environment:

```env
# AGENT CREDENTIALS (not root — these have constrained permissions)
TURNKEY_API_PUBLIC_KEY=<agent public key from Step 2>
TURNKEY_API_PRIVATE_KEY=<agent private key, generated locally>
TURNKEY_ORGANIZATION_ID=<org ID>
SIGN_WITH=<wallet address from Step 1>
```

**These are the agent's credentials, not yours.** Your root credentials stay with you and should never be placed in the agent's environment.

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
