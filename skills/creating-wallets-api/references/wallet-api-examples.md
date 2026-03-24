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

## Get wallet details

```
POST /public/v1/query/get_wallet
```

```json
{
  "walletId": "<WALLET_ID>"
}
```

## Add multiple accounts to an existing wallet

Add Cosmos and Tron addresses to a wallet that already exists.

```
POST /public/v1/submit/create_wallet_accounts
```

```json
{
  "walletId": "<WALLET_ID>",
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

## Create a standalone private key

Standalone private keys are not derived from an HD wallet. They are useful for raw signing operations or when you need a single-purpose key.

```
POST /public/v1/submit/create_private_keys
```

```json
{
  "privateKeys": [{
    "privateKeyName": "my-signing-key",
    "curve": "CURVE_SECP256K1",
    "addressFormats": ["ADDRESS_FORMAT_ETHEREUM"]
  }]
}
```

## List private keys

```
POST /public/v1/query/list_private_keys
```

```json
{}
```
