# Private Key Examples

Complete request/response examples for all private key operations.

**Base URL:** `https://api.turnkey.com`

## Create multiple keys (different curves)

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

**Response:**

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

A single key can produce addresses in multiple formats if they share the same curve:

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

Creates one key with both an Ethereum and a Cosmos address derived from the same key material.

## List private keys

```
POST /public/v1/query/list_private_keys
```

```json
{
  "organizationId": "<ORG_ID>"
}
```

**Response:**

```json
{
  "privateKeys": [
    {
      "privateKeyId": "pk_...",
      "privateKeyName": "eth-hot-wallet",
      "curve": "CURVE_SECP256K1",
      "addresses": [
        {
          "format": "ADDRESS_FORMAT_ETHEREUM",
          "address": "0x1234...abcd"
        }
      ],
      "privateKeyTags": ["hot-wallet"],
      "createdAt": { "seconds": "1700000000", "nanos": "0" },
      "updatedAt": { "seconds": "1700000000", "nanos": "0" }
    }
  ]
}
```

## Get a single private key

```
POST /public/v1/query/get_private_key
```

```json
{
  "organizationId": "<ORG_ID>",
  "privateKeyId": "pk_..."
}
```

## Tag management

### Create a tag and attach to keys

```
POST /public/v1/submit/create_private_key_tag
```

```json
{
  "privateKeyTagName": "treasury",
  "privateKeyIds": ["pk_abc123", "pk_def456"]
}
```

After tagging, policies can reference the group:

```
private_key.tags.contains('treasury')
```

Any key added to or removed from the tag automatically updates policy scope.

### Reassign keys between tags

Remove from one tag:

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

Add to another:

```json
{
  "privateKeyTagId": "tag_cold_storage",
  "newPrivateKeyTagName": "cold-storage",
  "addPrivateKeyIds": ["pk_abc123"],
  "removePrivateKeyIds": []
}
```

### List tags

```
POST /public/v1/query/list_private_key_tags
```

```json
{
  "organizationId": "<ORG_ID>"
}
```

### Delete tags

Removes the tag association, not the keys themselves:

```
POST /public/v1/submit/delete_private_key_tags
```

```json
{
  "privateKeyTagIds": ["tag_old_group"]
}
```

## Export a private key (HPKE)

### Step 1: Export

```
POST /public/v1/submit/export_private_key
```

```json
{
  "privateKeyId": "pk_abc123",
  "targetPublicKey": "04a1b2c3d4..."
}
```

**Response:**

```json
{
  "activity": {
    "result": {
      "exportPrivateKeyResult": {
        "exportBundle": "eyJ0eXAi..."
      }
    }
  }
}
```

### Step 2: Decrypt client-side

Decrypt `exportBundle` using HPKE with your local private key. Output format:
- **Default:** Raw key bytes as hex
- **Solana:** 64-byte array (private + public key bytes)

## Import a private key (HPKE)

### Step 1: Initialize

```
POST /public/v1/submit/init_import_private_key
```

```json
{
  "userId": "usr_abc123"
}
```

**Response:**

```json
{
  "activity": {
    "result": {
      "initImportPrivateKeyResult": {
        "importBundle": "eyJ0eXAi..."
      }
    }
  }
}
```

### Step 2: Encrypt client-side

Encrypt your raw private key with the enclave's public key from `importBundle` using HPKE.

### Step 3: Complete

```
POST /public/v1/submit/import_private_key
```

For Ethereum:

```json
{
  "userId": "usr_abc123",
  "privateKeyName": "imported-eth-key",
  "encryptedBundle": "eyJ0eXAi...",
  "curve": "CURVE_SECP256K1",
  "addressFormats": ["ADDRESS_FORMAT_ETHEREUM"]
}
```

For Solana:

```json
{
  "userId": "usr_abc123",
  "privateKeyName": "imported-sol-key",
  "encryptedBundle": "eyJ0eXAi...",
  "curve": "CURVE_ED25519",
  "addressFormats": ["ADDRESS_FORMAT_SOLANA"]
}
```

## Delete private keys

**Setting `deleteWithoutExport: true` permanently destroys key material — any funds at the key's address become irrecoverable.**

```
POST /public/v1/submit/delete_private_keys
```

```json
{
  "privateKeyIds": ["pk_abc123"],
  "deleteWithoutExport": true
}
```

With `deleteWithoutExport: false` (default), deletion is blocked if the key has never been exported.
