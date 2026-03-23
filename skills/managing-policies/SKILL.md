---
name: managing-policies
description: "Creates and manages Turnkey policies for wallet access control and transaction governance. Covers spending limits, address allowlists, contract restrictions, and agent wallet scoping using EFFECT_ALLOW and EFFECT_DENY rules. Use when asked to 'add a spending limit', 'restrict which addresses a wallet can send to', 'set up an allowlist', 'create guardrails for my agent', 'add a deny policy', or 'limit transaction amounts'."
license: Apache-2.0
compatibility: "Requires Node.js. Install @turnkey/sdk-server. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars."
metadata:
  version: "1.0.0"
  tags: ["policy", "access-control", "governance", "security", "allowlist"]
---

# Managing Policies

## Quick Start

Use Turnkey's policy engine to define rules that govern what actions users and agents can perform. Policies use `EFFECT_ALLOW` and `EFFECT_DENY` with condition expressions.

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

Policies are evaluated on every activity (signing, wallet creation, etc.):

1. If any policy evaluates to `EFFECT_DENY`, the activity is denied
2. If at least one policy evaluates to `EFFECT_ALLOW`, the activity is allowed
3. If no policy matches, the activity is denied by default (for non-root users)

**DENY always wins over ALLOW.** Design policies with this in mind.

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

### Step 2: Create a policy

```typescript
await client.createPolicies({
  policies: [
    {
      policyName: "allow-eth-transfers-to-approved-addresses",
      effect: "EFFECT_ALLOW",
      condition: 'eth.tx.to == "0xAPPROVED_ADDRESS_1" || eth.tx.to == "0xAPPROVED_ADDRESS_2"',
      consensus: "approvers.any(user, user.id == 'USER_ID')",
      notes: "Only allow ETH transfers to approved addresses",
    },
  ],
});
```

### Common Policy Patterns

| Pattern | Condition Expression |
|---------|---------------------|
| Address allowlist | `eth.tx.to == "0xADDR1" \|\| eth.tx.to == "0xADDR2"` |
| Deny all signing | `activity.type == 'ACTIVITY_TYPE_SIGN_TRANSACTION'` (with EFFECT_DENY) |
| Allow specific user | `approvers.any(user, user.id == 'USER_ID')` |
| Solana program restriction | `solana.tx.instructions.any(i, i.program_id == 'PROGRAM_ID')` |

### Step 3: List and manage policies

```typescript
// List all policies
const { policies } = await client.getPolicies();

// Delete a policy
await client.deletePolicy({ policyId: "POLICY_ID" });
```

For complete examples (spending limits, agent scoping, multi-chain policies), see [references/policy-examples.md](references/policy-examples.md).

## Rules

- DENY always takes precedence over ALLOW
- Non-root users are denied by default when no policy matches
- Always test policies on testnet before deploying to production
- Never create a DENY-all policy without an ALLOW escape path for admins
- Use descriptive policy names and notes for auditability

## Related Skills

- `creating-wallets` for wallet setup
- `signing-ethereum` for EVM transactions (policies govern these)
- `authenticating-users` for user and sub-organization management
