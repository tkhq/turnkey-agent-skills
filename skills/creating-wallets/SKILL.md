---
name: creating-wallets
description: "Creates HD wallets and derives blockchain addresses for Ethereum, Solana, Bitcoin, Cosmos, TON, XRP, Stellar, and other chains using Turnkey's secure enclave infrastructure. Use when asked to 'create a wallet', 'set up a wallet', 'generate an address', 'derive an address', 'check if I have a wallet', 'list my wallets', 'make a new wallet', 'get a blockchain address', 'add a chain to my wallet', 'create a sub-organization with a wallet', or 'set up wallets for users'. Do NOT use for signing transactions, sending funds, or setting wallet policies."
license: Apache-2.0
compatibility: "Requires Node.js. Install @turnkey/sdk-server. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars."
metadata:
  version: "1.1.0"
  tags: ["wallet", "blockchain", "address-derivation", "hd-wallet", "sub-organization"]
---

# Creating Wallets

## Quick Start

Use `@turnkey/sdk-server` to create an HD wallet and derive addresses. Always check for existing wallets before creating new ones.

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

## Instructions

### Step 1: Initialize the Turnkey client

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

### Step 2: Check for existing wallets

```typescript
const { wallets } = await client.getWallets();
if (wallets.length > 0) {
  console.log("Existing wallets found:", wallets);
  // Use existing wallet instead of creating a new one
}
```

### Step 3: Create a wallet with addresses

```typescript
const wallet = await client.createWallet({
  walletName: "my-wallet",
  accounts: [
    { curve: "CURVE_SECP256K1", pathFormat: "PATH_FORMAT_BIP32", path: "m/44'/60'/0'/0/0", addressFormat: "ADDRESS_FORMAT_ETHEREUM" },
    { curve: "CURVE_ED25519", pathFormat: "PATH_FORMAT_BIP32", path: "m/44'/501'/0'/0'", addressFormat: "ADDRESS_FORMAT_SOLANA" },
  ],
  mnemonicLength: 12, // optional: 12, 15, 18, 21, or 24 words (default: 12)
});
```

### Supported address formats

| Chain | Curve | Path | Address Format |
|-------|-------|------|----------------|
| Ethereum/EVM | CURVE_SECP256K1 | m/44'/60'/0'/0/0 | ADDRESS_FORMAT_ETHEREUM |
| Solana | CURVE_ED25519 | m/44'/501'/0'/0' | ADDRESS_FORMAT_SOLANA |
| Bitcoin (SegWit) | CURVE_SECP256K1 | m/84'/0'/0'/0/0 | ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH |
| Bitcoin (Taproot) | CURVE_SECP256K1 | m/86'/0'/0'/0/0 | ADDRESS_FORMAT_BITCOIN_MAINNET_P2TR |
| Cosmos | CURVE_SECP256K1 | m/44'/118'/0'/0/0 | ADDRESS_FORMAT_COSMOS |
| Aptos | CURVE_ED25519 | m/44'/637'/0'/0'/0 | ADDRESS_FORMAT_APTOS |
| Sui | CURVE_ED25519 | m/44'/784'/0'/0/0 | ADDRESS_FORMAT_SUI |
| Tron | CURVE_SECP256K1 | m/44'/195'/0'/0/0 | ADDRESS_FORMAT_TRON |
| TON | CURVE_ED25519 | m/44'/607'/0'/0/0 | ADDRESS_FORMAT_TON_V4R2 |
| XRP | CURVE_SECP256K1 | m/44'/144'/0'/0/0 | ADDRESS_FORMAT_XRP |
| Stellar (XLM) | CURVE_ED25519 | m/44'/148'/0'/0'/0 | ADDRESS_FORMAT_XLM |
| Dogecoin | CURVE_SECP256K1 | m/44'/3'/0'/0/0 | ADDRESS_FORMAT_DOGE_MAINNET |
| Sei | CURVE_ED25519 | m/44'/118'/0'/0/0 | ADDRESS_FORMAT_SEI |

For testnet Bitcoin, use `ADDRESS_FORMAT_BITCOIN_TESTNET_P2WPKH` or `ADDRESS_FORMAT_BITCOIN_TESTNET_P2TR`.
For TON variants, options include `ADDRESS_FORMAT_TON_V3R2` and `ADDRESS_FORMAT_TON_V4R2`.

### Step 4: Derive additional addresses later

```typescript
const newAccounts = await client.createWalletAccounts({
  walletId: wallet.walletId,
  accounts: [
    { curve: "CURVE_SECP256K1", pathFormat: "PATH_FORMAT_BIP32", path: "m/84'/0'/0'/0/0", addressFormat: "ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH" },
  ],
});
```

### Step 5: Create a sub-organization with a wallet (for end-user wallets)

When building applications where each user gets their own wallet, create a sub-organization per user:

```typescript
const subOrg = await client.createSubOrganization({
  subOrganizationName: "user-123",
  rootUsers: [{
    userName: "end-user",
    userEmail: "user@example.com",
    apiKeys: [],
    authenticators: [],
    oauthProviders: [],
  }],
  rootQuorumThreshold: 1,
  wallet: {
    walletName: "Default Wallet",
    accounts: [
      { curve: "CURVE_SECP256K1", pathFormat: "PATH_FORMAT_BIP32", path: "m/44'/60'/0'/0/0", addressFormat: "ADDRESS_FORMAT_ETHEREUM" },
    ],
  },
});
```

For complete examples including multi-chain wallet bootstrap and sub-org patterns, see [references/wallet-examples.md](references/wallet-examples.md).

## Rules

- NEVER call `createWallet` without first calling `getWallets` to check for existing wallets
- Always specify both `curve` and `addressFormat` for each account
- Use standard BIP-44 derivation paths for each chain
- Wallet names should be descriptive and unique within the organization
- For end-user wallets, use the sub-organization model (one sub-org per user)
- Use `createWalletAccounts` to add chains to an existing wallet, not `createWallet`

## Related Skills

- `signing-transactions` for signing and broadcasting transactions across all supported chains
- `managing-policies` for setting access control on wallets
