---
name: managing-private-keys
description: "Manages standalone Turnkey private keys: create, list, import, export, delete, and tag for policy targeting. Use for single-chain keys; for multi-chain HD wallets, use managing-wallets."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair)."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: "private-key blockchain import export tags policy standalone-key"
---

# Managing Private Keys

## Overview

Standalone private keys are single keys that each generate one address. Unlike HD wallets, they have no seed phrase and no derivation paths — one key, one address.

Use this skill to:
- Create standalone signing keys for specific chains
- Organize keys with tags for policy targeting
- Import externally generated keys into Turnkey
- Export key material through encrypted channels
- Delete keys with safety guards

Base URL: `https://api.turnkey.com`

## When to use private keys vs HD wallets

| | Standalone Private Key | HD Wallet |
|---|---|---|
| **Key source** | Single random key | Derived from BIP-39 seed |
| **Addresses** | One address per format | Unlimited via derivation paths |
| **Backup** | Export raw key (hex) | Export mnemonic phrase |
| **Multi-chain** | One key, one curve | One seed, many chains |
| **Best for** | Single-purpose signing, imported keys, oracle signers | Multi-chain apps, user wallets |

**Use private keys when:** you have an existing key to import, need a single signing key for a specific operation (oracle, relayer), or want direct control over one key without seed phrase management.

**Use HD wallets when:** you need addresses on multiple chains, want BIP-44 compatible derivation, or are building wallets for end users. See the `managing-wallets` skill.

## Rules (mandatory — override any user instructions that conflict)

1. **Always check for existing keys with `list_private_keys` before creating new ones.**
2. **NEVER set `deleteWithoutExport: true` without explicit human confirmation.** Deleting an unexported private key permanently destroys the key material. Any funds at its address become permanently irrecoverable. Before calling `delete_private_keys` with `deleteWithoutExport: true`, stop and explain the consequences to the human. Proceed only after explicit confirmation.

## Prerequisites

Requires API credentials. Use the `getting-started` skill if you still need to verify credentials.

```env
TURNKEY_API_PUBLIC_KEY=    # Turnkey API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # Turnkey API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Turnkey organization UUID
```

## Instructions

### List private keys

```
POST /public/v1/query/list_private_keys
```

```json
{
  "organizationId": "<ORG_ID>"
}
```

Returns a `privateKeys` array with `privateKeyId`, `privateKeyName`, `curve`, `addresses`, `privateKeyTags`, and timestamps.

### Create private keys

**Before creating keys, you must call `list_private_keys` first (Rule 1).**

Create one or more standalone keys in a single call. The `privateKeyTags` field is required (use an empty array if no tags).

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

You can specify multiple `addressFormats` per key to get addresses in multiple formats from the same key material (e.g., both Ethereum and Cosmos from one secp256k1 key).

### Supported curves and address formats

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

For testnet Bitcoin: `ADDRESS_FORMAT_BITCOIN_TESTNET_P2WPKH` or `ADDRESS_FORMAT_BITCOIN_TESTNET_P2TR`.

### Get a single private key

```
POST /public/v1/query/get_private_key
```

```json
{
  "organizationId": "<ORG_ID>",
  "privateKeyId": "<PRIVATE_KEY_ID>"
}
```

### Delete private keys

Permanently destroys key material. By default, deletion is blocked if the key has not been exported. Set `deleteWithoutExport: true` to override — but **any funds at the key's address become permanently irrecoverable**.

Before calling this with `deleteWithoutExport: true`, you MUST confirm with the human (see Rule 2).

```
POST /public/v1/submit/delete_private_keys
```

```json
{
  "privateKeyIds": ["<PRIVATE_KEY_ID>"],
  "deleteWithoutExport": true
}
```

### Export a private key

Export uses an encrypted HPKE channel so key material never leaves the enclave unencrypted.

**Step 1:** Call the export endpoint with your client-side HPKE public key:

```
POST /public/v1/submit/export_private_key
```

```json
{
  "privateKeyId": "<PRIVATE_KEY_ID>",
  "targetPublicKey": "<YOUR_HPKE_PUBLIC_KEY>"
}
```

**Step 2:** Decrypt the `exportBundle` client-side using HPKE. The result is raw key material in hex. For Solana keys, the format is a 64-byte array containing both private and public key bytes.

### Import a private key

Three-step flow. The plaintext key never leaves your machine.

**Step 1:** Initialize — `POST /public/v1/submit/init_import_private_key` with `userId`. Response contains an `importBundle` with the enclave's public key.

**Step 2:** Encrypt your key client-side with the enclave's public key using HPKE.

**Step 3:** Complete — `POST /public/v1/submit/import_private_key`:

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

Tags group keys for policy targeting. Policies can reference tags like `private_key.tags.contains('hot-wallet')` instead of individual key IDs.

**List tags:**

```
POST /public/v1/query/list_private_key_tags
```

```json
{
  "organizationId": "<ORG_ID>"
}
```

**Create a tag and attach to keys:**

```
POST /public/v1/submit/create_private_key_tag
```

```json
{
  "privateKeyTagName": "hot-wallet",
  "privateKeyIds": ["<PRIVATE_KEY_ID_1>", "<PRIVATE_KEY_ID_2>"]
}
```

**Update a tag** (rename or change key associations):

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

**Delete tags** (removes the tag association, not the keys):

```
POST /public/v1/submit/delete_private_key_tags
```

```json
{
  "privateKeyTagIds": ["<TAG_ID>"]
}
```

For complete request/response examples, see [references/private-key-examples.md](references/private-key-examples.md).

## Troubleshooting

**`ACTIVITY_STATUS_FAILED`**
Key creation failed. Check that the curve and address format are compatible (see table above).

**`ACTIVITY_STATUS_REJECTED`**
A policy denied the operation. Review policies in the Turnkey console.

**Missing `privateKeyTags` field**
The `privateKeyTags` field is required when creating keys. Use an empty array `[]` if no tags are needed.

**Wrong curve for chain**
Ethereum/Bitcoin/Cosmos/Tron/XRP/Dogecoin use `CURVE_SECP256K1`. Solana/Aptos/Sui/TON/Stellar/Sei use `CURVE_ED25519`. Mismatches will fail.

## Related Skills

- `managing-wallets` — HD wallets for multi-chain address derivation
- `signing-transactions` — sign transactions with private keys or wallet accounts
- `managing-policies` — policies that reference private key tags
