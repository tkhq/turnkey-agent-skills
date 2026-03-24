# Private Key Examples

## Multi-key creation (different curves)

Create an Ethereum key and a Solana key in one call:

```
POST /public/v1/submit/create_private_keys
```

```json
{
  "privateKeys": [
    {
      "privateKeyName": "eth-hot-wallet",
      "curve": "CURVE_SECP256K1",
      "privateKeyTags": ["hot-wallet"],
      "addressFormats": ["ADDRESS_FORMAT_ETHEREUM"]
    },
    {
      "privateKeyName": "sol-hot-wallet",
      "curve": "CURVE_ED25519",
      "privateKeyTags": ["hot-wallet"],
      "addressFormats": ["ADDRESS_FORMAT_SOLANA"]
    }
  ]
}
```

The response activity result contains `createPrivateKeysResultV2`:

```json
{
  "activity": {
    "id": "act_...",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_PRIVATE_KEYS_V2",
    "result": {
      "createPrivateKeysResultV2": {
        "privateKeys": [
          {
            "privateKeyId": "pk_...",
            "addresses": [
              {
                "format": "ADDRESS_FORMAT_ETHEREUM",
                "address": "0x1234...abcd"
              }
            ]
          },
          {
            "privateKeyId": "pk_...",
            "addresses": [
              {
                "format": "ADDRESS_FORMAT_SOLANA",
                "address": "7nYB...xQ3z"
              }
            ]
          }
        ]
      }
    }
  }
}
```

## Multi-format key (one key, multiple addresses)

A single key on the same curve can produce addresses in multiple formats:

```json
{
  "privateKeys": [
    {
      "privateKeyName": "multi-format-key",
      "curve": "CURVE_SECP256K1",
      "privateKeyTags": [],
      "addressFormats": [
        "ADDRESS_FORMAT_ETHEREUM",
        "ADDRESS_FORMAT_COSMOS"
      ]
    }
  ]
}
```

This creates one key with both an Ethereum and a Cosmos address derived from the same key material.

## Tag management workflow

### Create tags for policy targeting

Create a tag and assign it to existing keys:

```
POST /public/v1/submit/create_private_key_tag
```

```json
{
  "privateKeyTagName": "treasury",
  "privateKeyIds": ["pk_abc123", "pk_def456"]
}
```

### Use tags in policies

After tagging, you can write a policy condition that targets all keys in the group:

```
private_key.tags.contains('treasury')
```

This means any policy rule referencing the "treasury" tag automatically applies to all keys with that tag. When you add or remove keys from the tag, the policy scope updates without editing the policy itself.

### Reassign keys between tags

Move a key from one purpose to another by updating both tags:

```
POST /public/v1/submit/update_private_key_tag
```

```json
{
  "privateKeyTagId": "tag_treasury",
  "newPrivateKeyTagName": "treasury",
  "addPrivateKeyIds": [],
  "removePrivateKeyIds": ["pk_abc123"]
}
```

Then add it to the new tag:

```json
{
  "privateKeyTagId": "tag_cold_storage",
  "newPrivateKeyTagName": "cold-storage",
  "addPrivateKeyIds": ["pk_abc123"],
  "removePrivateKeyIds": []
}
```

### Delete tags

Deleting a tag removes the association but does not delete the keys themselves:

```
POST /public/v1/submit/delete_private_key_tags
```

```json
{
  "privateKeyTagIds": ["tag_old_group"]
}
```

## Private key export flow (HPKE)

Export retrieves raw key material through an encrypted channel. The key never leaves the secure enclave unencrypted.

### 1. Generate an HPKE key pair (client-side, one-time setup)

Generate a P-256 HPKE key pair locally. The public key will be your `targetPublicKey`. The private key stays on your machine for decryption.

### 2. Export the private key

```
POST /public/v1/submit/export_private_key
```

```json
{
  "privateKeyId": "pk_abc123",
  "targetPublicKey": "04a1b2c3d4..."
}
```

The response activity result contains:

```json
{
  "exportPrivateKeyResult": {
    "exportBundle": "eyJ0eXAi..."
  }
}
```

### 3. Decrypt the export bundle (client-side)

Decrypt the `exportBundle` using HPKE with your local private key. The output format depends on the key type:

- **Default (hex):** Raw key bytes as a hexadecimal string. Works with most blockchain tooling.
- **Solana:** 64-byte array containing both private and public key bytes. Required for Solana CLI tools.

## Private key import flow (HPKE)

Import brings an externally generated key into Turnkey. The plaintext key is encrypted client-side before transmission.

### 1. Initialize the import

```
POST /public/v1/submit/init_import_private_key
```

```json
{
  "userId": "usr_abc123"
}
```

The response contains:

```json
{
  "initImportPrivateKeyResult": {
    "importBundle": "eyJ0eXAi..."
  }
}
```

The `importBundle` contains the enclave's target public key and a signature for MITM protection.

### 2. Encrypt the key (client-side)

Encrypt your raw private key with the target public key from the `importBundle` using HPKE. The plaintext key never leaves your machine.

### 3. Complete the import

```
POST /public/v1/submit/import_private_key
```

For an Ethereum key:

```json
{
  "userId": "usr_abc123",
  "privateKeyName": "imported-eth-key",
  "encryptedBundle": "eyJ0eXAi...",
  "curve": "CURVE_SECP256K1",
  "addressFormats": ["ADDRESS_FORMAT_ETHEREUM"]
}
```

For a Solana key:

```json
{
  "userId": "usr_abc123",
  "privateKeyName": "imported-sol-key",
  "encryptedBundle": "eyJ0eXAi...",
  "curve": "CURVE_ED25519",
  "addressFormats": ["ADDRESS_FORMAT_SOLANA"]
}
```

## Standalone key vs HD wallet comparison

| Feature | Standalone Private Key | HD Wallet |
|---------|----------------------|-----------|
| Creation | `create_private_keys` | `create_wallet` |
| Key source | Single random key | Derived from BIP-39 seed |
| Addresses | One address per format | Unlimited via derivation paths |
| Backup | Export raw key (hex) | Export mnemonic phrase |
| Multi-chain | One key, one curve | One seed, many chains |
| Best for | Single-purpose signing, imported keys | Multi-chain apps, user wallets |
| Tags | Supported via `privateKeyTags` | Use wallet-level organization |
| Derivation paths | None (standalone) | BIP-44 standard paths |

**When to use standalone keys:**
- You have an existing key from another system that you need to import
- You need a single signing key for a specific operation (e.g., oracle signer, relayer key)
- You want direct control over one key without seed phrase management

**When to use HD wallets:**
- You need addresses on multiple chains from one backup
- You are building an embedded wallet product for end users
- You want BIP-44 compatible derivation for interoperability

## Delete with export guard

The `deleteWithoutExport` field on `delete_private_keys` controls whether Turnkey allows deleting a key that has never been exported:

```json
{
  "privateKeyIds": ["pk_abc123"],
  "deleteWithoutExport": true
}
```

- `deleteWithoutExport: true` allows deleting the key even if it was never exported (no backup exists)
- `deleteWithoutExport: false` (or omitted) blocks deletion of keys that have not been exported, preventing accidental loss of unrecoverable key material

Deletion is permanent. Deleted keys cannot be recovered regardless of this setting.
