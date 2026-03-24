# Import and Export Examples

## Full wallet export flow

Export retrieves the wallet's mnemonic seed phrase through an encrypted channel. The mnemonic never leaves the secure enclave unencrypted.

### Step 1: Generate an encryption key (one-time setup)

```bash
turnkey generate encryption-key --name default
```

This creates a local key pair. The public portion is registered with Turnkey, and the private portion stays on your machine for decrypting export bundles.

### Step 2: Export the wallet

```bash
turnkey wallets export --name my-wallet --export-bundle-output export-bundle.txt --encryption-key-name default
```

The output file (`export-bundle.txt`) contains the mnemonic encrypted with your public key. It cannot be read without the corresponding private key.

### Step 3: Decrypt the export bundle

```bash
turnkey decrypt --export-bundle-input export-bundle.txt --plaintext-output mnemonic.txt
```

The decrypted mnemonic is written to `mnemonic.txt`. Store this securely and delete the file after use.

## Full wallet import flow

Import allows you to bring an existing mnemonic seed phrase into Turnkey. The mnemonic is encrypted client-side before being sent to the secure enclave.

### Step 1: Initialize import

```bash
turnkey wallets init-import --user $USER_ID --import-bundle-output import-bundle.txt
```

This creates a secure channel by generating a target encryption key inside the enclave. The import bundle contains the public key you will use to encrypt the mnemonic.

### Step 2: Encrypt the mnemonic

```bash
turnkey encrypt --import-bundle-input import-bundle.txt --plaintext-input mnemonic.txt --encrypted-bundle-output encrypted-bundle.txt --user $USER_ID
```

This encrypts your mnemonic with the enclave's public key. The plaintext mnemonic never leaves your machine.

### Step 3: Import the wallet

```bash
turnkey wallets import --user $USER_ID --name imported-wallet --encrypted-bundle-input encrypted-bundle.txt
```

After import, derive accounts on the imported wallet using `turnkey wallets accounts create` or the `create_wallet_accounts` API endpoint.

## Private key export flow

Export a standalone private key (not an HD wallet) for backup or migration.

```bash
# Generate encryption key if you have not already
turnkey generate encryption-key --name default

# Export the private key
turnkey private-keys export --name my-signing-key --export-bundle-output pk-export-bundle.txt --encryption-key-name default

# Decrypt to get the raw private key
turnkey decrypt --export-bundle-input pk-export-bundle.txt --plaintext-output private-key.txt
```

The default output format is hexadecimal. For Solana keys, use the `--key-format solana` flag during export.

## Private key import flow

Import an existing private key into Turnkey.

```bash
# Step 1: Initialize import
turnkey private-keys init-import --user $USER_ID --import-bundle-output pk-import-bundle.txt

# Step 2: Encrypt the private key
turnkey encrypt --import-bundle-input pk-import-bundle.txt --plaintext-input private-key.txt --encrypted-bundle-output pk-encrypted-bundle.txt --user $USER_ID

# Step 3: Import
turnkey private-keys import --user $USER_ID --name imported-key --encrypted-bundle-input pk-encrypted-bundle.txt --curve CURVE_SECP256K1 --address-format ADDRESS_FORMAT_ETHEREUM
```

## Key format options

When exporting or importing keys, the format determines how the key material is represented:

- **mnemonic** (default for wallets): BIP-39 seed phrase (12, 15, 18, 21, or 24 words). Used for HD wallet export and import.
- **hexadecimal** (default for private keys): Raw key bytes as a hex string. Standard format for most blockchain tooling.
- **solana**: Solana-specific format that includes both the private and public key in a single 64-byte array. Required when importing or exporting keys for use with Solana CLI tools.

When importing a Solana private key, specify the key format:

```bash
turnkey private-keys import --user $USER_ID --name solana-key --encrypted-bundle-input encrypted-bundle.txt --curve CURVE_ED25519 --address-format ADDRESS_FORMAT_SOLANA --key-format solana
```
