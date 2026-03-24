---
name: managing-policies-sdk
description: "Creates and manages Turnkey organization policies for access control and transaction governance. Policies are JSON rules with effect (ALLOW/DENY), consensus (who can approve), and condition (when it applies) fields. Covers spending limits, address allowlists, contract restrictions, user permissions, and multi-sig approval using Turnkey's policy language. Use when asked to 'create a policy', 'add a spending limit', 'restrict which addresses can be sent to', 'set up an allowlist', 'add a deny policy', 'limit transaction amounts', 'require approval from multiple users', 'lock down signing', 'write a policy condition', 'set up access control', 'list policies', or 'delete a policy'. Do NOT use for creating wallets, signing transactions, sending funds, authenticating users, setting up email auth, deriving addresses, deploying contracts, or CLI/API-based policy management using the turnkey command line tool or turnkey request (use managing-policies-api instead)."
license: Apache-2.0
compatibility: "Requires Node.js. Install @turnkey/sdk-server. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars."
metadata:
  author: turnkey
  version: "2.0.0"
  tags: ["policy", "access-control", "governance", "security", "allowlist", "deny", "consensus"]
---

# Managing Policies

## Quick Start

Use Turnkey's policy engine to define JSON rules that govern what actions users and agents can perform. Every policy has an `effect` (ALLOW or DENY), an optional `consensus` (who must approve), and an optional `condition` (when it applies).

## Prerequisites

```bash
npm install @turnkey/sdk-server
```

## Environment Variables

```env
TURNKEY_API_PUBLIC_KEY=    # required
TURNKEY_API_PRIVATE_KEY=   # required
TURNKEY_ORGANIZATION_ID=   # required
```

## How Policies Work

### Policy Structure

Every policy is a JSON object with these fields:

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
- **consensus**: Expression over `approvers` (users) and `credentials`. Determines WHO can act.
- **condition**: Expression over activity metadata, transaction data, wallet info. Determines WHEN the policy applies.
- Both `consensus` and `condition` are optional but at least one should be provided.

### Evaluation Order

All policies are evaluated on every request. The outcome follows this precedence:

1. Root quorum users bypass all policies (always allowed)
2. If ANY matching policy has `EFFECT_DENY`, the outcome is DENY
3. If at least one matching policy has `EFFECT_ALLOW`, the outcome is ALLOW
4. If no policy matches, the outcome is DENY (implicit deny)

**DENY always wins over ALLOW.** Design policies with this in mind. Never create a blanket DENY without an ALLOW escape path for admins.

### Implicit Permissions

These actions are allowed without explicit policies:
- All users can read (GET) data in their own organization
- All users can change their own credentials
- All users can approve activities they were included in via consensus

## How to Think About Policies

Before writing a policy, answer three questions:

1. **Who should be able to do this?** This becomes your `consensus` expression. Use `approvers.any()` for single-user, `approvers.filter().count() >= N` for multi-sig.
2. **Under what conditions?** This becomes your `condition` expression. Use `activity.*` for action types, `eth.tx.*`/`solana.tx.*`/`bitcoin.tx.*` for chain-specific transaction data, `wallet.*` for wallet scoping.
3. **Should it allow or deny?** Use ALLOW for positive permissions. Use DENY for blocklists and guardrails. Remember DENY always wins.

### Common Policy Patterns

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

### Step 1: Initialize the client

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

### Step 2: Create policies

```typescript
await client.createPolicies({
  policies: [
    {
      policyName: "allow-eth-to-approved-addresses",
      effect: "EFFECT_ALLOW",
      condition: "eth.tx.to in ['0xADDR1', '0xADDR2']",
      consensus: "approvers.any(user, user.id == '<USER_ID>')",
      notes: "Only allow ETH transfers to approved addresses",
    },
  ],
});
```

For a single policy, use `createPolicy` (singular) with the same fields minus the array wrapper.

### Step 3: List, update, and delete policies

```typescript
// List all policies
const { policies } = await client.getPolicies();

// Update a policy
await client.updatePolicy({
  policyId: "<POLICY_ID>",
  policyName: "updated-name",
  policyEffect: "EFFECT_ALLOW",
  policyCondition: "eth.tx.to == '0xNEW_ADDRESS'",
  policyConsensus: "approvers.any(user, user.id == '<USER_ID>')",
  policyNotes: "Updated notes",
});

// Delete a policy
await client.deletePolicy({ policyId: "<POLICY_ID>" });
```

### Writing Policy Expressions

The policy language supports these operations:

- **Logical**: `&&`, `||`
- **Comparison**: `==`, `!=`, `<`, `>`, `<=`, `>=`
- **Membership**: `value in [list]`
- **Access**: `x[0]`, `x[0..3]`, `x.field`
- **Functions**: `.all(item, predicate)`, `.any(item, predicate)`, `.contains(value)`, `.count()`, `.filter(item, predicate)`

Only single quotes for strings inside expressions. The language is strongly typed.

For the complete policy language reference (all keywords, types, struct fields, and chain-specific transaction data), see [references/policy-language.md](references/policy-language.md).

For complete, runnable TypeScript examples organized by use case, see [references/policy-examples.md](references/policy-examples.md).

## Important Gotchas

- The policy engine does NOT short-circuit. If a condition has `wallet.id == 'X' || private_key.id == 'Y'`, one side will always error because an activity targets either a wallet or a private key, not both. Split these into separate policies.
- `eth.tx.value` is in wei (1 ETH = 1000000000000000000 wei). `solana.tx.transfers[].amount` is in lamports. `bitcoin.tx.outputs[].value` is in satoshis.
- The `int` type is limited to 128 bits (i128). Ethereum smart contract values exceeding this range cannot be used in policy conditions.
- Solana address table lookups surface as the literal string `ADDRESS_TABLE_LOOKUP`. Guard against this if you use address allowlists.
- Root quorum activities (`UPDATE_ROOT_QUORUM`, `SET_ORGANIZATION_FEATURE`, `REMOVE_ORGANIZATION_FEATURE`) are NOT governed by policies. They require root quorum approval regardless.

## Rules

- DENY always takes precedence over ALLOW
- Non-root users are denied by default when no policy matches
- Always test policies on testnet before deploying to production
- Never create a DENY-all policy without an ALLOW escape path for admins
- Use descriptive policy names and notes for auditability
- Split complex conditions into separate policies to avoid evaluation errors
- Use `in [list]` syntax for allowlists instead of chaining `||` when possible

## Related Skills

- `creating-wallets-sdk` for wallet setup (policies govern wallet operations)
- `signing-transactions-sdk` for signing and broadcasting transactions (policies govern signing)
- `authenticating-users-sdk` for user and sub-organization management
