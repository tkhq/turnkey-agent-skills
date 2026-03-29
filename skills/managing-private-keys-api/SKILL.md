---
name: managing-private-keys-api
description: "Manages standalone private keys and private key tags using the Turnkey API. Covers key creation, deletion, import, export, and tag-based grouping for policy targeting. Use when asked to 'create a private key', 'standalone key', 'private key tag', 'export private key', 'import private key', 'list private keys via API', 'delete a private key', 'tag a private key for policy', or 'create a signing key with Turnkey API'. Do NOT use for HD wallets or multi-chain address derivation (use managing-wallets-api), signing transactions or raw payloads (use signing-transactions-api)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). See managing-users-api for authentication setup."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["private-key", "api", "blockchain", "import", "export", "tags", "policy"]
---

# Managing Private Keys (API)

## Quick Start

Use the Turnkey API to create, manage, and organize standalone private keys. Always check for existing keys with `list_private_keys` before creating new ones.

Base URL: `https://api.turnkey.com`

Request bodies below show the `parameters` object for clarity. The full API envelope wraps these as: `{"type": "ACTIVITY_TYPE_...", "timestampMs": "<ms>", "organizationId": "<ORG_ID>", "parameters": { ... }}`. Query endpoints require `organizationId` in the request body.

## When to Use Private Keys vs HD Wallets

Private keys and HD wallets serve different purposes. Choose the right one before proceeding.

**Use private keys (this skill) when you need:**
- A single key generating one address for one chain
- Raw payload signing with a standalone key
- Importing an externally generated key into Turnkey
- Simple single-chain use cases where hierarchical derivation is unnecessary

**Use HD wallets (managing-wallets-api) when you need:**
- Multiple addresses derived from a single seed phrase
- Multi-chain support from one wallet (Ethereum + Solana + Bitcoin, etc.)
- BIP-44 hierarchical derivation paths
- Mnemonic backup and recovery

A private key is one key, one address. An HD wallet derives unlimited addresses from one seed.

## Prerequisites

Requires API credentials configured via the managing-users-api skill. All requests must include an `X-Stamp` header. See [references/stamping-basics.md](references/stamping-basics.md) for the lightweight stamping reference.

## Instructions

### List private keys

```
POST /public/v1/query/list_private_keys
```

```json
{}
```

Returns a `privateKeys` array. Each entry includes `privateKeyId`, `privateKeyName`, `curve`, `addresses`, `privateKeyTags`, and timestamps.

### Create private keys

Create one or more standalone keys in a single call:

```
POST /public/v1/submit/create_private_keys
```

```json
{
  "privateKeys": [
    {
      "privateKeyName": "eth-signing-key",
      "curve": "CURVE_SECP256K1",
      "privateKeyTags": [],
      "addressFormats": ["ADDRESS_FORMAT_ETHEREUM"]
    }
  ]
}
```

The response activity result contains `privateKeys` with each key's `privateKeyId` and `addresses` (format + address pairs).

### Supported Curves and Address Formats

| Chain | Curve | Address Format |
|-------|-------|----------------|
| Ethereum/EVM | CURVE_SECP256K1 | ADDRESS_FORMAT_ETHEREUM |
| Solana | CURVE_ED25519 | ADDRESS_FORMAT_SOLANA |
| Bitcoin (SegWit) | CURVE_SECP256K1 | ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH |
| Bitcoin (Taproot) | CURVE_SECP256K1 | ADDRESS_FORMAT_BITCOIN_MAINNET_P2TR |
| Cosmos | CURVE_SECP256K1 | ADDRESS_FORMAT_COSMOS |
| Aptos | CURVE_ED25519 | ADDRESS_FORMAT_APTOS |
| Sui | CURVE_ED25519 | ADDRESS_FORMAT_SUI |
| Tron | CURVE_SECP256K1 | ADDRESS_FORMAT_TRON |
| TON | CURVE_ED25519 | ADDRESS_FORMAT_TON_V4R2 |
| XRP | CURVE_SECP256K1 | ADDRESS_FORMAT_XRP |
| Stellar (XLM) | CURVE_ED25519 | ADDRESS_FORMAT_XLM |
| Dogecoin | CURVE_SECP256K1 | ADDRESS_FORMAT_DOGE_MAINNET |
| Sei | CURVE_ED25519 | ADDRESS_FORMAT_SEI |

For testnet Bitcoin, use `ADDRESS_FORMAT_BITCOIN_TESTNET_P2WPKH` or `ADDRESS_FORMAT_BITCOIN_TESTNET_P2TR`.
For TON variants, options include `ADDRESS_FORMAT_TON_V3R2` and `ADDRESS_FORMAT_TON_V5R1`.
You can specify multiple `addressFormats` per key to get addresses in multiple formats from the same key.

### Get a single private key

```
POST /public/v1/query/get_private_key
```

```json
{
  "privateKeyId": "<PRIVATE_KEY_ID>"
}
```

### Delete private keys

```
POST /public/v1/submit/delete_private_keys
```

```json
{
  "privateKeyIds": ["<PRIVATE_KEY_ID>"],
  "deleteWithoutExport": true
}
```

Set `deleteWithoutExport` to `true` to delete keys that have not been exported. If the key has already been exported, this field is ignored.

### Export a private key

Export uses an encrypted channel so the key material never leaves the secure enclave unencrypted.

**1. Call the export endpoint:**

```
POST /public/v1/submit/export_private_key
```

```json
{
  "privateKeyId": "<PRIVATE_KEY_ID>",
  "targetPublicKey": "<YOUR_HPKE_PUBLIC_KEY>"
}
```

The response contains an encrypted `exportBundle`.

**2. Client-side: decrypt the export bundle using HPKE with your local private key.** The decrypted result is the raw private key material in hexadecimal format. For Solana keys, the format is a 64-byte array containing both private and public key bytes.

### Import a private key

Import encrypts the key client-side before sending it to the secure enclave.

**1. Initialize the import:**

```
POST /public/v1/submit/init_import_private_key
```

```json
{
  "userId": "<USER_ID>"
}
```

The response contains an `importBundle` with the enclave's target public key.

**2. Client-side: encrypt your private key with the target public key from the response using HPKE.** The plaintext key never leaves your machine.

**3. Complete the import:**

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

### Manage private key tags

Tags group private keys for policy targeting. Tags let you write policies like `private_key.tags.contains('hot-wallet')` to control which keys can sign what. Without tags, you must reference keys by individual ID in every policy rule.

**List tags:**

```
POST /public/v1/query/list_private_key_tags
```

```json
{
  "organizationId": "<ORGANIZATION_ID>"
}
```

Note: The SDK requires `organizationId` to be passed explicitly for this endpoint (unlike most query endpoints that auto-inject it).

**Create a tag and attach it to keys:**

```
POST /public/v1/submit/create_private_key_tag
```

```json
{
  "privateKeyTagName": "hot-wallet",
  "privateKeyIds": ["<PRIVATE_KEY_ID_1>", "<PRIVATE_KEY_ID_2>"]
}
```

**Update a tag (rename or change key associations):**

```
POST /public/v1/submit/update_private_key_tag
```

```json
{
  "privateKeyTagId": "<TAG_ID>",
  "newPrivateKeyTagName": "cold-storage",
  "addPrivateKeyIds": ["<KEY_ID_3>"],
  "removePrivateKeyIds": ["<KEY_ID_1>"]
}
```

**Delete tags:**

```
POST /public/v1/submit/delete_private_key_tags
```

```json
{
  "privateKeyTagIds": ["<TAG_ID>"]
}
```

For complete request/response examples for all endpoints, see [references/private-key-examples.md](references/private-key-examples.md).

## Activity Response Pattern

Every submit endpoint returns an activity object:

```json
{
  "activity": {
    "id": "<ACTIVITY_ID>",
    "organizationId": "<ORG_ID>",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_PRIVATE_KEYS_V2",
    "result": { ... }
  }
}
```

Extract the endpoint-specific result from `activity.result`. For `create_private_keys`, the result contains `createPrivateKeysResultV2` with the key IDs and addresses.

## Rules

- Always check for existing keys with `POST /public/v1/query/list_private_keys` before creating new ones
- Specify both `curve` and `addressFormats` for each key when creating
- Use `privateKeyTags` (even as an empty array) when creating keys, as the field is required
- Private key names should be descriptive and unique within the organization
- Export requires a client-side HPKE key pair for encrypting the export bundle
- Import uses a three-step flow: init, client-side encrypt, then import
- Tag keys by purpose (e.g., "hot-wallet", "cold-storage", "treasury") to simplify policy management
- For end-user keys, use the sub-organization model (one sub-org per user)

## Related Skills

- Full wallet reference: `managing-wallets-api`
- Full signing reference: `signing-transactions-api`
- Full policy reference: `managing-policies-api`
- Full API key setup reference: `managing-users-api`
