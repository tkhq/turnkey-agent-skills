---
name: creating-wallets-api
description: "Creates HD wallets and derives blockchain addresses using the Turnkey API. Supports Ethereum, Solana, Bitcoin, Cosmos, Aptos, Sui, Tron, TON, XRP, Stellar, Dogecoin, Sei, and other chains. Covers wallet creation, account derivation, listing, import, and export operations. Use when asked to 'create a wallet with Turnkey API', 'POST create_wallet', 'list wallets via API', 'derive an address using the Turnkey API', 'export wallet mnemonic via API', 'import a wallet with Turnkey API', 'create a private key using Turnkey API', 'add a chain to my wallet via the API', or 'list wallet accounts using the API'. Do NOT use for signing transactions (use signing-transactions-api), managing policies (use managing-policies-api), generating API keys (use managing-credentials-api), ."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). See managing-credentials-api for authentication setup."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["wallet", "api", "blockchain", "address-derivation", "hd-wallet", "import", "export", "private-keys"]
---

# Creating Wallets (API)

## Quick Start

Use the Turnkey API to create HD wallets and derive blockchain addresses. Always check for existing wallets before creating new ones.

Base URL: `https://api.turnkey.com`

## Prerequisites

Requires API credentials configured via the managing-credentials-api skill. All requests must be signed with your P-256 key pair using Turnkey's stamp authentication.

## Instructions

### Step 1: Check for existing wallets

```
POST /public/v1/query/list_wallets
```

```json
{}
```

### Step 2: Create a wallet

Create a wallet with accounts in one call:

```
POST /public/v1/submit/create_wallet
```

```json
{
  "walletName": "my-wallet",
  "accounts": [
    {
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'/60'/0'/0/0",
      "addressFormat": "ADDRESS_FORMAT_ETHEREUM"
    },
    {
      "curve": "CURVE_ED25519",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'/501'/0'/0'",
      "addressFormat": "ADDRESS_FORMAT_SOLANA"
    }
  ],
  "mnemonicLength": 12
}
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

```
POST /public/v1/submit/create_wallet_accounts
```

```json
{
  "walletId": "<WALLET_ID>",
  "accounts": [{
    "curve": "CURVE_SECP256K1",
    "pathFormat": "PATH_FORMAT_BIP32",
    "path": "m/84'/0'/0'/0/0",
    "addressFormat": "ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH"
  }]
}
```

### Step 4: List wallet accounts

```
POST /public/v1/query/list_wallet_accounts
```

```json
{
  "walletId": "<WALLET_ID>"
}
```

### Step 5: Export a wallet (mnemonic backup)

Wallet export uses an encrypted channel so the mnemonic never leaves the secure enclave unencrypted.

**1. Call the export endpoint:**

```
POST /public/v1/submit/export_wallet
```

```json
{
  "walletId": "<WALLET_ID>",
  "targetPublicKey": "<YOUR_HPKE_PUBLIC_KEY>"
}
```

The response contains an encrypted `exportBundle`.

**2. Client-side: decrypt the export bundle using HPKE with your local private key.** The decrypted result is the BIP-39 mnemonic seed phrase. Store it securely.

### Step 6: Import a wallet

Wallet import encrypts the mnemonic client-side before sending it to the secure enclave.

**1. Initialize the import:**

```
POST /public/v1/submit/init_import_wallet
```

```json
{
  "userId": "<USER_ID>"
}
```

The response contains an `importBundle` with the enclave's target public key.

**2. Client-side: encrypt your mnemonic with the target public key from the response using HPKE.** This produces an encrypted bundle. The plaintext mnemonic never leaves your machine.

**3. Complete the import:**

```
POST /public/v1/submit/import_wallet
```

```json
{
  "userId": "<USER_ID>",
  "walletName": "imported-wallet",
  "encryptedBundle": "<ENCRYPTED_BUNDLE>",
  "accounts": []
}
```

After import, derive accounts on the imported wallet using the `create_wallet_accounts` endpoint.

For complete import/export workflows and private key operations, see [references/import-export-examples.md](references/import-export-examples.md).

For multi-chain wallet creation examples and all supported chains, see [references/wallet-api-examples.md](references/wallet-api-examples.md).

## Rules

- Always check for existing wallets with `POST /public/v1/query/list_wallets` before creating new ones
- Specify both `curve` and `addressFormat` for each account when using the API
- Use standard BIP-44 derivation paths for each chain (see table above)
- Wallet names should be descriptive and unique within the organization
- For end-user wallets, use the sub-organization model (one sub-org per user, see managing-credentials-api skill)
- Use `create_wallet_accounts` to add chains to an existing wallet, not `create_wallet`
- Export requires a client-side HPKE key pair for encrypting the export bundle
- Import uses a three-step flow: init, client-side encrypt, then import

## Related Skills

- `managing-credentials-api` for API key setup (required before wallet operations)
- `signing-transactions-api` for signing transactions with wallet addresses
- `managing-policies-api` for access control on wallets
- `setup-account-workflow` for end-to-end organization bootstrapping (install, keys, wallets, first signature)
