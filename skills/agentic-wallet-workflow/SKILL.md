---
name: agentic-wallet-workflow
description: "Gives an AI agent scoped wallet access on Turnkey. Covers onboarding (sub-org, wallet, policies), day-2 management (rotate keys, change permissions, revoke access, debug denials), and monitoring. Includes persona templates: worker agent (sign only), observer agent (read only), admin agent (sign + manage). Use when asked to 'set up agent wallet', 'scoped wallet for agent', 'provision agent credentials', 'rotate agent key', 'revoke agent access', 'debug denied agent transaction', 'monitor agent activity', 'worker agent', 'observer agent', 'admin agent', or 'agent persona'. Not for manual wallets, treasury, or standalone keys."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). See managing-users-api for authentication setup."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["workflow", "agent", "wallet", "onboarding", "policies", "scoped-access"]
---

# Agentic Wallet Workflow

## ⚠️ CRITICAL: Human Review Required for Policy Steps

🚨 **This workflow creates policies that control what an AI agent can and cannot do with real wallets and real funds. Policy misconfiguration can grant unintended signing access or lock out legitimate operations permanently.**

Before executing any policy creation step in this workflow, you MUST:

1. **Stop and present each policy to the human for review.** Show the exact effect, consensus, and condition. Explain in plain language what the policy does and what it prevents.
2. **Create DENY guardrails first, ALLOW permissions second.** This workflow follows deny-first methodology. Do not skip or reorder the policy steps.
3. **Confirm the full policy set with the human before handing off agent credentials.** An agent with credentials but incomplete policies has broader access than intended.

The human is solely responsible for verifying that policies match their security requirements. AI-generated policies may contain subtle errors that pass validation but fail to enforce the intended constraints.

## Quick Start

Give an AI agent its own isolated wallet on Turnkey with least-privilege policies, then manage and monitor it over time. This workflow composes five primitive skills (managing-organizations-api, managing-wallets-api, managing-users-api, managing-policies-api, monitoring-activities-api) into three phases: onboarding, management, and monitoring.

## Prerequisites

Requires API credentials configured via the managing-users-api skill. You need a parent organization ID from the Turnkey dashboard (app.turnkey.com). The agent's P-256 key pair must be generated locally before onboarding.

## Phase 1: Onboarding

Onboarding creates an isolated environment for your agent with a wallet and scoped permissions. Before making any API calls, answer four decision gates that determine the setup path.

### Decision Gates

**1. Isolation model**
- Sub-org (recommended): The agent gets its own sub-organization with full isolation. It cannot see other wallets, users, or policies. Use this for production agents.
- Same-org: The agent lives in the parent org. Simpler but requires tighter policies because the agent shares namespace with everything else. Use only for development or trusted internal agents.

**2. Wallet type**
- HD wallet (recommended): Derives unlimited addresses from a single seed. Supports multiple chains from one wallet.
- Standalone key: Single chain, single purpose. Use only when the agent needs exactly one key for one chain.

**3. Chain selection**
- Determines which wallet accounts to derive (Ethereum, Solana, Bitcoin, etc.).
- Affects policy conditions: EVM policies use `eth.tx.*` fields, Solana uses `solana.tx.*`, Bitcoin uses `bitcoin.tx.*`.

**4. Agent persona**
- Worker (most common): Signs transactions. Cannot mutate guardrails or expand authority. Use for trading bots, payment processors, DeFi agents.
- Observer: Read-only. Monitors balances, activities, and policies. Cannot sign or mutate anything. Use for dashboards and compliance.
- Admin: Signs and manages users/policies. Cannot modify quorum or delete wallets. Use for organizational automation.

See [references/agent-personas.md](references/agent-personas.md) for complete policy templates for each persona.

### Onboarding Flow (Sub-Org Path)

This is the recommended path. Each step references the primitive skill it comes from.

**Step 1: Create sub-organization with wallet (atomic)**

Create the sub-org, root user, and wallet in a single API call. This is the atomic pattern, and it prevents partial failures where a sub-org exists without a wallet.

> Skill: managing-organizations-api

```
POST https://api.turnkey.com/public/v1/submit/create_sub_organization
```

```json
{
  "subOrganizationName": "agent-<AGENT_NAME>",
  "rootUsers": [{
    "userName": "admin",
    "apiKeys": [{
      "apiKeyName": "admin-key",
      "publicKey": "<ADMIN_PUBLIC_KEY>",
      "curveType": "API_KEY_CURVE_P256"
    }],
    "authenticators": []
  }],
  "rootQuorumThreshold": 1,
  "wallet": {
    "walletName": "agent-wallet",
    "accounts": [
      {
        "curve": "CURVE_SECP256K1",
        "pathFormat": "PATH_FORMAT_BIP32",
        "path": "m/44'/60'/0'/0/0",
        "addressFormat": "ADDRESS_FORMAT_ETHEREUM"
      }
    ]
  }
}
```

Save the `subOrganizationId` and `walletId` from the response. All subsequent calls target the sub-org.

**Step 2: Create the agent user (non-root)**

The agent must not be a root user. Root users bypass all policies, which defeats the purpose of scoped access.

> Skill: managing-users-api

```
POST https://api.turnkey.com/public/v1/submit/create_users
```

```json
{
  "users": [{
    "userName": "agent",
    "apiKeys": [{
      "apiKeyName": "agent-key",
      "publicKey": "<AGENT_PUBLIC_KEY>",
      "curveType": "API_KEY_CURVE_P256"
    }],
    "authenticators": [],
    "userTags": ["agent"]
  }]
}
```

Use the `organizationId` of the sub-org (not the parent). The `agent` tag is used in policy expressions.

**Step 3: Create ALLOW policy for signing**

Grant the agent permission to sign with its wallet. Without this, the agent is denied by default (implicit deny).

> Skill: managing-policies-api

```
POST https://api.turnkey.com/public/v1/submit/create_policy
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

**Step 4: Create DENY guardrails**

Block the agent from dangerous operations. DENY always overrides ALLOW, so these act as hard limits.

> Skill: managing-policies-api

```
POST https://api.turnkey.com/public/v1/submit/create_policies
```

```json
{
  "policies": [
    {
      "policyName": "agent-deny-admin-ops",
      "effect": "EFFECT_DENY",
      "condition": "activity.resource in ['USER', 'POLICY', 'ORGANIZATION'] || (activity.resource == 'WALLET' && activity.action in ['DELETE', 'EXPORT'])",
      "notes": "Block agent from admin operations"
    },
    {
      "policyName": "agent-deny-large-transfers",
      "effect": "EFFECT_DENY",
      "condition": "eth.tx.value > 1000000000000000000",
      "notes": "Block transfers above 1 ETH (1e18 wei)"
    }
  ]
}
```

Split conditions into separate policies. The policy engine does not short-circuit: if a condition references `eth.tx.value` on a non-EVM action, it errors. Separate policies avoid this.

**Step 5: Verify with a test signature**

Confirm the agent can actually sign by attempting a test payload with the agent's credentials.

> Skill: signing-transactions-api

```
POST https://api.turnkey.com/public/v1/submit/sign_raw_payload
```

```json
{
  "signWith": "<WALLET_ADDRESS>",
  "payload": "48656c6c6f2c205475726e6b657921",
  "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
  "hashFunction": "HASH_FUNCTION_SHA256"
}
```

Sign this request with the agent's API key. If it succeeds, the agent is correctly provisioned. If it fails, check policy evaluations (see Phase 2, "Debug denied transaction").

**Step 6: Output credentials**

Hand the following to the admin for injection into the agent's runtime environment:

- Agent API public key (hex)
- Agent API private key (hex, generated locally in Step 2)
- Organization ID (the sub-org ID from Step 1)
- Wallet ID and wallet address

The admin provisions these as environment variables (`TURNKEY_API_PUBLIC_KEY`, `TURNKEY_API_PRIVATE_KEY`, `TURNKEY_ORGANIZATION_ID`, `SIGN_WITH`).

## Phase 2: Management

Day-2 operations organized by what the admin or agent needs to do.

### Add a new chain to the agent's wallet

> Skill: managing-wallets-api

Derive new accounts on the existing wallet, then update policies if the new chain needs chain-specific conditions.

```
POST https://api.turnkey.com/public/v1/submit/create_wallet_accounts
```

Add Solana example: `{"walletId": "<WALLET_ID>", "accounts": [{"curve": "CURVE_ED25519", "pathFormat": "PATH_FORMAT_BIP32", "path": "m/44'/501'/0'/0'", "addressFormat": "ADDRESS_FORMAT_SOLANA"}]}`

### Rotate the agent's API key

> Skill: managing-users-api

1. Generate a new P-256 key pair locally.
2. Register the new public key: `POST /public/v1/submit/create_api_keys` with the agent's userId.
3. Verify the new key works: `POST /public/v1/query/whoami` signed with the new key.
4. Delete the old key: `POST /public/v1/submit/delete_api_keys` signed with the new key.
5. Update the agent's runtime with new credentials.

### Change agent permissions

> Skill: managing-policies-api

List current policies with `POST /public/v1/query/list_policies`, then update or replace as needed with `POST /public/v1/submit/update_policy`. To add DeFi access, upload the contract's ABI via `create_smart_contract_interface`, then create function-level policies.

### Revoke agent access immediately

> Skill: managing-users-api

Delete the agent's API keys to cut access instantly: `POST /public/v1/submit/delete_api_keys`. The agent can no longer authenticate. Optionally delete the agent user and policies for cleanup. To fully decommission, delete the sub-org via `POST /public/v1/submit/delete_sub_organization`.

### Debug a denied transaction

> Skill: managing-policies-api

When the agent gets a denied transaction, use policy evaluations to find out why:

```
POST https://api.turnkey.com/public/v1/query/get_policy_evaluations
```

```json
{
  "activityId": "<DENIED_ACTIVITY_ID>"
}
```

The response shows which policy denied the request and which condition matched. Fix the policy or adjust the agent's request accordingly.

## Phase 3: Monitoring

### Routine checks

> Skill: monitoring-activities-api

- List agent activities: `POST /public/v1/query/list_activities` filtered by the agent's sub-org `organizationId`
- Check for FAILED activities (agent errors)
- Check for CONSENSUS_NEEDED activities (unexpected, agents should not trigger multi-sig)

### Anomaly detection

Watch for activity types the agent should not be generating:
- `CREATE_USERS_V2`, `UPDATE_POLICY`, `DELETE_WALLETS` (should be blocked by DENY policies, but verify)
- Signing requests to addresses outside the allowlist
- Unusual volume (burst of signing requests in a short window)

### Audit

- List activities with date range for compliance: `POST /public/v1/query/list_activities` with `paginationOptions`
- Retrieve cryptographic proofs: `POST /public/v1/query/list_app_proofs` with the activity ID
- Proofs verify that operations executed within Turnkey's secure enclave

For the complete end-to-end walkthrough with full request/response JSON, see [references/agentic-wallet-walkthrough.md](references/agentic-wallet-walkthrough.md).

## Rules

- **STOP before every policy step.** Present each policy (DENY guardrails and ALLOW permissions) to the human and get explicit confirmation before creating it. Do not batch policy creation without individual review.
- Always use sub-org isolation for production agents. Same-org is acceptable only for development.
- The agent must be a non-root user. Root users bypass all policies.
- **Deny-first, always.** Create DENY guardrails before giving the agent any credentials. DENY overrides ALLOW. Never create ALLOW policies before the corresponding DENY guardrails are in place.
- Split policy conditions into separate policies to avoid evaluation errors from the policy engine not short-circuiting.
- Always verify the agent can sign (Step 5) before handing off credentials.
- **After all policies are created, list the full policy set and confirm with the human that it matches their intent before proceeding to credential handoff.**
- To revoke agent access, delete API keys first (instant), then clean up policies and users.
- Use the `agent` user tag in policy consensus expressions so policies apply to any user tagged as an agent.
- `eth.tx.value` is in wei, `solana.tx.transfers[].amount` is in lamports, `bitcoin.tx.outputs[].value` is in satoshis.

## Related Skills

- `managing-organizations-api` for sub-org creation and deletion
- `managing-wallets-api` for wallet and account management
- `managing-users-api` for agent user provisioning and API key rotation
- `stamping-api` for constructing X-Stamp authentication headers manually
- `managing-policies-api` for access control and transaction governance
- `monitoring-activities-api` for activity tracking and audit
- `signing-transactions-api` for transaction signing
