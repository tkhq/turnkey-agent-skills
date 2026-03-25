# Import and Export Examples

## Full wallet export flow

Export retrieves the wallet's mnemonic seed phrase through an encrypted channel. The mnemonic never leaves the secure enclave unencrypted.

### Step 1: Generate an HPKE key pair (client-side, one-time setup)

Generate a P-256 HPKE key pair locally. The public key will be sent to Turnkey as the `targetPublicKey` for encrypting the export bundle. The private key stays on your machine for decryption.

### Step 2: Export the wallet

```
POST /public/v1/submit/export_wallet
```

```json
{
  "walletId": "<WALLET_ID>",
  "targetPublicKey": "<YOUR_HPKE_PUBLIC_KEY>"
}
```

Example activity response:

```json
{
  "activity": {
    "id": "act_...",
    "status": "COMPLETED",
    "type": "ACTIVITY_TYPE_EXPORT_WALLET",
    "result": {
      "exportWalletResult": {
        "exportBundle": "<ENCRYPTED_BUNDLE>"
      }
    }
  }
}
```

The `exportBundle` is encrypted with your public key. It cannot be read without the corresponding private key.

### Step 3: Decrypt the export bundle (client-side)

Client-side: decrypt the `exportBundle` using HPKE with your local private key. The decrypted result is the BIP-39 mnemonic seed phrase. Store this securely and delete any plaintext copies after use.

## Wallet account export flow

Export a single wallet account's private key. This is distinct from wallet export: it returns the raw private key for one specific address, not the entire wallet mnemonic.

Use this when:
- You need the key for just one address (e.g., migrating a single account to another system)
- You want to avoid exposing the mnemonic that can derive all accounts

### Step 1: Generate an HPKE key pair (client-side)

Same HPKE key pair setup as wallet export. If you already have a key pair, reuse it.

### Step 2: Export the wallet account

```
POST /public/v1/submit/export_wallet_account
```

```json
{
  "address": "<ACCOUNT_ADDRESS>",
  "targetPublicKey": "<YOUR_HPKE_PUBLIC_KEY>"
}
```

Example activity response:

```json
{
  "activity": {
    "id": "act_...",
    "status": "COMPLETED",
    "type": "ACTIVITY_TYPE_EXPORT_WALLET_ACCOUNT",
    "result": {
      "exportWalletAccountResult": {
        "exportBundle": "<ENCRYPTED_BUNDLE>"
      }
    }
  }
}
```

### Step 3: Decrypt the export bundle (client-side)

Client-side: decrypt the `exportBundle` using HPKE with your local private key. The decrypted result is the raw private key material.

The default output format is hexadecimal. For Solana accounts, the format is a 64-byte array containing both private and public key bytes.

### Choosing between wallet export and account export

| | export_wallet | export_wallet_account |
|---|---|---|
| Returns | BIP-39 mnemonic seed phrase | Raw private key for one address |
| Scope | All accounts derivable from the seed | Single account only |
| Use case | Full wallet backup/migration | Single account migration |
| Risk | Exposes all derived keys | Exposes only one key |

## Full wallet import flow

Import allows you to bring an existing mnemonic seed phrase into Turnkey. The mnemonic is encrypted client-side before being sent to the secure enclave.

### Step 1: Initialize import

```
POST /public/v1/submit/init_import_wallet
```

```json
{
  "userId": "<USER_ID>"
}
```

This creates a secure channel by generating a target encryption key inside the enclave. The response contains an `importBundle` with the public key you will use to encrypt the mnemonic.

### Step 2: Encrypt the mnemonic (client-side)

Client-side: encrypt your mnemonic with the target public key from the `importBundle` using HPKE. This produces an encrypted bundle. The plaintext mnemonic never leaves your machine.

### Step 3: Import the wallet

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

After import, derive accounts on the imported wallet using the `create_wallet_accounts` API endpoint.

## Key format options

When exporting or importing keys, the format determines how the key material is represented:

- **mnemonic** (default for wallets): BIP-39 seed phrase (12, 15, 18, 21, or 24 words). Used for HD wallet export and import.
- **hexadecimal** (default for private keys and wallet accounts): Raw key bytes as a hex string. Standard format for most blockchain tooling.
- **solana**: Solana-specific format that includes both the private and public key in a single 64-byte array. Required when importing or exporting keys for use with Solana tooling.
