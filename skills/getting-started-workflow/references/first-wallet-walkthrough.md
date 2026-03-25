# First Wallet Walkthrough

Complete request/response JSON for every step of the getting-started workflow.

## Step 1: Verify Credentials (whoami)

**Request:**

```
POST https://api.turnkey.com/public/v1/query/whoami
```

```json
{
  "organizationId": "org-12345678-abcd-1234-abcd-1234567890ab"
}
```

**Response:**

```json
{
  "organizationId": "org-12345678-abcd-1234-abcd-1234567890ab",
  "organizationName": "My Company",
  "userId": "usr-12345678-abcd-1234-abcd-1234567890ab",
  "username": "admin@mycompany.com"
}
```

If the response returns successfully, your credentials are valid. If you get an authentication error, verify:
- `TURNKEY_API_PUBLIC_KEY` matches the public key registered in the Turnkey Dashboard
- `TURNKEY_API_PRIVATE_KEY` is the corresponding private key
- `TURNKEY_ORGANIZATION_ID` matches your organization
- The key pair uses the P-256 curve (also called ES256 or prime256v1)

## Step 2: Create Wallet

**Request (EVM + Solana):**

```
POST https://api.turnkey.com/public/v1/submit/create_wallet
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_WALLET",
  "timestampMs": "1234567890000",
  "organizationId": "org-12345678-abcd-1234-abcd-1234567890ab",
  "parameters": {
    "walletName": "my-first-wallet",
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
}
```

**Response:**

```json
{
  "activity": {
    "id": "act-12345678-abcd-1234-abcd-1234567890ab",
    "status": "COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_WALLET",
    "result": {
      "createWalletResult": {
        "walletId": "wlt-12345678-abcd-1234-abcd-1234567890ab",
        "addresses": [
          "0x1234567890abcdef1234567890abcdef12345678",
          "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
        ]
      }
    }
  }
}
```

Save the `walletId` and the addresses. The first address is Ethereum, the second is Solana (matching the order of accounts in the request).

## Step 3: List Wallet Accounts

**Request:**

```
POST https://api.turnkey.com/public/v1/query/list_wallet_accounts
```

```json
{
  "organizationId": "org-12345678-abcd-1234-abcd-1234567890ab",
  "walletId": "wlt-12345678-abcd-1234-abcd-1234567890ab"
}
```

**Response:**

```json
{
  "accounts": [
    {
      "walletAccountId": "wac-11111111-aaaa-1111-aaaa-111111111111",
      "address": "0x1234567890abcdef1234567890abcdef12345678",
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'/60'/0'/0/0",
      "addressFormat": "ADDRESS_FORMAT_ETHEREUM"
    },
    {
      "walletAccountId": "wac-22222222-bbbb-2222-bbbb-222222222222",
      "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "curve": "CURVE_ED25519",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'/501'/0'/0'",
      "addressFormat": "ADDRESS_FORMAT_SOLANA"
    }
  ]
}
```

## Step 4: Sign a Test Payload

**Request:**

```
POST https://api.turnkey.com/public/v1/submit/sign_raw_payload
```

```json
{
  "type": "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2",
  "timestampMs": "1234567890000",
  "organizationId": "org-12345678-abcd-1234-abcd-1234567890ab",
  "parameters": {
    "signWith": "0x1234567890abcdef1234567890abcdef12345678",
    "payload": "48656c6c6f2c205475726e6b657921",
    "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
    "hashFunction": "HASH_FUNCTION_SHA256"
  }
}
```

**Response:**

```json
{
  "activity": {
    "id": "act-87654321-dcba-4321-dcba-0987654321ab",
    "status": "COMPLETED",
    "type": "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2",
    "result": {
      "signRawPayloadResult": {
        "r": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
        "s": "1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d5e6f1a2b",
        "v": "1c"
      }
    }
  }
}
```

The signature components (`r`, `s`, `v`) confirm that signing is working. The `v` value is the recovery ID used by EVM chains to recover the public key from the signature.

## Chain Selection Reference

Top chains with their curve, derivation path, and address format:

| Chain | Curve | Path | Address Format |
|-------|-------|------|----------------|
| Ethereum/EVM | CURVE_SECP256K1 | m/44'/60'/0'/0/0 | ADDRESS_FORMAT_ETHEREUM |
| Solana | CURVE_ED25519 | m/44'/501'/0'/0' | ADDRESS_FORMAT_SOLANA |
| Bitcoin (SegWit) | CURVE_SECP256K1 | m/84'/0'/0'/0/0 | ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH |
| Cosmos | CURVE_SECP256K1 | m/44'/118'/0'/0/0 | ADDRESS_FORMAT_COSMOS |
| Tron | CURVE_SECP256K1 | m/44'/195'/0'/0/0 | ADDRESS_FORMAT_TRON |

For the full list of supported chains (12+), see the managing-wallets-api skill.
