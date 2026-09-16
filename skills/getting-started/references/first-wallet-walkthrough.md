# First Wallet Walkthrough

> **CLI migration:** This is retained API parameter/semantic reference material. Execute supported core operations through the commands in the parent SKILL.md and root CLI convention. SDK authentication, stamping, inline key-generation scripts, and old envelope/retry instructions below are superseded. Import/export crypto and unvalidated request bridges remain explicit gaps; this reference alone does not establish CLI completion. Existing user authorization takes precedence over blanket per-call confirmation wording in legacy examples.


Complete request/response JSON for every step of the getting-started workflow.

**Base URL:** `https://api.turnkey.com`

## Request body convention

The JSON bodies below are the `parameters` object — the exact shape SDK methods accept (e.g., `client.createWallet({walletName, accounts, mnemonicLength})`). For raw HTTP calls, wrapping depends on the endpoint prefix:

- `POST /public/v1/query/*` (`whoami`, `list_wallets`, `list_wallet_accounts`) — body as shown, no envelope.
- `POST /public/v1/submit/*` (`create_wallet`, `sign_raw_payload`) — wrap in the activity envelope:

```json
{
  "type": "ACTIVITY_TYPE_CREATE_WALLET",
  "timestampMs": "1700000000000",
  "organizationId": "org-12345678-abcd-1234-abcd-1234567890ab",
  "parameters": {
    "walletName": "my-first-wallet",
    "accounts": [ /* ... */ ],
    "mnemonicLength": 12
  }
}
```

Activity types follow the endpoint path: `create_wallet` → `ACTIVITY_TYPE_CREATE_WALLET`, `sign_raw_payload` → `ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2`. `timestampMs` is a stringified ms Unix timestamp and must change between retries. See the root [`SKILL.md`](../../../SKILL.md) for the full convention — or just use the SDK and skip the envelope.

## Step 1: Verify credentials

```
POST /public/v1/query/whoami
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

If you get an authentication error, verify:
- `TURNKEY_API_PUBLIC_KEY` matches the public key registered in the Turnkey Dashboard
- `TURNKEY_API_PRIVATE_KEY` is the corresponding private key
- `TURNKEY_ORGANIZATION_ID` matches your organization
- The key pair uses P-256 (also called ES256 or prime256v1)

## Step 2: Check for existing wallets

```
POST /public/v1/query/list_wallets
```

```json
{
  "organizationId": "org-12345678-abcd-1234-abcd-1234567890ab"
}
```

**Response (no wallets):**

```json
{
  "wallets": []
}
```

**Response (wallet exists):**

```json
{
  "wallets": [
    {
      "walletId": "wlt-12345678-abcd-1234-abcd-1234567890ab",
      "walletName": "my-first-wallet",
      "createdAt": { "seconds": "1700000000", "nanos": "0" },
      "updatedAt": { "seconds": "1700000000", "nanos": "0" },
      "exported": false,
      "imported": false
    }
  ]
}
```

If a wallet exists, skip to Step 4 (list wallet accounts).

## Step 3: Create wallet (EVM + Solana)

```
POST /public/v1/submit/create_wallet
```

```json
{
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
```

**Response:**

```json
{
  "activity": {
    "id": "act-12345678-abcd-1234-abcd-1234567890ab",
    "status": "ACTIVITY_STATUS_COMPLETED",
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

Save the `walletId` and addresses. The first address is Ethereum, the second is Solana (matching the order of accounts in the request).

## Step 4: List wallet accounts

```
POST /public/v1/query/list_wallet_accounts
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

## Step 5 (optional): Sign a test payload

```
POST /public/v1/submit/sign_raw_payload
```

```json
{
  "signWith": "0x1234567890abcdef1234567890abcdef12345678",
  "payload": "48656c6c6f2c205475726e6b657921",
  "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
  "hashFunction": "HASH_FUNCTION_SHA256"
}
```

**Response:**

```json
{
  "activity": {
    "id": "act-87654321-dcba-4321-dcba-0987654321ab",
    "status": "ACTIVITY_STATUS_COMPLETED",
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

## Chain selection reference

| Chain | Curve | Path | Address Format |
|-------|-------|------|----------------|
| Ethereum/EVM | CURVE_SECP256K1 | m/44'/60'/0'/0/0 | ADDRESS_FORMAT_ETHEREUM |
| Solana | CURVE_ED25519 | m/44'/501'/0'/0' | ADDRESS_FORMAT_SOLANA |
| Bitcoin (SegWit) | CURVE_SECP256K1 | m/84'/0'/0'/0/0 | ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH |
| Cosmos | CURVE_SECP256K1 | m/44'/118'/0'/0/0 | ADDRESS_FORMAT_COSMOS |
| Tron | CURVE_SECP256K1 | m/44'/195'/0'/0/0 | ADDRESS_FORMAT_TRON |

For the full list of 13 supported chains, see the `managing-wallets` skill.
