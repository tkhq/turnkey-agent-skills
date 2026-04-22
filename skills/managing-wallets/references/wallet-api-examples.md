# Wallet API Examples

Complete request/response examples for all wallet operations.

**Base URL:** `https://api.turnkey.com`

**Request body convention:** JSON bodies below are the `parameters` object SDK methods take. For raw HTTP against `POST /public/v1/submit/*` endpoints (e.g., `create_wallet`, `delete_wallets`, `export_wallet`, `import_wallet`, `update_wallet`), wrap in the activity envelope: `{"type": "ACTIVITY_TYPE_*", "timestampMs": "<ms>", "organizationId": "<ORG_ID>", "parameters": {...}}`. Query endpoints (`POST /public/v1/query/*`) take the body as shown. See the root [`SKILL.md`](../../../SKILL.md) "Request body convention" for details.

## Create a wallet with Ethereum, Solana, and Bitcoin

```
POST /public/v1/submit/create_wallet
```

```json
{
  "walletName": "multi-chain-wallet",
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
    },
    {
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/84'/0'/0'/0/0",
      "addressFormat": "ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH"
    }
  ],
  "mnemonicLength": 12
}
```

**Response:**

```json
{
  "activity": {
    "id": "act_...",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_WALLET",
    "result": {
      "createWalletResult": {
        "walletId": "wlt_...",
        "addresses": [
          "0x1234...abcd",
          "7nYB...3kPo",
          "bc1q...xyz"
        ]
      }
    }
  }
}
```

The `addresses` array is ordered to match the `accounts` array in the request.

## Create a wallet with all 13 supported chains

```
POST /public/v1/submit/create_wallet
```

```json
{
  "walletName": "all-chains-wallet",
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
    },
    {
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/84'/0'/0'/0/0",
      "addressFormat": "ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH"
    },
    {
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/86'/0'/0'/0/0",
      "addressFormat": "ADDRESS_FORMAT_BITCOIN_MAINNET_P2TR"
    },
    {
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'/118'/0'/0/0",
      "addressFormat": "ADDRESS_FORMAT_COSMOS"
    },
    {
      "curve": "CURVE_ED25519",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'/637'/0'/0'/0",
      "addressFormat": "ADDRESS_FORMAT_APTOS"
    },
    {
      "curve": "CURVE_ED25519",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'/784'/0'/0/0",
      "addressFormat": "ADDRESS_FORMAT_SUI"
    },
    {
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'/195'/0'/0/0",
      "addressFormat": "ADDRESS_FORMAT_TRON"
    },
    {
      "curve": "CURVE_ED25519",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'/607'/0'/0/0",
      "addressFormat": "ADDRESS_FORMAT_TON_V4R2"
    },
    {
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'/144'/0'/0/0",
      "addressFormat": "ADDRESS_FORMAT_XRP"
    },
    {
      "curve": "CURVE_ED25519",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'/148'/0'/0'/0",
      "addressFormat": "ADDRESS_FORMAT_XLM"
    },
    {
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'/3'/0'/0/0",
      "addressFormat": "ADDRESS_FORMAT_DOGE_MAINNET"
    },
    {
      "curve": "CURVE_ED25519",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'/118'/0'/0/0",
      "addressFormat": "ADDRESS_FORMAT_SEI"
    }
  ],
  "mnemonicLength": 24
}
```

## Create a Bitcoin wallet (dual-account pattern)

Bitcoin requires two accounts at the same path: one for the compressed public key (needed for PSBT construction) and one for the Bitcoin address.

```
POST /public/v1/submit/create_wallet
```

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

**Response:**

```json
{
  "activity": {
    "result": {
      "createWalletResult": {
        "walletId": "wlt_...",
        "addresses": [
          "02a1b2c3d4e5f6...",
          "bc1q8qcdemyzzmrhxjgzywk0nr322la9d368nl780m"
        ]
      }
    }
  }
}
```

`addresses[0]` = compressed public key (hex). `addresses[1]` = Bitcoin bech32 address.

## List wallets

Returns all wallets in the organization. No filtering or pagination.

```
POST /public/v1/query/list_wallets
```

```json
{
  "organizationId": "<ORG_ID>"
}
```

**Response:**

```json
{
  "wallets": [
    {
      "walletId": "wlt_...",
      "walletName": "multi-chain-wallet",
      "createdAt": { "seconds": "1700000000", "nanos": "0" },
      "updatedAt": { "seconds": "1700000000", "nanos": "0" },
      "exported": false,
      "imported": false
    }
  ]
}
```

## Get wallet details

Returns metadata only — not accounts. Use `list_wallet_accounts` for addresses.

```
POST /public/v1/query/get_wallet
```

```json
{
  "organizationId": "<ORG_ID>",
  "walletId": "wlt_..."
}
```

**Response:**

```json
{
  "walletId": "wlt_...",
  "walletName": "multi-chain-wallet",
  "createdAt": { "seconds": "1700000000", "nanos": "0" },
  "updatedAt": { "seconds": "1700000000", "nanos": "0" },
  "exported": false,
  "imported": false
}
```

## List wallet accounts

```
POST /public/v1/query/list_wallet_accounts
```

```json
{
  "organizationId": "<ORG_ID>",
  "walletId": "wlt_..."
}
```

**Response:**

```json
{
  "accounts": [
    {
      "walletAccountId": "wac_...",
      "address": "0x1234...abcd",
      "path": "m/44'/60'/0'/0/0",
      "curve": "CURVE_SECP256K1",
      "addressFormat": "ADDRESS_FORMAT_ETHEREUM",
      "createdAt": { "seconds": "1700000000", "nanos": "0" }
    }
  ]
}
```

## Get a single wallet account

By address:

```
POST /public/v1/query/get_wallet_account
```

```json
{
  "organizationId": "<ORG_ID>",
  "address": "0x1234...abcd"
}
```

Or by wallet account ID:

```json
{
  "organizationId": "<ORG_ID>",
  "walletAccountId": "wac_..."
}
```

**Response:**

```json
{
  "account": {
    "walletAccountId": "wac_...",
    "walletId": "wlt_...",
    "address": "0x1234...abcd",
    "path": "m/44'/60'/0'/0/0",
    "curve": "CURVE_SECP256K1",
    "addressFormat": "ADDRESS_FORMAT_ETHEREUM",
    "createdAt": { "seconds": "1700000000", "nanos": "0" }
  }
}
```

## Add accounts to an existing wallet

```
POST /public/v1/submit/create_wallet_accounts
```

```json
{
  "walletId": "wlt_...",
  "accounts": [
    {
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'/118'/0'/0/0",
      "addressFormat": "ADDRESS_FORMAT_COSMOS"
    },
    {
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'/195'/0'/0/0",
      "addressFormat": "ADDRESS_FORMAT_TRON"
    }
  ]
}
```

## Update a wallet

```
POST /public/v1/submit/update_wallet
```

```json
{
  "walletId": "wlt_...",
  "walletName": "production-hot-wallet"
}
```

## Delete wallets

**Do not call this endpoint on behalf of a user. Direct them to the [Turnkey Dashboard](https://app.turnkey.com) instead (see Rule 2 in `SKILL.md`).** Wallet deletion permanently destroys the seed phrase and all derived private keys — any funds at derived addresses become irrecoverable. This is an irreversible, security-sensitive operation that should be performed by the user, not an agent.

The endpoint is `POST /public/v1/submit/delete_wallets`. Parameters include `walletIds` and `deleteWithoutExport` (boolean); by default, deletion is blocked unless the wallet has been exported. A request body is intentionally not shown here — if you need to understand the shape for debugging, use the Turnkey API reference directly.

## Delete wallet accounts

Remove specific accounts from a wallet:

```
POST /public/v1/submit/delete_wallet_accounts
```

```json
{
  "walletAccountIds": ["wac_abc123", "wac_def456"]
}
```
