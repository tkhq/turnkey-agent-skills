---
name: managing-policies-api
description: "Creates and manages Turnkey policies for access control and transaction governance via HTTP API. Policies use effect (ALLOW/DENY), consensus, and condition fields. Covers spending limits, allowlists, multi-sig, smart contract interfaces (ABI upload), and policy evaluation debugging. Use when asked to 'create a policy', 'set up an allowlist', 'manage policies', 'upload a smart contract ABI', 'debug a denied transaction', or 'set up multi-sig approval'. Do NOT use for wallets (use managing-wallets-api), signing (use signing-transactions-api), or users (use managing-users-api)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). See managing-users-api for authentication setup."
metadata:
  version: "2.0.0"
  author: turnkey
  tags: ["policy", "api", "access-control", "governance", "security", "allowlist", "deny", "consensus", "smart-contract", "abi", "policy-evaluation", "debug"]
---

## Quick Start

Use the Turnkey API to create and manage policies that govern what actions users and agents can perform. Every policy has an `effect` (ALLOW or DENY), an optional `consensus` (who must approve), and an optional `condition` (when it applies).

Base URL: `https://api.turnkey.com`

Request bodies below show the `parameters` object for clarity. The full API envelope wraps these as: `{"type": "ACTIVITY_TYPE_...", "timestampMs": "<ms>", "organizationId": "<ORG_ID>", "parameters": { ... }}`. Query endpoints require `organizationId` in the request body.

## Prerequisites

Requires API keys configured (see managing-users-api skill).

## How Policies Work

### Policy Structure

```json
{
  "policyName": "descriptive-name",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '<USER_ID>')",
  "condition": "eth.tx.to == '<ADDRESS>'",
  "notes": "Human-readable explanation"
}
```

- **effect**: `EFFECT_ALLOW` or `EFFECT_DENY`
- **consensus**: Expression over `approvers` and `credentials`. Determines WHO can act.
- **condition**: Expression over activity metadata, transaction data, wallet info. Determines WHEN it applies.
- Both are optional but at least one should be provided.

### Evaluation Order

1. Root quorum users bypass all policies (always allowed)
2. If ANY matching policy has `EFFECT_DENY`, the outcome is DENY
3. If at least one matching policy has `EFFECT_ALLOW`, the outcome is ALLOW
4. If no policy matches, the outcome is DENY (implicit deny)

DENY always wins over ALLOW.

### Implicit Permissions

- All users can read (GET) data in their own organization
- All users can change their own credentials
- All users can approve activities they were included in via consensus

## Common Policy Patterns

| Goal | Effect | Consensus | Condition |
|------|--------|-----------|-----------|
| User can sign with a wallet | ALLOW | `approvers.any(user, user.id == '<ID>')` | `activity.action == 'SIGN' && wallet.id == '<WALLET_ID>'` |
| Address allowlist (ETH) | ALLOW | (who can send) | `eth.tx.to in ['<ADDR1>', '<ADDR2>']` |
| Block large transfers | DENY | (none, applies to all) | `eth.tx.value > 1000000000000000000` |
| Multi-sig approval | ALLOW | `approvers.filter(user, user.tags.contains('<TAG>')).count() >= 2` | (what action) |
| Testnet only | ALLOW | (who) | `eth.tx.chain_id == 11155111` |
| Restrict to specific program (SOL) | ALLOW | (who) | `solana.tx.program_keys.all(p, p == '<PROGRAM_ID>')` |
| Cap Bitcoin fees | DENY | (none) | `bitcoin.tx.fee > 50000` |
| Restrict to function (requires ABI) | ALLOW | (who) | `eth.tx.function_name == 'transfer'` |

## Instructions

### Create a policy

```
POST https://api.turnkey.com/public/v1/submit/create_policy
```

```json
{
  "policyName": "allow-eth-to-approved-addresses",
  "effect": "EFFECT_ALLOW",
  "condition": "eth.tx.to in ['0xADDR1', '0xADDR2']",
  "consensus": "approvers.any(user, user.id == '<USER_ID>')",
  "notes": "Only allow ETH transfers to approved addresses"
}
```

For creating multiple policies at once:

```
POST https://api.turnkey.com/public/v1/submit/create_policies
```

```json
{
  "policies": [
    { "policyName": "policy-1", "effect": "EFFECT_ALLOW", "condition": "...", "consensus": "..." },
    { "policyName": "policy-2", "effect": "EFFECT_DENY", "condition": "..." }
  ]
}
```

### List policies

```
POST https://api.turnkey.com/public/v1/query/list_policies
```

```json
{}
```

### Get policy details

```
POST https://api.turnkey.com/public/v1/query/get_policy
```

```json
{
  "policyId": "<POLICY_ID>"
}
```

### Update a policy

```
POST https://api.turnkey.com/public/v1/submit/update_policy
```

```json
{
  "policyId": "<POLICY_ID>",
  "policyName": "updated-name",
  "policyEffect": "EFFECT_ALLOW",
  "policyCondition": "eth.tx.to == '0xNEW_ADDRESS'",
  "policyConsensus": "approvers.any(user, user.id == '<USER_ID>')",
  "policyNotes": "Updated notes"
}
```

### Delete a policy

```
POST https://api.turnkey.com/public/v1/submit/delete_policy
```

```json
{
  "policyId": "<POLICY_ID>"
}
```

For deleting multiple policies at once:

```
POST https://api.turnkey.com/public/v1/submit/delete_policies
```

```json
{
  "policyIds": ["<POLICY_ID_1>", "<POLICY_ID_2>"]
}
```

### Debug denied transactions with policy evaluations

When a signing request is denied, use this endpoint to see exactly which policy denied it and why. Pass the activity ID from the denied request to get the evaluation trace.

```
POST https://api.turnkey.com/public/v1/query/get_policy_evaluations
```

```json
{
  "activityId": "<ACTIVITY_ID>"
}
```

The response returns a list of policy evaluations showing each policy that was evaluated, its effect, whether its condition and consensus matched, and the final outcome. Use this to identify which DENY policy blocked the request or confirm that no ALLOW policy matched.

## Smart Contract Interfaces

By default, the policy engine can only match on transaction-level fields like `to`, `value`, and `chain_id`. Contract calls appear as opaque hex bytes in `eth.tx.data`. To write policies that match on specific function names and parameters, you must upload the contract's ABI (Ethereum) or IDL (Solana) as a smart contract interface.

Once uploaded, the policy engine parses calldata automatically, exposing:
- `eth.tx.function_name` (string): the decoded function name (e.g., `transfer`)
- `eth.tx.function_signature` (string): the function signature bytes
- `eth.tx.contract_call_args` (map): parsed function arguments by name

### Upload a smart contract interface (ABI/IDL)

```
POST https://api.turnkey.com/public/v1/submit/create_smart_contract_interface
```

```json
{
  "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "abi": "[{\"type\":\"function\",\"name\":\"transfer\",\"inputs\":[{\"name\":\"to\",\"type\":\"address\"},{\"name\":\"value\",\"type\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}]}]",
  "type": "SMART_CONTRACT_INTERFACE_TYPE_ETHEREUM",
  "label": "USDC ERC-20",
  "notes": "USDC contract ABI for function-level policy control"
}
```

### List smart contract interfaces

```
POST https://api.turnkey.com/public/v1/query/list_smart_contract_interfaces
```

```json
{}
```

### Get a smart contract interface

```
POST https://api.turnkey.com/public/v1/query/get_smart_contract_interface
```

```json
{
  "smartContractInterfaceId": "<SMART_CONTRACT_INTERFACE_ID>"
}
```

### Delete a smart contract interface

```
POST https://api.turnkey.com/public/v1/submit/delete_smart_contract_interface
```

```json
{
  "smartContractInterfaceId": "<SMART_CONTRACT_INTERFACE_ID>"
}
```

After uploading an ABI, you can write policies like:

```json
{
  "policyName": "allow-only-erc20-transfer",
  "effect": "EFFECT_ALLOW",
  "condition": "eth.tx.to == '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' && eth.tx.function_name == 'transfer'",
  "consensus": "approvers.any(user, user.id == '<USER_ID>')",
  "notes": "Only allow transfer() calls on USDC contract"
}
```

For more smart contract interface examples, see [references/policy-api-examples.md](references/policy-api-examples.md).

## Writing Policy Expressions

The policy language supports:

- **Logical**: `&&`, `||`
- **Comparison**: `==`, `!=`, `<`, `>`, `<=`, `>=`
- **Membership**: `value in [list]`
- **Access**: `x[0]`, `x[0..3]`, `x.field`
- **Functions**: `.all(item, predicate)`, `.any(item, predicate)`, `.contains(value)`, `.count()`, `.filter(item, predicate)`

Only single quotes for strings inside expressions. The language is strongly typed.

For the complete policy language reference (all keywords, types, struct fields, chain-specific data), see [references/policy-language.md](references/policy-language.md).

For complete examples organized by use case, see [references/policy-api-examples.md](references/policy-api-examples.md).

## Important Gotchas

- The policy engine does NOT short-circuit. If a condition has `wallet.id == 'X' || private_key.id == 'Y'`, one side will always error. Split into separate policies.
- `eth.tx.value` is in wei (1 ETH = 1000000000000000000). `solana.tx.transfers[].amount` is in lamports. `bitcoin.tx.outputs[].value` is in satoshis.
- The `int` type is limited to 128 bits (i128). Large smart contract values may exceed this.
- Solana address table lookups surface as `ADDRESS_TABLE_LOOKUP`. Guard against this in allowlists.
- Root quorum activities (UPDATE_ROOT_QUORUM, SET_ORGANIZATION_FEATURE) are NOT governed by policies.
- `eth.tx.function_name` and `eth.tx.contract_call_args` only work if the contract's ABI has been uploaded as a smart contract interface. Without it, you can only match on raw `eth.tx.data` hex bytes.

## Rules

- DENY always takes precedence over ALLOW
- Non-root users are denied by default when no policy matches
- Test policies on testnet before deploying to production. A misconfigured policy can lock out all signing access with no way to recover except through root quorum.
- Avoid creating a DENY-all policy without an ALLOW escape path for admins. A blanket deny with no exceptions requires root quorum intervention to fix.
- Use descriptive policy names and notes for auditability
- Split complex conditions into separate policies to avoid evaluation errors
- Use `in [list]` syntax for allowlists instead of chaining `||`
- Upload ABIs for any contracts you want function-level policy control over

## Related Skills

- `managing-wallets-api` for wallet setup (policies govern wallet operations)
- `signing-transactions-api` for signing transactions (policies govern signing)
- `managing-users-api` for user and organization management
- `wallet-governance-workflow` for production hardening (policies, scoped users, governance)
