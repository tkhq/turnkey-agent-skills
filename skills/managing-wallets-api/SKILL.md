---
name: managing-wallets-api
description: "Manages HD wallets and their derived blockchain accounts using the Turnkey HTTP API. Covers the full wallet lifecycle: creation, querying, updating, deletion, account derivation, and import/export of wallet mnemonics and individual account keys. Supports Ethereum, Solana, Bitcoin, Cosmos, Aptos, Sui, Tron, TON, XRP, Stellar, Dogecoin, Sei, and other chains. Use when asked to 'create a wallet with Turnkey API', 'POST create_wallet', 'list wallets via API', 'get wallet details', 'update wallet name', 'delete a wallet via the API', 'derive an address using the Turnkey API', 'export wallet mnemonic via API', 'export a wallet account private key', 'import a wallet with Turnkey API', 'add a chain to my wallet via the API', 'list wallet accounts using the API', or 'get a specific wallet account'. Do NOT use for standalone private keys (use managing-private-keys-api). Do NOT use for signing transactions (use signing-transactions-api). Do NOT use for managing policies (use managing-policies-api)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). See managing-users-api for authentication setup."
metadata:
  version: "2.0.0"
  author: turnkey
  tags: ["wallet", "api", "blockchain", "address-derivation", "hd-wallet", "import", "export", "wallet-accounts"]
---

# Managing Wallets (API)

## Quick Start

Use the Turnkey API to manage HD wallets and their derived blockchain accounts. HD wallets derive unlimited addresses from a single seed phrase. For single-purpose keys (one key, one address), use the managing-private-keys-api skill instead.

Base URL: `https://api.turnkey.com`

Request bodies below show the `parameters` object for clarity. The full API envelope wraps these as: `{"type": "ACTIVITY_TYPE_...", "timestampMs": "<ms>", "organizationId": "<ORG_ID>", "parameters": { ... }}`. Query endpoints require `organizationId` in the request body.

Every submit endpoint returns an activity object: `{ activity: { id, status, type, result } }`. Check `activity.status` for completion. Possible statuses: `COMPLETED`, `FAILED`, `CONSENSUS_NEEDED` (requires multi-party approval), `PENDING`.

## Prerequisites

Requires API credentials configured via the managing-users-api skill. All requests must be signed with your P-256 key pair using Turnkey's stamp authentication.

## Instructions

### Query Wallets

**List all wallets:**

```
POST /public/v1/query/list_wallets
```

```json
{}
```

**Get a single wallet by ID:**

Use this to inspect a specific wallet's details (name, creation time, accounts) without fetching the full list.

```
POST /public/v1/query/get_wallet
```

```json
{
  "walletId": "<WALLET_ID>"
}
```

### Create a Wallet

Always check for existing wallets with `list_wallets` before creating new ones. Create a wallet with accounts in one call:

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

The activity result contains `walletId` and an `addresses` array with the derived addresses.

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

Note: Sei uses Ed25519 with the Cosmos coin type (118). Sei v2 EVM addresses use secp256k1 with Ethereum format instead.

For testnet Bitcoin, use `ADDRESS_FORMAT_BITCOIN_TESTNET_P2WPKH` or `ADDRESS_FORMAT_BITCOIN_TESTNET_P2TR`.
For TON variants, options include `ADDRESS_FORMAT_TON_V3R2` and `ADDRESS_FORMAT_TON_V4R2`.

### Update a Wallet

Rename a wallet or modify its metadata:

```
POST /public/v1/submit/update_wallet
```

```json
{
  "walletId": "<WALLET_ID>",
  "walletName": "renamed-wallet"
}
```

### Delete Wallets

Delete one or more wallets by ID. This is a batch operation that permanently removes wallets and all their derived accounts.

```
POST /public/v1/submit/delete_wallets
```

```json
{
  "walletIds": ["<WALLET_ID_1>", "<WALLET_ID_2>"]
}
```

### Manage Wallet Accounts

**Add accounts to an existing wallet:**

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

**List all accounts in a wallet:**

```
POST /public/v1/query/list_wallet_accounts
```

```json
{
  "walletId": "<WALLET_ID>"
}
```

**Get a single account by address or ID:**

Use this to inspect one account without listing all accounts in the wallet.

```
POST /public/v1/query/get_wallet_account
```

```json
{
  "address": "<ADDRESS>"
}
```

You can also query by `walletAccountId` instead of `address`.

**Delete accounts from a wallet:**

```
POST /public/v1/submit/delete_wallet_accounts
```

```json
{
  "walletAccountIds": ["<ACCOUNT_ID_1>", "<ACCOUNT_ID_2>"]
}
```

### Export a Wallet (Mnemonic Backup)

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

### Export a Wallet Account (Single Key)

This exports a single account's private key, not the entire wallet mnemonic. Use this when you need the raw key for one specific address.

```
POST /public/v1/submit/export_wallet_account
```

```json
{
  "address": "<ACCOUNT_ADDRESS>",
  "targetPublicKey": "<YOUR_HPKE_PUBLIC_KEY>"
}
```

The response contains an encrypted `exportBundle`. Decrypt it client-side using HPKE. The result is the raw private key material (hex format by default, or Solana 64-byte format for Solana accounts).

**Key difference:** `export_wallet` returns the BIP-39 mnemonic (can derive all accounts). `export_wallet_account` returns a single account's private key (just that one address).

### Import a Wallet

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

**2. Client-side: encrypt your mnemonic with the target public key from the response using HPKE.** The plaintext mnemonic never leaves your machine.

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

For complete import/export workflows with code examples, see [references/import-export-examples.md](references/import-export-examples.md).

For multi-chain wallet creation examples and all supported chains, see [references/wallet-api-examples.md](references/wallet-api-examples.md).

## Rules

- Always check for existing wallets with `POST /public/v1/query/list_wallets` before creating new ones
- Use `get_wallet` or `get_wallet_account` to inspect specific resources instead of listing everything
- Specify both `curve` and `addressFormat` for each account when using the API
- Use standard BIP-44 derivation paths for each chain (see table above)
- Wallet names should be descriptive and unique within the organization
- For end-user wallets, use the sub-organization model (one sub-org per user, see managing-users-api skill)
- Use `create_wallet_accounts` to add chains to an existing wallet, not `create_wallet`
- Export requires a client-side HPKE key pair for encrypting the export bundle
- Import uses a three-step flow: init, client-side encrypt, then import
- `export_wallet` returns the mnemonic (derives all keys). `export_wallet_account` returns one account's private key. Choose based on your use case.
- `delete_wallets` and `delete_wallet_accounts` are permanent. Verify wallet IDs before calling.

## Related Skills

- `managing-users-api` for API key setup and authentication (required before wallet operations)
- `managing-private-keys-api` for standalone private keys (single-purpose keys not derived from an HD wallet)
- `signing-transactions-api` for signing transactions with wallet addresses
- `managing-policies-api` for access control on wallets
- `setup-account-workflow` for end-to-end organization bootstrapping (install, keys, wallets, first signature)
