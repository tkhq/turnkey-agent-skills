---
name: turnkey-wallet-management
description: Creates and manages Turnkey wallets and derives blockchain addresses for Ethereum, Solana, Bitcoin, and other chains. Use when the agent needs a blockchain address, has no wallet yet, or user says "create a wallet", "get my ETH address", "set up a wallet", "derive a Solana address", or "bootstrap agent wallet".
compatibility: "Requires Node.js. Recommended: @turnkey/sdk-server. Lower-level: @turnkey/http and @turnkey/api-key-stamper. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars."
---

# Turnkey Wallet Management

## Overview

Use this skill to:
- Check whether a wallet already exists for an organization
- Create a new wallet with derived accounts for one or more blockchains
- Retrieve wallet addresses for a specific chain
- Manage multiple wallet accounts (add new chains to an existing wallet)

Turnkey wallets are HD (hierarchical deterministic) wallets. Private keys live in secure enclaves and are never exposed. You derive chain-specific addresses by specifying a BIP32 path and address format at wallet creation time.

## Prerequisites

```bash
# Recommended higher-level client (handles polling automatically)
npm install @turnkey/sdk-server

# Lower-level client (required by chain-specific packages like @turnkey/ethers, @turnkey/viem)
npm install @turnkey/http @turnkey/api-key-stamper
```

## Environment Variables

```env
TURNKEY_API_PUBLIC_KEY=    # Turnkey API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # Turnkey API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Turnkey organization UUID
```

These come from the [Turnkey console](https://app.turnkey.com) under **Settings → API Keys**.

## Instructions

Follow these steps when an agent needs wallet access:

### Step 1: Initialize the client

**Option A — `@turnkey/sdk-server` (recommended):** Handles async activity polling automatically. Use this unless you need to integrate with chain-specific packages that require `TurnkeyClient`.

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

**Option B — `@turnkey/http` (lower-level):** Required when passing the client to `TurnkeySigner` (ethers, viem, Solana). Wrap activities with `withAsyncPolling` to avoid manual polling loops.

```typescript
import { TurnkeyClient, withAsyncPolling } from "@turnkey/http";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";

const client = new TurnkeyClient(
  { baseUrl: "https://api.turnkey.com" },
  new ApiKeyStamper({
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  })
);
```

### Step 2: Check for an existing wallet

Before creating a wallet, always list existing wallets. An agent should only create a wallet if none exists.

With `@turnkey/sdk-server`, you can use `fetchWallets()` which returns wallets with their accounts already populated — a single round-trip:

```typescript
// @turnkey/sdk-server: single call, accounts included
const { wallets } = await client.getWallets({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

if (wallets.length > 0) {
  console.log("Wallet already exists:", wallets[0].walletId);
  // Proceed to Step 4 to fetch addresses
}
```

### Step 3: Create a wallet (if none exists)

Create a wallet and specify which chain accounts to derive upfront. You can derive accounts for multiple chains in a single call. Turnkey creates the HD wallet and derives all requested addresses atomically.

`createWallet` is an async activity. With `@turnkey/sdk-server` polling is automatic; with `@turnkey/http` use `withAsyncPolling`.

**Address format shortcut** — pass format strings directly for standard BIP-44 derivation paths:

```typescript
// @turnkey/sdk-server (recommended) — polling handled automatically
const createResponse = await client.createWallet({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  parameters: {
    walletName: "Agent Wallet",
    // Shortcut: pass address format strings; Turnkey uses standard BIP-44 paths
    accounts: [
      "ADDRESS_FORMAT_ETHEREUM",
      "ADDRESS_FORMAT_SOLANA",
    ],
  },
});

const walletId = createResponse.activity.result.createWalletResult!.walletId;
const addresses = createResponse.activity.result.createWalletResult!.addresses;
console.log("Created wallet:", walletId, "Addresses:", addresses);
```

For explicit BIP-44 paths or non-standard derivations, use the verbose form:

```typescript
// Verbose form — explicit curve, path, and format
accounts: [
  {
    curve: "CURVE_SECP256K1",
    pathFormat: "PATH_FORMAT_BIP32",
    path: "m/44'/60'/0'/0/0",
    addressFormat: "ADDRESS_FORMAT_ETHEREUM",
  },
  {
    curve: "CURVE_ED25519",
    pathFormat: "PATH_FORMAT_BIP32",
    path: "m/44'/501'/0'/0'",
    addressFormat: "ADDRESS_FORMAT_SOLANA",
  },
]
```

**Supported address formats:**

| Chain | `curve` | `path` | `addressFormat` |
|-------|---------|--------|-----------------|
| Ethereum / EVM | `CURVE_SECP256K1` | `m/44'/60'/0'/0/0` | `ADDRESS_FORMAT_ETHEREUM` |
| Solana | `CURVE_ED25519` | `m/44'/501'/0'/0'` | `ADDRESS_FORMAT_SOLANA` |
| Bitcoin (SegWit) | `CURVE_SECP256K1` | `m/84'/0'/0'/0/0` | `ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH` |
| Bitcoin (Taproot) | `CURVE_SECP256K1` | `m/86'/0'/0'/0/0` | `ADDRESS_FORMAT_BITCOIN_MAINNET_P2TR` |
| Cosmos | `CURVE_SECP256K1` | `m/44'/118'/0'/0/0` | `ADDRESS_FORMAT_COSMOS` |

### Step 4: Retrieve wallet accounts

To get the derived address for a specific chain from an existing wallet:

```typescript
const { accounts } = await client.getWalletAccounts({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  walletId: walletId,
});

const ethAccount = accounts.find(
  (a) => a.addressFormat === "ADDRESS_FORMAT_ETHEREUM"
);
const solanaAccount = accounts.find(
  (a) => a.addressFormat === "ADDRESS_FORMAT_SOLANA"
);

console.log("ETH address:", ethAccount?.address);
console.log("Solana address:", solanaAccount?.address);
```

## Examples

### Full bootstrap flow

For the complete end-to-end example (check for existing wallet → create if needed → derive ETH and Solana addresses), see `references/bootstrap-example.ts`.

## Troubleshooting

**Activity failed (`ACTIVITY_STATUS_FAILED`)**
The wallet creation failed server-side. Check the Turnkey console for details. Retry after investigating the cause.

**Activity rejected (`ACTIVITY_STATUS_REJECTED`)**
A policy denied the operation. Review policies in the Turnkey console under **Policies**.

**Consensus needed (`ACTIVITY_STATUS_CONSENSUS_NEEDED`)**
The organization requires multi-party approval. Log the `activityId` and prompt a human approver to approve it in the Turnkey console before retrying.

**`TurnkeyActivityError`**
Thrown by some SDK helpers when an activity does not complete. Inspect `error.activityId` and `error.activity.status` for debugging.

**`403 Forbidden`**
The API key does not have permission to perform this action. Check that `TURNKEY_API_PUBLIC_KEY` matches the key registered in the Turnkey console for this organization.

**`404 Not Found` on `getWalletAccounts`**
The `walletId` is invalid or belongs to a different organization. Re-run `getWallets` to confirm the correct ID.

## Related Skills

- `skills/core/transaction-signing/SKILL.md` — understand the stamping model before signing
- `skills/signing/ethereum-evm/SKILL.md` — sign EVM transactions (ethers.js or viem)
- `skills/signing/solana-signing/SKILL.md` — sign Solana transactions
