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

The response contains an `exportBundle` encrypted with your public key. It cannot be read without the corresponding private key.

### Step 3: Decrypt the export bundle (client-side)

Client-side: decrypt the `exportBundle` using HPKE with your local private key. The decrypted result is the BIP-39 mnemonic seed phrase. Store this securely and delete any plaintext copies after use.

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

## Private key export flow

Export a standalone private key (not an HD wallet) for backup or migration.

### Step 1: Generate an HPKE key pair (client-side)

Generate a P-256 HPKE key pair locally if you have not already. The public key is your `targetPublicKey`.

### Step 2: Export the private key

```
POST /public/v1/submit/export_private_key
```

```json
{
  "privateKeyId": "<PRIVATE_KEY_ID>",
  "targetPublicKey": "<YOUR_HPKE_PUBLIC_KEY>"
}
```

### Step 3: Decrypt the export bundle (client-side)

Client-side: decrypt the `exportBundle` using HPKE with your local private key. The decrypted result is the raw private key material.

The default output format is hexadecimal. For Solana keys, the format is a 64-byte array containing both private and public key bytes.

## Private key import flow

Import an existing private key into Turnkey.

### Step 1: Initialize import

```
POST /public/v1/submit/init_import_private_key
```

```json
{
  "userId": "<USER_ID>"
}
```

### Step 2: Encrypt the private key (client-side)

Client-side: encrypt your private key with the target public key from the `importBundle` using HPKE. This produces an encrypted bundle. The plaintext key never leaves your machine.

### Step 3: Import the private key

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

## Key format options

When exporting or importing keys, the format determines how the key material is represented:

- **mnemonic** (default for wallets): BIP-39 seed phrase (12, 15, 18, 21, or 24 words). Used for HD wallet export and import.
- **hexadecimal** (default for private keys): Raw key bytes as a hex string. Standard format for most blockchain tooling.
- **solana**: Solana-specific format that includes both the private and public key in a single 64-byte array. Required when importing or exporting keys for use with Solana CLI tools.

When importing a Solana private key, specify the appropriate curve and address format:

```
POST /public/v1/submit/import_private_key
```

```json
{
  "userId": "<USER_ID>",
  "privateKeyName": "solana-key",
  "encryptedBundle": "<ENCRYPTED_BUNDLE>",
  "curve": "CURVE_ED25519",
  "addressFormats": ["ADDRESS_FORMAT_SOLANA"]
}
```
