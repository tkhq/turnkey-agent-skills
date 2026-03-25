# Wallet API Examples

## Create a wallet with Ethereum, Solana, and Bitcoin

Creates a multi-chain wallet in one API call with three addresses.

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

Example activity response:

```json
{
  "activity": {
    "id": "act_...",
    "status": "COMPLETED",
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

## List wallets

```
POST /public/v1/query/list_wallets
```

```json
{}
```

Example response:

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

Fetch a single wallet by ID to check its properties without listing all wallets.

```
POST /public/v1/query/get_wallet
```

```json
{
  "walletId": "wlt_..."
}
```

Example response:

```json
{
  "wallet": {
    "walletId": "wlt_...",
    "walletName": "multi-chain-wallet",
    "createdAt": { "seconds": "1700000000", "nanos": "0" },
    "updatedAt": { "seconds": "1700000000", "nanos": "0" },
    "exported": false,
    "imported": false,
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
}
```

## Update a wallet

Rename a wallet:

```
POST /public/v1/submit/update_wallet
```

```json
{
  "walletId": "wlt_...",
  "walletName": "production-hot-wallet"
}
```

Example activity response:

```json
{
  "activity": {
    "id": "act_...",
    "status": "COMPLETED",
    "type": "ACTIVITY_TYPE_UPDATE_WALLET",
    "result": {
      "updateWalletResult": {
        "walletId": "wlt_..."
      }
    }
  }
}
```

## Delete wallets

Delete one or more wallets permanently. All derived accounts are also deleted.

By default, deletion is blocked if a wallet has not been exported. Set `deleteWithoutExport` to `true` to delete wallets that have never been exported. If the wallet has already been exported, this field is ignored.

```
POST /public/v1/submit/delete_wallets
```

```json
{
  "walletIds": ["wlt_abc123", "wlt_def456"],
  "deleteWithoutExport": true
}
```

Example activity response:

```json
{
  "activity": {
    "id": "act_...",
    "status": "COMPLETED",
    "type": "ACTIVITY_TYPE_DELETE_WALLETS",
    "result": {
      "deleteWalletsResult": {
        "walletIds": ["wlt_abc123", "wlt_def456"]
      }
    }
  }
}
```

## Add multiple accounts to an existing wallet

Add Cosmos and Tron addresses to a wallet that already exists.

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

## Get a single wallet account

Inspect one account by address or ID:

```
POST /public/v1/query/get_wallet_account
```

```json
{
  "address": "0x1234...abcd"
}
```

Or by wallet account ID:

```json
{
  "walletAccountId": "wac_..."
}
```

Example response:

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

## List wallet accounts

```
POST /public/v1/query/list_wallet_accounts
```

```json
{
  "walletId": "wlt_..."
}
```

## Delete wallet accounts

Remove specific accounts from a wallet permanently:

```
POST /public/v1/submit/delete_wallet_accounts
```

```json
{
  "walletAccountIds": ["wac_abc123", "wac_def456"]
}
```

Example activity response:

```json
{
  "activity": {
    "id": "act_...",
    "status": "COMPLETED",
    "type": "ACTIVITY_TYPE_DELETE_WALLET_ACCOUNTS",
    "result": {
      "deleteWalletAccountsResult": {
        "walletAccountIds": ["wac_abc123", "wac_def456"]
      }
    }
  }
}
```
