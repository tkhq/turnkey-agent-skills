---
name: managing-policies-api
description: "Creates and manages Turnkey organization policies for access control and transaction governance using the Turnkey CLI and API endpoints. Policies are JSON rules with effect (ALLOW/DENY), consensus (who can approve), and condition (when it applies) fields. Covers spending limits, address allowlists, contract restrictions, user permissions, and multi-sig approval via turnkey request commands. Use when asked to 'create a policy with turnkey request', 'manage policies via turnkey API', 'set up an allowlist using the API', 'create a deny policy via turnkey request', 'delete a policy via the API', 'list policies using turnkey CLI', 'write a policy condition via the API', or 'set up multi-sig approval using turnkey request'. Do NOT use for creating wallets (use creating-wallets-api), signing transactions (use signing-transactions-api), generating API keys (use managing-credentials-api), or SDK-based policy management with @turnkey/sdk-server (use managing-policies-sdk)."
license: Apache-2.0
compatibility: "Requires turnkey CLI (brew install tkhq/tap/turnkey). Set up API keys first."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["policy", "cli", "access-control", "governance", "security", "allowlist", "deny", "consensus"]
---

## Quick Start

Use `turnkey request` to create and manage policies that govern what actions users and agents can perform. Every policy has an `effect` (ALLOW or DENY), an optional `consensus` (who must approve), and an optional `condition` (when it applies).

## Prerequisites

```bash
brew install tkhq/tap/turnkey
```

Requires API keys configured (see managing-credentials-api skill).

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

## Instructions

### Step 1: Create a policy

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "allow-eth-to-approved-addresses",
  "effect": "EFFECT_ALLOW",
  "condition": "eth.tx.to in ['\''0xADDR1'\'', '\''0xADDR2'\'']",
  "consensus": "approvers.any(user, user.id == '\''<USER_ID>'\'')",
  "notes": "Only allow ETH transfers to approved addresses"
}'
```

For creating multiple policies at once:

```bash
turnkey request --path /public/v1/submit/create_policies --body '{
  "policies": [
    { "policyName": "policy-1", "effect": "EFFECT_ALLOW", "condition": "...", "consensus": "..." },
    { "policyName": "policy-2", "effect": "EFFECT_DENY", "condition": "..." }
  ]
}'
```

### Step 2: List policies

```bash
turnkey request --path /public/v1/query/list_policies --body '{}'
```

### Step 3: Get policy details

```bash
turnkey request --path /public/v1/query/get_policy --body '{"policyId": "<POLICY_ID>"}'
```

### Step 4: Update a policy

```bash
turnkey request --path /public/v1/submit/update_policy --body '{
  "policyId": "<POLICY_ID>",
  "policyName": "updated-name",
  "policyEffect": "EFFECT_ALLOW",
  "policyCondition": "eth.tx.to == '\''0xNEW_ADDRESS'\''",
  "policyConsensus": "approvers.any(user, user.id == '\''<USER_ID>'\'')",
  "policyNotes": "Updated notes"
}'
```

### Step 5: Delete a policy

```bash
turnkey request --path /public/v1/submit/delete_policy --body '{"policyId": "<POLICY_ID>"}'
```

## Writing Policy Expressions

The policy language supports:

- **Logical**: `&&`, `||`
- **Comparison**: `==`, `!=`, `<`, `>`, `<=`, `>=`
- **Membership**: `value in [list]`
- **Access**: `x[0]`, `x[0..3]`, `x.field`
- **Functions**: `.all(item, predicate)`, `.any(item, predicate)`, `.contains(value)`, `.count()`, `.filter(item, predicate)`

Only single quotes for strings inside expressions. The language is strongly typed.

For the complete policy language reference (all keywords, types, struct fields, chain-specific data), see [references/policy-language.md](references/policy-language.md).

For complete examples organized by use case, see [references/policy-cli-examples.md](references/policy-cli-examples.md).

## Important Gotchas

- The policy engine does NOT short-circuit. If a condition has `wallet.id == 'X' || private_key.id == 'Y'`, one side will always error. Split into separate policies.
- `eth.tx.value` is in wei (1 ETH = 1000000000000000000). `solana.tx.transfers[].amount` is in lamports. `bitcoin.tx.outputs[].value` is in satoshis.
- The `int` type is limited to 128 bits (i128). Large smart contract values may exceed this.
- Solana address table lookups surface as `ADDRESS_TABLE_LOOKUP`. Guard against this in allowlists.
- Root quorum activities (UPDATE_ROOT_QUORUM, SET_ORGANIZATION_FEATURE) are NOT governed by policies.

## Rules

- DENY always takes precedence over ALLOW
- Non-root users are denied by default when no policy matches
- Test policies on testnet before deploying to production. A misconfigured policy can lock out all signing access with no way to recover except through root quorum.
- Avoid creating a DENY-all policy without an ALLOW escape path for admins. A blanket deny with no exceptions requires root quorum intervention to fix.
- Use descriptive policy names and notes for auditability
- Split complex conditions into separate policies to avoid evaluation errors
- Use `in [list]` syntax for allowlists instead of chaining `||`

## Related Skills

- `creating-wallets-api` for wallet setup (policies govern wallet operations)
- `signing-transactions-api` for signing transactions (policies govern signing)
- `managing-credentials-api` for user and organization management
- `secure-wallets-workflow` for production hardening (policies, scoped users, governance)
- `managing-policies-sdk` for SDK-based policy management in TypeScript
