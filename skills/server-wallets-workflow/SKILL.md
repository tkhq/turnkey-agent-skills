---
name: server-wallets-workflow
description: "End-to-end workflow for building Node.js backend services with Turnkey server-side wallets. Covers wallet creation, multi-chain transaction signing, policy-based access control, and common patterns like sweepers, rebalancers, and payment orchestration using the parent organization model. Use when asked to 'build a backend signing service', 'automate transaction signing with Turnkey', 'set up company wallets', 'build a payment system with Turnkey', 'automate crypto payouts', 'set up server-side signing', 'build a treasury management service', 'create a trading bot with Turnkey', 'build a sweeper or rebalancer', or 'walk me through server-side Turnkey integration'. Do NOT use for individual tasks like creating a single wallet (use creating-wallets-sdk), signing one transaction (use signing-transactions-sdk), writing a single policy (use managing-policies-sdk), or building user-facing apps with login (use embedded-wallets-workflow)."
license: Apache-2.0
compatibility: "Requires Node.js. Install @turnkey/sdk-server plus chain-specific packages."
metadata:
  author: turnkey
  version: "1.0.0"
  tags: ["workflow", "server-wallets", "company-wallets", "backend", "automation", "end-to-end"]
---

# Server Wallets Workflow

Build a Node.js backend service that creates wallets, signs transactions, and enforces policies using Turnkey's server SDK. This workflow orchestrates three primitive skills in sequence to take you from zero to a working server-side signing service.

## Architecture Overview

Server wallets operate in the parent organization directly. No sub-organizations, no user authentication. Your backend holds an API key and controls everything through policies.

```
Your Node.js Service
  |
  ├── Turnkey Client (@turnkey/sdk-server)
  |     ├── API key authentication (P-256 key pair)
  |     ├── Operates in parent organization
  |     └── All actions governed by policy engine
  |
  ├── Wallets (HD wallets in secure enclaves)
  |     ├── One wallet per purpose (treasury, hot, cold)
  |     ├── Derive addresses for any supported chain
  |     └── Check existing wallets before creating new ones
  |
  ├── Signing (chain-specific signers)
  |     ├── viem/ethers for EVM chains
  |     ├── @turnkey/solana for Solana
  |     ├── signRawPayload for any other chain
  |     └── Sponsored transactions (gasless) via ethSendTransaction/solSendTransaction
  |
  └── Policies (access control and governance)
        ├── Address allowlists
        ├── Transaction value limits
        ├── Multi-party approval for high-value operations
        └── Contract interaction restrictions
```

## First Decision: Signing Approach

```
What kind of signing does your service need?
  |
  ├── EVM (Ethereum, Base, Polygon, Arbitrum, etc.)
  |     ├── New project --> @turnkey/viem (recommended)
  |     └── Existing ethers codebase --> @turnkey/ethers
  |
  ├── Solana
  |     └── @turnkey/solana
  |
  ├── Cosmos / Celestia
  |     └── @turnkey/cosmjs
  |
  ├── Bitcoin, Sui, TON, TRON
  |     └── signRawPayload via @turnkey/sdk-server (no extra package)
  |
  └── Gasless / Sponsored transactions
        └── ethSendTransaction or solSendTransaction via @turnkey/sdk-server
```

## Second Decision: Governance Model

```
How many people/services need signing access?
  |
  ├── Single signer (one API key, one service)
  |     Simple setup. Policies add guardrails (value limits, allowlists).
  |
  ├── Multi-service (multiple API keys, different permissions)
  |     Create API-only users with tags. Policies scope each user's access.
  |
  └── Multi-party approval (high-value operations need N-of-M approval)
        Consensus policies require multiple users to approve activities.
```

## Phase 1: Wallet Setup

**Skill:** Follow `creating-wallets-sdk` for detailed implementation.

**For this workflow, use these specific settings:**

### 1.1 Initialize the Turnkey client

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const turnkey = new Turnkey({
  apiBaseUrl: process.env.BASE_URL || "https://api.turnkey.com",
  apiPublicKey: process.env.API_PUBLIC_KEY!,
  apiPrivateKey: process.env.API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.ORGANIZATION_ID!,
});

const client = turnkey.apiClient();
```

**Environment variables:**
```env
API_PUBLIC_KEY=<starts-with-02-or-03>
API_PRIVATE_KEY=<your-private-key>
ORGANIZATION_ID=<your-org-id>
BASE_URL=https://api.turnkey.com
```

### 1.2 Check existing wallets, then create

```typescript
const { wallets } = await client.getWallets();

if (wallets.length === 0) {
  const wallet = await client.createWallet({
    walletName: "treasury-wallet",
    accounts: [
      { curve: "CURVE_SECP256K1", pathFormat: "PATH_FORMAT_BIP32",
        path: "m/44'/60'/0'/0/0", addressFormat: "ADDRESS_FORMAT_ETHEREUM" },
      { curve: "CURVE_ED25519", pathFormat: "PATH_FORMAT_BIP32",
        path: "m/44'/501'/0'/0'", addressFormat: "ADDRESS_FORMAT_SOLANA" },
    ],
  });
  console.log("Wallet created:", wallet.walletId);
  console.log("ETH address:", wallet.addresses[0]);
  console.log("SOL address:", wallet.addresses[1]);
}
```

For wallet topology guidance: create separate wallets per purpose (hot wallet for frequent operations, cold wallet for long-term storage). See the chain support table in `creating-wallets-sdk` for all supported chains, curves, and derivation paths.

## Phase 2: Transaction Signing

**Skill:** Follow `signing-transactions-sdk` for detailed implementation.

**For this workflow, choose your integration based on chain:**

### EVM with viem (recommended for new projects)

```typescript
import { createAccount } from "@turnkey/viem";
import { createWalletClient, http, parseEther } from "viem";
import { sepolia } from "viem/chains";

const account = await createAccount({
  client: turnkey.apiClient(),
  organizationId: process.env.ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!, // ETH address from Phase 1
});

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(`https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`),
});

// Send ETH
const hash = await walletClient.sendTransaction({
  to: "0xRECIPIENT",
  value: parseEther("0.01"),
});

// Sign a message
const sig = await walletClient.signMessage({ message: "Hello" });
```

### Other chains and approaches

Follow `signing-transactions-sdk` for the full integration table. Quick reference:

- **EVM with ethers** (existing codebases): `TurnkeySigner` from `@turnkey/ethers`, connect to a `JsonRpcProvider`
- **Solana**: `TurnkeySigner` from `@turnkey/solana`. Always pass the address explicitly to `addSignature(tx, address)`
- **Cosmos**: `TurnkeyDirectWallet` from `@turnkey/cosmjs` with `SigningStargateClient`
- **Bitcoin, Sui, TON, TRON**: Use `signRawPayload` directly via `@turnkey/sdk-server`
- **Sponsored/gasless**: Use `ethSendTransaction` or `solSendTransaction` with `sponsor: true`, then poll `getSendTransactionStatus` until complete

See [references/complete-example.md](references/complete-example.md) for full sweeper and rebalancer implementations.

### Consensus Error Handling

When policies require multi-party approval, signing operations throw a consensus error instead of completing:

```typescript
try {
  const tx = await connectedSigner.sendTransaction(txRequest);
} catch (error: any) {
  if (error.toString().includes("ACTIVITY_STATUS_CONSENSUS_NEEDED")) {
    console.log(`Activity ${error.activityId} needs approval from other users.`);
    // The activity will complete once enough approvers call approveActivity
    return;
  }
  throw error;
}
```

## Phase 3: Access Control

**Skill:** Follow `managing-policies-sdk` for detailed implementation.

**For server wallets, common policy patterns:**

### Single-service guardrails

```typescript
// Cap ETH transfer value (deny anything over 1 ETH)
await client.createPolicy({
  policyName: "block-large-eth-transfers",
  effect: "EFFECT_DENY",
  condition: "eth.tx.value > 1000000000000000000",
  notes: "Safety net: block transfers over 1 ETH",
});

// Only allow sends to approved addresses
await client.createPolicy({
  policyName: "eth-address-allowlist",
  effect: "EFFECT_ALLOW",
  condition: "eth.tx.to in ['0xADDR1', '0xADDR2', '0xADDR3']",
  consensus: `approvers.any(user, user.id == '${serviceUserId}')`,
  notes: "Only allow transfers to known addresses",
});
```

### Multi-service access (tag-based)

```typescript
// Create users with role tags
const traderTag = await client.createUserTag({ tagName: "Trader" });
const adminTag = await client.createUserTag({ tagName: "Admin" });

await client.createApiOnlyUsers({
  apiOnlyUsers: [{
    userName: "trading-service",
    userTags: [traderTag.tagId],
    apiKeys: [{ apiKeyName: "trading-key", publicKey: tradingPublicKey }],
  }],
});

// Traders can only interact with specific contracts
await client.createPolicy({
  policyName: "traders-use-approved-contracts",
  effect: "EFFECT_ALLOW",
  consensus: `approvers.any(user, user.tags.contains('${traderTag.tagId}'))`,
  condition: `eth.tx.to in ['0xUNISWAP_ROUTER', '0xWETH']`,
});

// Admins can do everything
await client.createPolicy({
  policyName: "admin-full-access",
  effect: "EFFECT_ALLOW",
  consensus: `approvers.any(user, user.tags.contains('${adminTag.tagId}'))`,
  condition: "true",
});
```

### Multi-party approval

```typescript
// High-value transfers need 2-of-3 signers
await client.createPolicy({
  policyName: "high-value-multisig",
  effect: "EFFECT_ALLOW",
  consensus: `approvers.filter(user, user.tags.contains('${signerTag}')).count() >= 2`,
  condition: "eth.tx.value > 500000000000000000", // > 0.5 ETH
});
```

See `managing-policies-sdk` for the full policy language reference, chain-specific transaction fields, and gotchas.

## Common Patterns

**Sweeper**: multi-account wallet (Phase 1) + batch sends (Phase 2). **Rebalancer**: multiple wallets + role-based access (Phase 3). **Payment orchestration**: batch transactions + value limits. **Trading bot**: contract interactions + contract allowlists. See [references/complete-example.md](references/complete-example.md) for full implementations.

## Rules

- Always check for existing wallets before creating new ones
- Use separate wallets for separate purposes (hot/cold/trading)
- Add policies before handling real funds on mainnet
- Never hardcode private keys; use environment variables
- Use testnet for development, mainnet for production
- Handle consensus errors gracefully when multi-party approval is configured
- Set the `SIGN_WITH` variable to a derived address from a Turnkey wallet, not an arbitrary address

## Related Skills

- `creating-wallets-sdk` for chain support table and advanced wallet patterns
- `signing-transactions-sdk` for all chain-specific signing, broadcasting, and signer packages
- `managing-policies-sdk` for policy language reference and governance patterns
- `embedded-wallets-workflow` for user-facing apps with authentication and sub-organizations
