---
name: creating-wallets-api
description: "Creates HD wallets and derives blockchain addresses using the Turnkey CLI and API endpoints. Supports Ethereum, Solana, Bitcoin, Cosmos, Aptos, Sui, Tron, TON, XRP, Stellar, Dogecoin, Sei, and other chains. Covers wallet creation, account derivation, listing, import, and export operations. Use when asked to 'create a wallet with turnkey CLI', 'turnkey wallets create', 'list wallets via API', 'derive an address using turnkey request', 'export wallet mnemonic via CLI', 'import a wallet with turnkey', 'create a private key using turnkey CLI', 'add a chain to my wallet via the API', or 'list wallet accounts using turnkey'. Do NOT use for signing transactions (use signing-transactions-api), managing policies (use managing-policies-api), generating API keys (use managing-credentials-api), ."
license: Apache-2.0
compatibility: "Requires turnkey CLI (brew install tkhq/tap/turnkey). Set up API keys with managing-credentials-api skill first."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["wallet", "cli", "blockchain", "address-derivation", "hd-wallet", "import", "export", "private-keys"]
---

# Creating Wallets (CLI)

## Quick Start

Use the Turnkey CLI or API endpoints to create HD wallets and derive blockchain addresses. Always check for existing wallets before creating new ones.

## Prerequisites

```bash
brew install tkhq/tap/turnkey
```

Requires API keys configured via `turnkey generate api-key` (see managing-credentials-api skill).

## Instructions

### Step 1: Check for existing wallets

```bash
# CLI shortcut
turnkey wallets list --key-name default

# API endpoint
turnkey request --path /public/v1/query/list_wallets --body '{}'
```

### Step 2: Create a wallet

```bash
# CLI shortcut (creates wallet, then add accounts separately)
turnkey wallets create --name my-wallet

# API endpoint (create wallet with accounts in one call)
turnkey request --path /public/v1/submit/create_wallet --body '{
  "walletName": "my-wallet",
  "accounts": [
    {
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'\''/'60'\''/'0'\''/'0/0",
      "addressFormat": "ADDRESS_FORMAT_ETHEREUM"
    },
    {
      "curve": "CURVE_ED25519",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'\''/'501'\''/'0'\''/'0'\''",
      "addressFormat": "ADDRESS_FORMAT_SOLANA"
    }
  ],
  "mnemonicLength": 12
}'
```

### Supported Address Formats

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

Note: Sei uses Ed25519 with the Cosmos coin type (118). This differs from other Cosmos chains which use secp256k1. Verify this matches your Sei deployment, as Sei v2 EVM addresses use secp256k1 with Ethereum format instead.

For testnet Bitcoin, use `ADDRESS_FORMAT_BITCOIN_TESTNET_P2WPKH` or `ADDRESS_FORMAT_BITCOIN_TESTNET_P2TR`.
For TON variants, options include `ADDRESS_FORMAT_TON_V3R2` and `ADDRESS_FORMAT_TON_V4R2`.

### Step 3: Add accounts to an existing wallet

```bash
# CLI shortcut
turnkey wallets accounts create --wallet my-wallet --address-format ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH

# API endpoint
turnkey request --path /public/v1/submit/create_wallet_accounts --body '{
  "walletId": "<WALLET_ID>",
  "accounts": [{
    "curve": "CURVE_SECP256K1",
    "pathFormat": "PATH_FORMAT_BIP32",
    "path": "m/84'\''/'0'\''/'0'\''/'0/0",
    "addressFormat": "ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH"
  }]
}'
```

### Step 4: List wallet accounts

```bash
# CLI shortcut
turnkey wallets accounts list --wallet my-wallet

# API endpoint
turnkey request --path /public/v1/query/list_wallet_accounts --body '{"walletId": "<WALLET_ID>"}'
```

### Step 5: Export a wallet (mnemonic backup)

```bash
turnkey wallets export --name my-wallet --export-bundle-output export-bundle.txt --encryption-key-name default
```

The export bundle is encrypted. Decrypt with:

```bash
turnkey decrypt --export-bundle-input export-bundle.txt --plaintext-output mnemonic.txt
```

### Step 6: Import a wallet

```bash
# Step 1: Initialize import
turnkey wallets init-import --user $USER_ID --import-bundle-output import-bundle.txt

# Step 2: Encrypt the mnemonic
turnkey encrypt --import-bundle-input import-bundle.txt --plaintext-input mnemonic.txt --encrypted-bundle-output encrypted-bundle.txt --user $USER_ID

# Step 3: Import
turnkey wallets import --user $USER_ID --name imported-wallet --encrypted-bundle-input encrypted-bundle.txt
```

For complete import/export workflows and private key operations, see [references/import-export-examples.md](references/import-export-examples.md).

For multi-chain wallet creation examples and all supported chains, see [references/wallet-cli-examples.md](references/wallet-cli-examples.md).

## Rules

- Always check for existing wallets with `turnkey wallets list` before creating new ones
- Specify both `curve` and `addressFormat` for each account when using the API endpoint
- Use standard BIP-44 derivation paths for each chain (see table above)
- Wallet names should be descriptive and unique within the organization
- For end-user wallets, use the sub-organization model (one sub-org per user, see managing-credentials-api skill)
- Use `create_wallet_accounts` to add chains to an existing wallet, not `create_wallet`
- Export requires an encryption key (generate one first with `turnkey generate encryption-key`)
- When using `turnkey request`, shell-escape single quotes in derivation paths with `'\''`

## Related Skills

- `managing-credentials-api` for API key setup (required before wallet operations)
- `signing-transactions-api` for signing transactions with wallet addresses
- `managing-policies-api` for access control on wallets
- `setup-account-workflow` for end-to-end organization bootstrapping (install, keys, wallets, first signature)
