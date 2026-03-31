---
name: agentic-wallet-workflow
description: "Gives an AI agent scoped wallet access on Turnkey. Covers parent-org agent onboarding, wallet creation, least-privilege policy design, agent key rotation, access revocation, debugging denied agent transactions, and monitoring agent wallet activity for anomalies. Includes Worker and Observer persona guidance with human-chosen constraints. Use when asked to 'set up agent wallet', 'scoped wallet for agent', 'provision agent credentials', 'my agent transaction was denied, how do I debug it', 'monitor my agent wallet activity for anomalies', 'rotate agent key', 'revoke agent access', 'worker agent', 'observer agent', or 'agent persona'. Do NOT use for manual wallet CRUD (use managing-wallets-api), treasury or hot/cold wallet operations, payment operations, or standalone private keys (use managing-private-keys-api)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). Start with getting-started-workflow for credential setup."
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

Give an AI agent a non-root user, a wallet, and the narrowest set of permissions it needs. The default path keeps the agent in the parent org for simplicity; sub-org isolation is an advanced option.

## Prerequisites

Requires a parent `organizationId` and a locally generated P-256 key pair for the agent. Start with `getting-started-workflow` if the caller still needs to verify credentials.
### Stamping (X-Stamp header)

Every request must include an `X-Stamp` header. Build it with standard CLI tools:

1. **Convert hex private key to PEM** (one-time): `echo "30310201010420${TURNKEY_API_PRIVATE_KEY}a00a06082a8648ce3d030107" | xxd -r -p | openssl ec -inform der -outform pem -out /tmp/tk_stamp.pem 2>/dev/null`
2. **Sign the request body**: `SIG_HEX=$(echo -n "$BODY" | openssl dgst -sha256 -sign /tmp/tk_stamp.pem | xxd -p -c 256)`
3. **Build stamp JSON**: `{"publicKey":"$TURNKEY_API_PUBLIC_KEY","signature":"$SIG_HEX","scheme":"SIGNATURE_SCHEME_TK_API_P256"}`
4. **Base64URL-encode and send**: `STAMP=$(echo -n "$STAMP_JSON" | base64 | tr '+/' '-_' | tr -d '=')` then add `-H "X-Stamp: $STAMP"` to curl.

Sign the **exact** body bytes. The public key must match a registered API key.

## Making Requests

Use direct HTTPS requests to `https://api.turnkey.com`.

- Query endpoints use `POST /public/v1/query/...` with `organizationId` in the request body.
- Submit endpoints use `POST /public/v1/submit/...` and return activities.
- For policy creation, always show the human the exact policy before submitting it.

## Phase 1: Onboarding

Before making API calls, answer the decision gates below with the human.

### Decision Gates

**1. Isolation model**
- Parent org (recommended default): simplest setup for MVP agents and the preferred default here.
- Sub-org: advanced isolation option when the team explicitly wants separate namespace boundaries.

**2. Wallet type**
- HD wallet (recommended): Derives unlimited addresses from a single seed. Supports multiple chains from one wallet.
- Standalone key: Single chain, single purpose. Use only when the agent needs exactly one key for one chain.

**3. Chain selection**
- Determines which wallet accounts to derive (Ethereum, Solana, Bitcoin, etc.).
- Affects policy conditions: EVM policies use `eth.tx.*` fields, Solana uses `solana.tx.*`, Bitcoin uses `bitcoin.tx.*`.

**4. Agent persona**
- Worker (most common): Signs transactions. Cannot mutate guardrails or expand authority. Use for trading bots, payment processors, DeFi agents.
- Observer: Read-only. Monitors balances, activities, and policies. Query access is usually enough.

See [references/agent-personas.md](references/agent-personas.md) for guided Worker and Observer templates.

### Default Onboarding Flow (Parent Org Path)

Each step references the primitive skill it comes from.

**Step 1: Create the wallet**

Full wallet reference: `managing-wallets-api`

```
POST https://api.turnkey.com/public/v1/submit/create_wallet
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

Save the `walletId` and any derived addresses from the activity result.

**Step 2: Create the agent user (non-root)**

The agent must not be a root user. Root users bypass all policies, which defeats the purpose of scoped access.

Full user management reference: `managing-users-api`

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

Use a unique user name and keep the agent non-root.

**Step 3: Choose the constraint set before writing any policy**

Before you create a Worker policy, ask the human to lock these decisions:

- which wallet or address can sign
- which destinations are allowed
- whether there are spend caps
- whether contract calls must be restricted by contract address or function name
- whether raw payload signing is allowed or only chain-aware transaction signing

Use [references/agent-personas.md](references/agent-personas.md) to turn those choices into a Worker or Observer policy set.

Full policy reference: `managing-policies-api`

**Step 4: Verify with a test signature**

Confirm the agent can actually sign by attempting a test payload with the agent's credentials.

Full signing reference: `signing-transactions-api`

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

Sign this request with the agent's API key. If it fails, inspect policy evaluations before broadening access.

**Step 5: Output credentials**

Hand the following to the admin for injection into the agent's runtime environment:

- Agent API public key (hex)
- Agent API private key (hex, generated locally in Step 2)
- Organization ID (the parent org by default)
- Wallet ID and wallet address

The admin provisions these as environment variables (`TURNKEY_API_PUBLIC_KEY`, `TURNKEY_API_PRIVATE_KEY`, `TURNKEY_ORGANIZATION_ID`, `SIGN_WITH`).

## Phase 2: Management

Day-2 operations organized by what the admin or agent needs to do.

### Add a new chain to the agent's wallet

Full wallet reference: `managing-wallets-api`

Derive new accounts on the existing wallet, then update policies if the new chain needs chain-specific conditions.

```
POST https://api.turnkey.com/public/v1/submit/create_wallet_accounts
```

Add Solana example: `{"walletId": "<WALLET_ID>", "accounts": [{"curve": "CURVE_ED25519", "pathFormat": "PATH_FORMAT_BIP32", "path": "m/44'/501'/0'/0'", "addressFormat": "ADDRESS_FORMAT_SOLANA"}]}`

### Rotate the agent's API key

Full user management reference: `managing-users-api`

1. Generate a new P-256 key pair locally.
2. Register the new public key: `POST /public/v1/submit/create_api_keys` with the agent's userId.
3. Verify the new key works: `POST /public/v1/query/whoami` signed with the new key.
4. Delete the old key: `POST /public/v1/submit/delete_api_keys` signed with the new key.
5. Update the agent's runtime with new credentials.

### Change agent permissions

Full policy reference: `managing-policies-api`

List current policies with `POST /public/v1/query/list_policies`, then update or replace as needed with `POST /public/v1/submit/update_policy`. Re-run the human decision gates before widening any Worker policy.

### Revoke agent access immediately

Full user management reference: `managing-users-api`

Delete the agent's API keys to cut access instantly: `POST /public/v1/submit/delete_api_keys`. The agent can no longer authenticate. Optionally delete the agent user and policies for cleanup.

### Debug a denied transaction

Full policy reference: `managing-policies-api`

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

Full activity monitoring reference: `monitoring-activities-api`

- List agent activities: `POST /public/v1/query/list_activities` filtered by the parent `organizationId`
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
- Use the parent org as the default path unless the human explicitly wants sub-org isolation.
- The agent must be a non-root user. Root users bypass all policies.
- For Worker agents, choose wallet scope, destinations, spend caps, and contract/function limits before creating policies.
- Observer agents usually need no extra ALLOW policies. Add an observer-specific DENY only when the org already has broader shared permissions.
- Always verify the agent can sign (Step 5) before handing off credentials.
- **After all policies are created, list the full policy set and confirm with the human that it matches their intent before proceeding to credential handoff.**
- To revoke agent access, delete API keys first (instant), then clean up policies and users.
- Prefer user-specific consensus expressions over broad shared tags when you are scoping a single agent.
- `eth.tx.value` is in wei, `solana.tx.transfers[].amount` is in lamports, `bitcoin.tx.outputs[].value` is in satoshis.

## Related Skills

- Full organization reference: `managing-organizations-api`
- Full wallet reference: `managing-wallets-api`
- Full user management reference: `managing-users-api`
- Full policy reference: `managing-policies-api`
- Full activity monitoring reference: `monitoring-activities-api`
- Full signing reference: `signing-transactions-api`
