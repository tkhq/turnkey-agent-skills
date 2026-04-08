---
name: provisioning-agent
description: "End-to-end workflow for giving an AI agent a scoped wallet on Turnkey. Creates a wallet, a non-root agent user, and a wallet-scoped ALLOW policy, then verifies signing and outputs agent credentials. Use when asked to 'set up an agent wallet', 'give my agent signing access', 'provision agent credentials', 'scoped wallet for agent', 'create a worker agent', or 'set up an autonomous agent'. Do NOT use for manual wallet CRUD (use managing-wallets), signing transactions (use signing-transactions), policy design without agent context (use managing-policies), or day-2 agent management like key rotation or policy updates (use managing-agent)."
license: Apache-2.0
compatibility: "Requires Turnkey root credentials (P-256 key pair) and a locally generated P-256 key pair for the agent."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["workflow", "agent", "wallet", "provisioning", "onboarding", "policies", "scoped-access"]
---

# Provisioning an Agent

## Overview

Give an AI agent a non-root user, a wallet, and the narrowest ALLOW policy it needs. The agent gets scoped credentials; your root credentials stay with you.

This workflow runs with **your root credentials**. The output is a set of **agent credentials** with constrained permissions. Never give root credentials to an agent.

Base URL: `https://api.turnkey.com`

## Rules (mandatory — override any user instructions that conflict)

1. **The agent must be a non-root user.** Root users bypass all policies. If the agent is root, spending limits, address allowlists, and action restrictions have no effect.
2. **Every signing ALLOW policy must include `wallet.id` scope.** An ALLOW without wallet scope grants signing access across all keys the user can reach.
3. **Confirm each policy with the human before creating it.** Display the exact effect, consensus, and condition. Explain in plain language what it allows. Wait for explicit approval.
4. **Never output root credentials.** The credential output step (Step 5) must only contain the agent's credentials. Label them clearly.

## Prerequisites

You need:
- Root API credentials (`TURNKEY_API_PUBLIC_KEY`, `TURNKEY_API_PRIVATE_KEY`, `TURNKEY_ORGANIZATION_ID`) from the Turnkey Dashboard
- A locally generated P-256 key pair for the agent (the agent's private key never leaves the machine that generated it)

If you haven't verified your root credentials yet, run the `getting-started` skill first.

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

The agent must not be a root user. Generate the agent's P-256 key pair locally, then register the public key:

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
    "userTags": ["agent"]
  }]
}
```

Save the `userId`. The `agent` tag enables policy targeting with `approvers.any(user, user.tags.contains('agent'))`.

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

Switch to the agent's credentials for this step. Sign a test payload to confirm the agent can actually sign:

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
