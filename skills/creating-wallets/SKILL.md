---
name: creating-wallets
description: "Creates HD wallets and derives blockchain addresses for Ethereum, Solana, Bitcoin, Cosmos, and other chains using Turnkey's secure enclave infrastructure. Use when asked to 'create a wallet', 'set up a wallet', 'get a blockchain address', 'derive an address', 'check if I have a wallet', or 'list my wallets'."
license: Apache-2.0
compatibility: "Requires Node.js. Install @turnkey/sdk-server. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars."
metadata:
  version: "1.0.0"
  tags: ["wallet", "blockchain", "address-derivation", "hd-wallet"]
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
| Aptos | CURVE_ED25519 | m/44'/637'/0'/0'/0' | ADDRESS_FORMAT_APTOS |
| Sui | CURVE_ED25519 | m/44'/784'/0'/0'/0' | ADDRESS_FORMAT_SUI |
| Tron | CURVE_SECP256K1 | m/44'/195'/0'/0/0 | ADDRESS_FORMAT_TRON |

For testnet Bitcoin, use `ADDRESS_FORMAT_BITCOIN_TESTNET_P2WPKH` or `ADDRESS_FORMAT_BITCOIN_TESTNET_P2TR`.

### Step 4: Derive additional addresses later

```typescript
const newAccounts = await client.createWalletAccounts({
  walletId: wallet.walletId,
  accounts: [
    { curve: "CURVE_SECP256K1", pathFormat: "PATH_FORMAT_BIP32", path: "m/84'/0'/0'/0/0", addressFormat: "ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH" },
  ],
});
```

For complete examples including multi-chain wallet bootstrap, see [references/wallet-examples.md](references/wallet-examples.md).

## Rules

- NEVER call `createWallet` without first calling `getWallets` to check for existing wallets
- Always specify both `curve` and `addressFormat` for each account
- Use standard BIP-44 derivation paths for each chain
- Wallet names should be descriptive and unique within the organization

## Related Skills

- `signing-ethereum` for signing transactions with derived Ethereum addresses
- `signing-solana` for signing Solana transactions
- `signing-bitcoin` for signing Bitcoin transactions
- `managing-policies` for setting access control on wallets
