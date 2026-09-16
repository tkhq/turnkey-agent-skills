# Import and Export Examples

> **CLI migration:** This is retained API parameter/semantic reference material. Execute supported core operations through the commands in the parent SKILL.md and root CLI convention. SDK authentication, stamping, inline key-generation scripts, and old envelope/retry instructions below are superseded. Import/export crypto and unvalidated request bridges remain explicit gaps; this reference alone does not establish CLI completion. Existing user authorization takes precedence over blanket per-call confirmation wording in legacy examples.


Wallet import and export use HPKE (Hybrid Public Key Encryption) so that key material never leaves the secure enclave unencrypted.

**Base URL:** `https://api.turnkey.com`

## Export a wallet (mnemonic backup)

Exports the BIP-39 mnemonic seed phrase. From this mnemonic, all derived accounts can be reconstructed.

**Step 1: Call the export endpoint**

```
POST /public/v1/submit/export_wallet
```

```json
{
  "walletId": "<WALLET_ID>",
  "targetPublicKey": "<YOUR_HPKE_PUBLIC_KEY>"
}
```

`targetPublicKey` is your client-side HPKE public key. Generate an HPKE key pair locally before calling this endpoint.

**Response:**

```json
{
  "activity": {
    "result": {
      "exportWalletResult": {
        "exportBundle": "<ENCRYPTED_BUNDLE>"
      }
    }
  }
}
```

**Step 2: Decrypt client-side**

Decrypt the `exportBundle` using HPKE with your local private key. The decrypted result is the BIP-39 mnemonic seed phrase. Store it securely offline.

## Export a wallet account (single key)

Exports one account's private key, not the entire wallet mnemonic. Use this when you need the raw key for a specific address.

```
POST /public/v1/submit/export_wallet_account
```

```json
{
  "address": "<ACCOUNT_ADDRESS>",
  "targetPublicKey": "<YOUR_HPKE_PUBLIC_KEY>"
}
```

**Response:**

```json
{
  "activity": {
    "result": {
      "exportWalletAccountResult": {
        "exportBundle": "<ENCRYPTED_BUNDLE>"
      }
    }
  }
}
```

Decrypt client-side using HPKE. The result is the raw private key material in hex format. For Solana accounts, the format is a 64-byte array containing both private and public key bytes.

**Key difference:** `export_wallet` returns the mnemonic (can derive all accounts). `export_wallet_account` returns a single account's private key (just that one address).

## Import a wallet

Import encrypts the mnemonic client-side before sending it to the secure enclave. The plaintext mnemonic never leaves your machine.

**Step 1: Initialize the import**

```
POST /public/v1/submit/init_import_wallet
```

```json
{
  "userId": "<USER_ID>"
}
```

**Response:**

```json
{
  "activity": {
    "result": {
      "initImportWalletResult": {
        "importBundle": "<IMPORT_BUNDLE>"
      }
    }
  }
}
```

The `importBundle` contains the enclave's target public key for HPKE encryption.

**Step 2: Encrypt client-side**

Encrypt your BIP-39 mnemonic with the target public key from the `importBundle` using HPKE. The plaintext mnemonic never leaves your machine.

**Step 3: Complete the import**

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

After import, derive accounts on the imported wallet using `create_wallet_accounts`.

## Import a private key

The same 3-step flow applies to standalone private keys.

**Step 1: Initialize**

```
POST /public/v1/submit/init_import_private_key
```

```json
{
  "userId": "<USER_ID>"
}
```

**Step 2:** Encrypt the private key client-side with the enclave's public key from the response.

**Step 3: Complete**

```
POST /public/v1/submit/import_private_key
```

```json
{
  "userId": "<USER_ID>",
  "privateKeyName": "imported-key",
  "encryptedBundle": "<ENCRYPTED_BUNDLE>",
  "curve": "CURVE_SECP256K1",
  "addressFormats": ["ADDRESS_FORMAT_ETHEREUM"]
}
```
