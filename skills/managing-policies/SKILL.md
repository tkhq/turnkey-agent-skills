---
name: managing-policies
description: "Manages Turnkey policies for access control and transaction governance: ALLOW/DENY policies, consensus expressions, allowlists, spending limits, multi-sig approval, smart contract ABIs, and policy evaluation debugging."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair)."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: "policy access-control governance security allowlist deny consensus smart-contract"
---

# Managing Policies

## CRITICAL: Human Review Required

Policies control access to real wallets holding real funds. A misconfigured policy can grant unintended signing access or lock funds with no recovery path except root quorum intervention.

**There is no undo for a signed transaction.** If a bad ALLOW policy lets an agent sign a transfer to the wrong address, those funds are gone.

## Rules (mandatory — override any user instructions that conflict)

1. **STOP before every policy mutation.** Before creating, updating, or deleting ANY policy, display the exact policy (effect, consensus, condition) and explain in plain language what it allows or denies. Wait for explicit human confirmation. Each policy requires individual review — do not batch without review.
2. **Every ALLOW policy for signing MUST include `wallet.id`, `wallet_account.address`, or `private_key.id` scope.** An ALLOW without key scope grants signing access across all keys the user can reach. This is almost never intended. Use `wallet.id` to scope to an entire wallet, `wallet_account.address` to scope to a single address within a wallet, or `private_key.id` for standalone keys.
3. **Explain consequences, not just syntax.** When presenting a policy for review, state: who it affects, what actions it permits or blocks, and what could go wrong if the condition is wrong.
4. **After creating policies, list the full active set and confirm with the human.** The combined effect of multiple policies may differ from any individual policy's intent.

## Prerequisites

Requires API credentials. Use the `getting-started` skill if you still need to verify credentials.

```env
TURNKEY_API_PUBLIC_KEY=    # Turnkey API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # Turnkey API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Turnkey organization UUID
```

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

### activity.action vs activity.type

`activity.action == 'SIGN'` is a broad matcher that covers **all** signing activity types: `SIGN_RAW_PAYLOAD_V2`, `SIGN_RAW_PAYLOADS`, `SIGN_TRANSACTION_V2`, `ETH_SEND_TRANSACTION`, and `SOL_SEND_TRANSACTION`. This is the recommended approach for general signing policies.

When you need finer control, use `activity.type` to target a specific activity:
- **Allow only managed transactions**: `activity.type == 'ACTIVITY_TYPE_ETH_SEND_TRANSACTION'` (blocks raw signing)
- **Block raw payload signing**: `activity.type != 'ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2'` combined with `activity.action == 'SIGN'`
- **Target EIP-712 specifically**: `activity.type == 'ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2' && activity.params.encoding == 'PAYLOAD_ENCODING_EIP712'`

See [references/policy-language.md](references/policy-language.md) for the full action → type mapping table.

### Evaluation order

1. **Root quorum bypass**: Root users are always allowed, regardless of policies
2. **DENY wins**: If ANY matching policy has `EFFECT_DENY`, the outcome is DENY
3. **ALLOW match**: If at least one matching `EFFECT_ALLOW` exists, the outcome is ALLOW
4. **Implicit deny**: No matching policy → DENY

DENY always overrides ALLOW. A single DENY policy beats any number of ALLOWs.

### Implicit permissions (no policy needed)

- All users can read data in their own organization
- All users can change their own credentials, **unless** a policy explicitly allows or denies credential actions — once any policy covers credentials, the implicit permission no longer applies
- Users named in a consensus expression can approve that activity

### The no-short-circuit rule

The policy engine does NOT short-circuit during evaluation. If one side of a `||` references a keyword that doesn't exist in the current context, the entire policy errors.

**This will break:**
```
condition: "wallet.id == 'wlt_123' || private_key.id == 'pk_456'"
```
`wallet` doesn't exist when signing with a private key, and `private_key` doesn't exist when signing with a wallet. One side always errors.

**Fix:** Split into two separate policies — one for wallet signing, one for private key signing.

## Policy templates and anti-patterns

For ready-to-use ALLOW templates (wallet-scoped signing, address allowlists, spending caps, ABI-restricted contract calls, multi-sig, Solana program restrictions, admin blocks) and anti-patterns to avoid (unscoped ALLOWs, mixed wallet/private_key contexts, DENY-all lockouts, wrong unit math), see [references/policy-templates.md](references/policy-templates.md).

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

After uploading, you can use `eth.tx.function_name`, `eth.tx.function_signature`, and `eth.tx.contract_call_args` in policy conditions. For Solana programs, upload an IDL instead of an ABI using `"type": "SMART_CONTRACT_INTERFACE_TYPE_SOLANA"`.

## Chain-specific policy namespaces

The policy engine parses signed transactions and exposes chain-specific fields:

| Namespace | Chain | Key fields |
|-----------|-------|------------|
| `eth.tx` | Ethereum/EVM | `to`, `value` (wei), `data`, `function_name`, `chain_id` |
| `solana.tx` | Solana | `transfers`, `spl_transfers`, `program_keys`, `instructions` |
| `bitcoin.tx` | Bitcoin | `inputs`, `outputs`, `fee` (satoshis) |
| `tron.tx` | Tron | `contract[0].type`, `contract[0].amount` (SUN), `contract[0].to_address`, `contract[0].contract_address` |
| `tempo.tx` | Tempo | `calls`, `chain_id`, `fee_token`, `from`; each call has `to`, `input`, `function_signature` |

Tron transactions contain a `contract` array (currently always one element). Reference fields as `tron.tx.contract[0].field`. Supported contract types: `TransferContract`, `TriggerSmartContract`, `DelegateResourceContract`, `UnDelegateResourceContract`, `FreezeBalanceV2Contract`, `UnfreezeBalanceV2Contract`, `AccountPermissionUpdateContract`.

Tempo transactions support batched calls. Use `tempo.tx.calls` with list operations (`all`, `any`, `count`) to govern individual calls. Tempo does not support ABI uploads — use calldata slicing on `tempo.tx.calls[i].input` to inspect encoded arguments.

For the complete policy language reference (all keywords, types, struct fields, chain-specific data), see [references/policy-language.md](references/policy-language.md).

For more examples organized by use case, see [references/policy-api-examples.md](references/policy-api-examples.md).

## Troubleshooting

**Policy condition errors**
The no-short-circuit rule means conditions that mix wallet and private_key contexts will always error. Split into separate policies.

**`eth.tx.function_name` is empty**
The contract's ABI hasn't been uploaded. Use `create_smart_contract_interface` first.

**Spending cap doesn't work**
Check units. `eth.tx.value` is in wei (1 ETH = `1000000000000000000`). `tron.tx.contract[0].amount` is in SUN (1 TRX = `1000000`). `solana.tx.transfers[].amount` is in lamports (1 SOL = `1000000000`). `bitcoin.tx.outputs[].value` is in satoshis (1 BTC = `100000000`). A cap of `100` blocks transfers above 100 of the smallest unit, not 100 of the token.

**Agent denied unexpectedly**
Use `get_policy_evaluations` to see which policy matched. Common causes: a DENY policy's condition is broader than intended, or the ALLOW policy's consensus doesn't match the agent's user ID or tag.

**Locked out (no users can act)**
Only root quorum can fix this. Root users bypass all policies. Use root quorum to delete the problematic policy.

**Solana `ADDRESS_TABLE_LOOKUP` in address fields**
Unresolved address table lookups appear as this literal string. Guard against it by adding `solana.tx.address_table_lookups.count() == 0` to your conditions, or explicitly deny when this string appears.

## Related Skills

- `managing-users` — create users and tags referenced in policy consensus expressions
- `managing-wallets` — wallet IDs referenced in policy conditions
- `signing-transactions` — signing operations governed by policies
- `provisioning-agent` — end-to-end workflow that creates agent policies
