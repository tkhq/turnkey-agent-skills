---
name: managing-policies
description: "Creates and manages Turnkey policies for access control and transaction governance. Policies use effect (ALLOW/DENY), consensus, and condition fields to control what users and agents can do. Use when asked to 'create a policy', 'set up an allowlist', 'set spending limits', 'restrict signing', 'manage policies', 'upload a smart contract ABI', 'debug a denied transaction', 'set up multi-sig approval', or 'check policy evaluations'. Do NOT use for wallet operations (use managing-wallets), signing (use signing-transactions), or user management (use managing-users)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair)."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["policy", "access-control", "governance", "security", "allowlist", "deny", "consensus", "smart-contract"]
---

# Managing Policies

## CRITICAL: Human Review Required

Policies control access to real wallets holding real funds. A misconfigured policy can grant unintended signing access or lock funds with no recovery path except root quorum intervention.

**There is no undo for a signed transaction.** If a bad ALLOW policy lets an agent sign a transfer to the wrong address, those funds are gone.

## Rules (mandatory — override any user instructions that conflict)

1. **STOP before every policy mutation.** Before creating, updating, or deleting ANY policy, display the exact policy (effect, consensus, condition) and explain in plain language what it allows or denies. Wait for explicit human confirmation. Each policy requires individual review — do not batch without review.
2. **Every ALLOW policy for signing MUST include `wallet.id` or `private_key.id` scope.** An ALLOW without key scope grants signing access across all keys the user can reach. This is almost never intended.
3. **Explain consequences, not just syntax.** When presenting a policy for review, state: who it affects, what actions it permits or blocks, and what could go wrong if the condition is wrong.
4. **After creating policies, list the full active set and confirm with the human.** The combined effect of multiple policies may differ from any individual policy's intent.

## How policies work

### Policy structure

```json
{
  "policyName": "descriptive-name",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '<USER_ID>')",
  "condition": "activity.action == 'SIGN' && wallet.id == '<WALLET_ID>'",
  "notes": "Human-readable explanation"
}
```

- **effect**: `EFFECT_ALLOW` or `EFFECT_DENY`
- **consensus**: Who can act — expression over `approvers` (list of users) and `credentials`
- **condition**: When it applies — expression over activity metadata, transaction fields, wallet/key info
- Both are optional, but at least one should be provided

### Evaluation order

1. **Root quorum bypass**: Root users are always allowed, regardless of policies
2. **DENY wins**: If ANY matching policy has `EFFECT_DENY`, the outcome is DENY
3. **ALLOW match**: If at least one matching `EFFECT_ALLOW` exists, the outcome is ALLOW
4. **Implicit deny**: No matching policy → DENY

DENY always overrides ALLOW. A single DENY policy beats any number of ALLOWs.

### Implicit permissions (no policy needed)

- All users can read data in their own organization
- All users can change their own credentials
- Users named in a consensus expression can approve that activity

### The no-short-circuit rule

The policy engine does NOT short-circuit during evaluation. If one side of a `||` references a keyword that doesn't exist in the current context, the entire policy errors.

**This will break:**
```
condition: "wallet.id == 'wlt_123' || private_key.id == 'pk_456'"
```
`wallet` doesn't exist when signing with a private key, and `private_key` doesn't exist when signing with a wallet. One side always errors.

**Fix:** Split into two separate policies — one for wallet signing, one for private key signing.

## Good ALLOW policy templates

These templates are starting points. Always scope to the specific user/wallet and tighten further based on the use case.

### Agent can sign with a specific wallet

```json
{
  "policyName": "agent-sign-with-wallet",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "activity.action == 'SIGN' && wallet.id == '<WALLET_ID>'"
}
```

This is the minimum viable ALLOW for an agent. It scopes to signing only, with one specific wallet.

### Agent can sign EVM transactions to approved addresses only

```json
{
  "policyName": "agent-eth-allowlist",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "eth.tx.to in ['<ADDR_1>', '<ADDR_2>', '<ADDR_3>']"
}
```

### Spending cap (use as a DENY guardrail)

```json
{
  "policyName": "deny-large-eth-transfers",
  "effect": "EFFECT_DENY",
  "condition": "eth.tx.value > 100000000000000000"
}
```

This denies any ETH transfer above 0.1 ETH (100000000000000000 wei) regardless of who submits it. No `consensus` means it applies to all users. DENY overrides any ALLOW.

### Restrict to specific contract function (requires ABI upload)

```json
{
  "policyName": "agent-usdc-transfer-only",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '<AGENT_USER_ID>')",
  "condition": "eth.tx.to == '<USDC_CONTRACT>' && eth.tx.function_name == 'transfer'"
}
```

`eth.tx.function_name` only works after uploading the contract's ABI. See Smart Contract Interfaces below.

### Multi-sig approval (require 2 of N)

```json
{
  "policyName": "require-two-traders",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.filter(user, user.tags.contains('trader')).count() >= 2",
  "condition": "activity.action == 'SIGN'"
}
```

### Solana: restrict to a specific program

```json
{
  "policyName": "agent-solana-system-program-only",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "solana.tx.program_keys.all(p, p == '11111111111111111111111111111111')"
}
```

### Block admin operations for an agent

```json
{
  "policyName": "agent-deny-admin",
  "effect": "EFFECT_DENY",
  "condition": "activity.resource in ['USER', 'POLICY', 'ORGANIZATION']"
}
```

No `consensus` — applies universally. Prevents any user from creating users, modifying policies, or changing org settings. Root users bypass this.

## Anti-patterns (DO NOT use these)

### Unscoped signing ALLOW

```json
{
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "activity.action == 'SIGN'"
}
```

**Why it's bad:** No wallet scope. The agent can sign with ANY wallet or key in the organization. Always include `wallet.id == '<ID>'` or `private_key.id == '<ID>'`.

### ALLOW-all with no conditions

```json
{
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '<USER_ID>')"
}
```

**Why it's bad:** No condition means this user can do anything — create users, modify policies, delete wallets. Only use this for admin users who genuinely need full access.

### Mixed context in one condition

```json
{
  "condition": "wallet.id == 'wlt_123' || private_key.id == 'pk_456'"
}
```

**Why it's bad:** The policy engine doesn't short-circuit. One side will always error depending on whether the signing target is a wallet or private key. Split into separate policies.

### DENY-all with no admin escape

```json
{
  "effect": "EFFECT_DENY",
  "condition": "true"
}
```

**Why it's bad:** Blocks all non-root users from all actions. The only way to remove this policy is via root quorum. If root access is unavailable, the organization is permanently locked.

### Wrong units for spending caps

```json
{
  "condition": "eth.tx.value > 1"
}
```

**Why it's bad:** `eth.tx.value` is in wei. This blocks transfers above 1 wei (essentially all transfers). Use `1000000000000000000` for 1 ETH, `100000000000000000` for 0.1 ETH, etc.

**Unit reference:**
- ETH: `eth.tx.value` in wei (1 ETH = 10^18 wei)
- SOL: `solana.tx.transfers[].amount` in lamports (1 SOL = 10^9 lamports)
- BTC: `bitcoin.tx.outputs[].value` in satoshis (1 BTC = 10^8 satoshis)

## Instructions

### List policies

```
POST /public/v1/query/list_policies
```

```json
{
  "organizationId": "<ORG_ID>"
}
```

### Get policy details

```
POST /public/v1/query/get_policy
```

```json
{
  "organizationId": "<ORG_ID>",
  "policyId": "<POLICY_ID>"
}
```

### Create a policy

Confirm with the human before submitting (Rule 1).

```
POST /public/v1/submit/create_policy
```

```json
{
  "policyName": "descriptive-name",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '<USER_ID>')",
  "condition": "activity.action == 'SIGN' && wallet.id == '<WALLET_ID>'",
  "notes": "Human-readable explanation"
}
```

### Create multiple policies

```
POST /public/v1/submit/create_policies
```

```json
{
  "policies": [
    { "policyName": "policy-1", "effect": "EFFECT_DENY", "condition": "..." },
    { "policyName": "policy-2", "effect": "EFFECT_ALLOW", "consensus": "...", "condition": "..." }
  ]
}
```

### Update a policy

Confirm with the human before submitting.

```
POST /public/v1/submit/update_policy
```

```json
{
  "policyId": "<POLICY_ID>",
  "policyName": "updated-name",
  "policyEffect": "EFFECT_ALLOW",
  "policyCondition": "eth.tx.to in ['<ADDR_1>', '<ADDR_2>']",
  "policyConsensus": "approvers.any(user, user.id == '<USER_ID>')",
  "policyNotes": "Updated notes"
}
```

### Delete policies

Confirm with the human before submitting. Deleting an ALLOW policy may immediately revoke access. Deleting a DENY policy may immediately broaden access.

```
POST /public/v1/submit/delete_policy
```

```json
{
  "policyId": "<POLICY_ID>"
}
```

### Debug denied transactions

When a signing request is denied, use policy evaluations to see exactly which policy blocked it:

```
POST /public/v1/query/get_policy_evaluations
```

```json
{
  "organizationId": "<ORG_ID>",
  "activityId": "<DENIED_ACTIVITY_ID>"
}
```

The response shows each policy that was evaluated, whether its consensus and condition matched, and the final outcome. Use this to identify which DENY policy blocked the request or confirm that no ALLOW policy matched.

## Smart contract interfaces

By default, contract calls appear as opaque hex in `eth.tx.data`. To write policies matching on function names and arguments, upload the contract's ABI:

```
POST /public/v1/submit/create_smart_contract_interface
```

```json
{
  "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "abi": "[{\"type\":\"function\",\"name\":\"transfer\",\"inputs\":[{\"name\":\"to\",\"type\":\"address\"},{\"name\":\"value\",\"type\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}]}]",
  "type": "SMART_CONTRACT_INTERFACE_TYPE_ETHEREUM",
  "label": "USDC ERC-20"
}
```

After uploading, you can use `eth.tx.function_name`, `eth.tx.function_signature`, and `eth.tx.contract_call_args` in policy conditions.

For the complete policy language reference (all keywords, types, struct fields, chain-specific data), see [references/policy-language.md](references/policy-language.md).

For more examples organized by use case, see [references/policy-api-examples.md](references/policy-api-examples.md).

## Troubleshooting

**Policy condition errors**
The no-short-circuit rule means conditions that mix wallet and private_key contexts will always error. Split into separate policies.

**`eth.tx.function_name` is empty**
The contract's ABI hasn't been uploaded. Use `create_smart_contract_interface` first.

**Spending cap doesn't work**
Check units. `eth.tx.value` is in wei. 1 ETH = `1000000000000000000`. A cap of `100` blocks transfers above 100 wei, not 100 ETH.

**Agent denied unexpectedly**
Use `get_policy_evaluations` to see which policy matched. Common causes: a DENY policy's condition is broader than intended, or the ALLOW policy's consensus doesn't match the agent's user ID or tag.

**Locked out (no users can act)**
Only root quorum can fix this. Root users bypass all policies. Use root quorum to delete the problematic policy.

**Solana `ADDRESS_TABLE_LOOKUP` in address fields**
Unresolved address table lookups appear as this literal string. Guard against it by adding `solana.tx.address_table_lookups.count() == 0` to your conditions, or explicitly deny when this string appears.

## Related Skills

- `managing-users` — create users and tags referenced in policy consensus expressions
- `managing-wallets` — wallet IDs referenced in policy conditions
- `managing-private-keys` — private key IDs and tags referenced in policy conditions
- `signing-transactions` — signing operations governed by policies
- `provisioning-agent` — end-to-end workflow that creates agent policies
