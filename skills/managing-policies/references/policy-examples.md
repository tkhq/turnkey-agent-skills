# Policy Examples

## Address Allowlist (Ethereum)

Only allow transactions to a predefined set of addresses.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();

const approvedAddresses = [
  "0xAPPROVED_ADDRESS_1",
  "0xAPPROVED_ADDRESS_2",
  "0xAPPROVED_ADDRESS_3",
];

const condition = approvedAddresses
  .map((addr) => `eth.tx.to == "${addr}"`)
  .join(" || ");

await client.createPolicies({
  policies: [
    {
      policyName: "eth-address-allowlist",
      effect: "EFFECT_ALLOW",
      condition,
      consensus: "approvers.any(user, user.id == 'AGENT_USER_ID')",
      notes: "Allow ETH transfers only to approved addresses",
    },
  ],
});
```

## Deny All Signing Except Specific User

Lock down signing to only a specific user (e.g., an agent).

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();

// First: ALLOW signing for the agent user
await client.createPolicies({
  policies: [
    {
      policyName: "allow-agent-signing",
      effect: "EFFECT_ALLOW",
      condition: "activity.type == 'ACTIVITY_TYPE_SIGN_TRANSACTION'",
      consensus: "approvers.any(user, user.id == 'AGENT_USER_ID')",
      notes: "Allow the agent to sign transactions",
    },
  ],
});
```

## Solana Program Restriction

Only allow Solana transactions that interact with a specific program.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();
const ALLOWED_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"; // SPL Token program

await client.createPolicies({
  policies: [
    {
      policyName: "solana-spl-only",
      effect: "EFFECT_ALLOW",
      condition: `solana.tx.instructions.all(i, i.program_id == '${ALLOWED_PROGRAM}')`,
      consensus: "approvers.any(user, user.id == 'AGENT_USER_ID')",
      notes: "Only allow Solana transactions that use the SPL Token program",
    },
  ],
});
```

## Agent Wallet Scoping

Create a complete policy set for an agent wallet: allow specific actions, deny everything else.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();
const agentUserId = "AGENT_USER_ID";

await client.createPolicies({
  policies: [
    // Allow the agent to sign ETH transactions to approved addresses
    {
      policyName: "agent-eth-signing",
      effect: "EFFECT_ALLOW",
      condition: 'eth.tx.to == "0xAPPROVED_CONTRACT"',
      consensus: `approvers.any(user, user.id == '${agentUserId}')`,
      notes: "Agent can sign ETH txs to approved contract only",
    },
    // Allow the agent to read wallet info
    {
      policyName: "agent-read-access",
      effect: "EFFECT_ALLOW",
      condition: "activity.type == 'ACTIVITY_TYPE_GET_WALLETS' || activity.type == 'ACTIVITY_TYPE_GET_WALLET_ACCOUNTS'",
      consensus: `approvers.any(user, user.id == '${agentUserId}')`,
      notes: "Agent can read wallet information",
    },
  ],
});
```
