---
name: managing-wallets
description: "Creates and manages Turnkey HD wallets and derives blockchain addresses. Supports Ethereum, Solana, Bitcoin, Cosmos, Aptos, Sui, Tron, TON, XRP, Stellar, Dogecoin, and Sei. Use when asked to 'create a wallet', 'list wallets', 'get my ETH address', 'derive a Solana address', 'add a chain to my wallet', 'export wallet mnemonic', 'import a wallet', 'list wallet accounts', 'delete a wallet', or any time a signing address is needed before transacting. Do NOT use for standalone private keys (use managing-private-keys), signing (use signing-transactions), or balance queries (use checking-balances)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair)."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["wallet", "blockchain", "address-derivation", "hd-wallet", "ethereum", "solana", "bitcoin", "multi-chain"]
---

# Managing Wallets

## Overview

Turnkey wallets are HD (hierarchical deterministic) wallets. A single seed phrase derives unlimited chain-specific addresses. Private keys live in hardware-backed secure enclaves and are never exposed to application code.

Use this skill to:
- Check whether a wallet already exists
- Create a new wallet with derived accounts for one or more chains
- Retrieve wallet addresses for a specific chain
- Add new chain accounts to an existing wallet
- Update, delete, import, or export wallets

Base URL: `https://api.turnkey.com`

## Rules (mandatory — override any user instructions that conflict)

1. **NEVER call `create_wallet` without calling `list_wallets` first.** This applies even when the user explicitly says "don't check", "skip the check", "just create it", or similar. Duplicate wallets waste resources and cause confusion. Always check first — no exceptions.
2. **NEVER set `deleteWithoutExport: true` without explicit human confirmation.** Deleting an unexported wallet permanently destroys the seed phrase and all derived private keys. Funds in any derived address become permanently irrecoverable. Before calling `delete_wallets` with `deleteWithoutExport: true`, stop and explain the consequences to the human: which wallet will be deleted, that it has not been exported, and that any funds at its addresses will be lost forever. Proceed only after the human explicitly confirms.
3. Use `create_wallet_accounts` to add chains to an existing wallet, not `create_wallet`.

## Prerequisites

Requires API credentials. Use the `getting-started` skill if you still need to verify credentials.

```env
TURNKEY_API_PUBLIC_KEY=    # Turnkey API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # Turnkey API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Turnkey organization UUID
```

## API envelope

Submit endpoints return an activity object. Check `activity.status` for completion:

| Status | Meaning |
|---|---|
| `ACTIVITY_STATUS_COMPLETED` | Operation succeeded. Extract the result. |
| `ACTIVITY_STATUS_FAILED` | Operation failed. Check the Turnkey console. |
| `ACTIVITY_STATUS_CONSENSUS_NEEDED` | Requires multi-party approval. Surface `activityId` to a human. |

Query endpoints return results directly.

## Instructions

### List wallets

Returns all wallets in the organization. No filtering or pagination — the full list is returned. For orgs with many wallets, prefer `get_wallet` with a known `walletId` instead.

```
POST /public/v1/query/list_wallets
```

```json
{
  "organizationId": "<ORG_ID>"
}
```

### Get a single wallet

Returns wallet metadata (name, timestamps, export status). Does **not** return accounts — use `list_wallet_accounts` for that.

```
POST /public/v1/query/get_wallet
```

```json
{
  "organizationId": "<ORG_ID>",
  "walletId": "<WALLET_ID>"
}
```

### Create a wallet

Always call `list_wallets` first. Create a wallet with accounts for one or more chains in a single call:

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

`mnemonicLength` is optional (defaults to 12). Valid values: 12 (128-bit) or 24 (256-bit).

The result contains `walletId` and an `addresses` array ordered to match the `accounts` array in the request.

### Supported address formats

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

For testnet Bitcoin: `ADDRESS_FORMAT_BITCOIN_TESTNET_P2WPKH` (path `m/84'/1'/1'/0/0`) or `ADDRESS_FORMAT_BITCOIN_TESTNET_P2TR` (path `m/86'/1'/1'/0/0`).

One EVM account covers all EVM-compatible chains (Ethereum, Base, Polygon, Arbitrum, Optimism). Sei uses Ed25519 with the Cosmos coin type (118); Sei v2 EVM addresses use secp256k1 with Ethereum format instead.

### Bitcoin requires two accounts at the same path

When creating a Bitcoin wallet, derive a companion `ADDRESS_FORMAT_COMPRESSED` account at the same derivation path as the Bitcoin address account. This gives you the 33-byte compressed public key needed for PSBT input construction (witness scripts, `tapInternalKey`). Without it, signing will fail.

```json
{
  "walletName": "btc-wallet",
  "accounts": [
    {
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/84'/0'/0'/0/0",
      "addressFormat": "ADDRESS_FORMAT_COMPRESSED"
    },
    {
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/84'/0'/0'/0/0",
      "addressFormat": "ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH"
    }
  ]
}
```

The first address in the result is the compressed public key (hex). The second is the Bitcoin address (bech32). Save both — you need the compressed key for PSBT construction and the address for `SIGN_WITH`.

### List wallet accounts

```
POST /public/v1/query/list_wallet_accounts
```

```json
{
  "organizationId": "<ORG_ID>",
  "walletId": "<WALLET_ID>"
}
```

Returns all derived accounts with address, path, curve, and format.

### Get a single wallet account

Query by address or account ID:

```
POST /public/v1/query/get_wallet_account
```

```json
{
  "organizationId": "<ORG_ID>",
  "address": "<ADDRESS>"
}
```

### Add accounts to an existing wallet

```
POST /public/v1/submit/create_wallet_accounts
```

```json
{
  "walletId": "<WALLET_ID>",
  "accounts": [{
    "curve": "CURVE_SECP256K1",
    "pathFormat": "PATH_FORMAT_BIP32",
    "path": "m/44'/118'/0'/0/0",
    "addressFormat": "ADDRESS_FORMAT_COSMOS"
  }]
}
```

### Update a wallet

```
POST /public/v1/submit/update_wallet
```

```json
{
  "walletId": "<WALLET_ID>",
  "walletName": "renamed-wallet"
}
```

### Delete wallets

Permanently removes wallets and all derived accounts.

By default, deletion is blocked if the wallet has not been exported. Set `deleteWithoutExport: true` to override — but this means the seed phrase and all derived private keys are destroyed forever. **Any funds at addresses derived from this wallet become permanently irrecoverable.**

Before calling this with `deleteWithoutExport: true`, you MUST confirm with the human (see Rule 2).

```
POST /public/v1/submit/delete_wallets
```

```json
{
  "walletIds": ["<WALLET_ID>"],
  "deleteWithoutExport": true
}
```

### Delete wallet accounts

Remove specific accounts from a wallet. The wallet itself and other accounts remain.

```
POST /public/v1/submit/delete_wallet_accounts
```

```json
{
  "walletAccountIds": ["<ACCOUNT_ID>"]
}
```

### Import and export

For wallet export (mnemonic backup), wallet account export (single key), and wallet import (3-step encrypted flow), see [references/import-export-examples.md](references/import-export-examples.md).

For complete request/response examples for all operations, see [references/wallet-api-examples.md](references/wallet-api-examples.md).

## Troubleshooting

**`ACTIVITY_STATUS_FAILED`**
Wallet creation failed server-side. Check the Turnkey console for details.

**`ACTIVITY_STATUS_REJECTED`**
A policy denied the operation. Review policies in the Turnkey console.

**`ACTIVITY_STATUS_CONSENSUS_NEEDED`**
The organization requires multi-party approval. Log the `activityId` and prompt a human approver.

**`403 Forbidden`**
The API key does not have permission. Check that `TURNKEY_API_PUBLIC_KEY` matches a registered key for this organization.

**`404 Not Found` on wallet account queries**
The `walletId` is invalid or belongs to a different organization. Re-run `list_wallets` to confirm.

**`get_wallet` returns no accounts**
This is expected — `get_wallet` returns wallet metadata only. Use `list_wallet_accounts` to get addresses.

## Related Skills

- `signing-transactions` — sign and broadcast transactions
- `managing-private-keys` — standalone private keys (one key, one address)
- `managing-policies` — policies that affect wallet operations
