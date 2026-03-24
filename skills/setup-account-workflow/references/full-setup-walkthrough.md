# Full Setup Walkthrough: EVM + Solana

This walkthrough shows the most common setup path: a single wallet with Ethereum and Solana accounts. Adapt for your target chains using the address format table in `managing-wallets-api`.

**Base URL:** `https://api.turnkey.com`

## Step 1: Get Organization ID

Get your organization ID from the Turnkey dashboard at app.turnkey.com. It is a UUID like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`.

## Step 2: Generate and Register API Key

Generate a P-256 key pair locally using any crypto library (e.g., OpenSSL, Node.js crypto, Go crypto/ecdsa). The public key should be hex-encoded in uncompressed form.

Register the public key with your organization:

`POST /public/v1/submit/create_api_keys`

```json
{
  "type": "ACTIVITY_TYPE_CREATE_API_KEYS",
  "timestampMs": "<current-timestamp-ms>",
  "organizationId": "<your-org-id>",
  "parameters": {
    "apiKeys": [
      {
        "apiKeyName": "default",
        "publicKey": "<hex-encoded-P256-public-key>",
        "curveType": "API_KEY_CURVE_P256"
      }
    ],
    "userId": "<your-user-id>"
  }
}
```

Expected response includes `apiKeyIds` confirming registration.

## Step 3: Verify API Connectivity

`POST /public/v1/query/list_wallets`

```json
{
  "organizationId": "<your-org-id>"
}
```

Expected response:
```json
{
  "wallets": []
}
```

An empty list is correct for a new organization. If you get an authentication error, verify that your key pair is correctly generated and the X-Stamp header is properly constructed (see managing-users-api).

## Step 4: Create Wallet with EVM + Solana Accounts

`POST /public/v1/submit/create_wallet`

```json
{
  "type": "ACTIVITY_TYPE_CREATE_WALLET",
  "timestampMs": "<current-timestamp-ms>",
  "organizationId": "<your-org-id>",
  "parameters": {
    "walletName": "default",
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

Expected response includes `walletId` and two addresses:
```json
{
  "walletId": "wlt-...",
  "addresses": [
    "0x1234...abcd",
    "ABC123...xyz"
  ]
}
```

Record both addresses.

## Step 5: Verify Wallet and Accounts

`POST /public/v1/query/list_wallets`

```json
{
  "organizationId": "<your-org-id>"
}
```

Then list accounts for the wallet:

`POST /public/v1/query/list_wallet_accounts`

```json
{
  "organizationId": "<your-org-id>",
  "walletId": "<wallet-id>"
}
```

Expected: wallet listed with two accounts showing Ethereum and Solana addresses.

## Step 6: Test Signature (Ethereum)

`POST /public/v1/submit/sign_raw_payload`

```json
{
  "type": "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2",
  "timestampMs": "<current-timestamp-ms>",
  "organizationId": "<your-org-id>",
  "parameters": {
    "signWith": "0x1234...abcd",
    "payload": "48656c6c6f2c205475726e6b657921",
    "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
    "hashFunction": "HASH_FUNCTION_KECCAK256"
  }
}
```

Expected response:
```json
{
  "r": "0x...",
  "s": "0x...",
  "v": "0x1b"
}
```

## Step 7: Test Signature (Solana)

`POST /public/v1/submit/sign_raw_payload`

```json
{
  "type": "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2",
  "timestampMs": "<current-timestamp-ms>",
  "organizationId": "<your-org-id>",
  "parameters": {
    "signWith": "ABC123...xyz",
    "payload": "48656c6c6f2c205475726e6b657921",
    "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
    "hashFunction": "HASH_FUNCTION_NOT_APPLICABLE"
  }
}
```

Note the different hash function: Ed25519 (Solana) does not pre-hash, so use `HASH_FUNCTION_NOT_APPLICABLE`.

## Setup Complete

At this point you have:
- API keys generated and registered
- A wallet with Ethereum and Solana accounts
- Verified signing on both chains

**Next steps:**
- Fund the addresses on testnet (use a faucet for Sepolia ETH or Devnet SOL)
- Sign real transactions (see `signing-transactions-api` for chain-specific methods)
- Add team members (see Phase 4 in the main SKILL.md)
- Add policies for production (see `wallet-governance-workflow`)

## Variations

### EVM-Only Setup

Remove the Solana account from Step 4:

`POST /public/v1/submit/create_wallet`

```json
{
  "type": "ACTIVITY_TYPE_CREATE_WALLET",
  "timestampMs": "<current-timestamp-ms>",
  "organizationId": "<your-org-id>",
  "parameters": {
    "walletName": "default",
    "accounts": [
      {
        "curve": "CURVE_SECP256K1",
        "pathFormat": "PATH_FORMAT_BIP32",
        "path": "m/44'/60'/0'/0/0",
        "addressFormat": "ADDRESS_FORMAT_ETHEREUM"
      }
    ],
    "mnemonicLength": 12
  }
}
```

### Adding Bitcoin

Add a Bitcoin account to your existing wallet after creation:

`POST /public/v1/submit/create_wallet_accounts`

```json
{
  "type": "ACTIVITY_TYPE_CREATE_WALLET_ACCOUNTS",
  "timestampMs": "<current-timestamp-ms>",
  "organizationId": "<your-org-id>",
  "parameters": {
    "walletId": "<wallet-id>",
    "accounts": [
      {
        "curve": "CURVE_SECP256K1",
        "pathFormat": "PATH_FORMAT_BIP32",
        "path": "m/84'/0'/0'/0/0",
        "addressFormat": "ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH"
      }
    ]
  }
}
```

For the full list of supported chains and address formats, see the table in `managing-wallets-api`.

### Adding a Second Team Member

Generate a P-256 key pair for the new team member locally, then create the user:

`POST /public/v1/submit/create_users`

```json
{
  "type": "ACTIVITY_TYPE_CREATE_USERS",
  "timestampMs": "<current-timestamp-ms>",
  "organizationId": "<your-org-id>",
  "parameters": {
    "users": [
      {
        "userName": "bob",
        "userEmail": "bob@example.com",
        "apiKeys": [
          {
            "apiKeyName": "bob-key",
            "publicKey": "<bob-hex-encoded-P256-public-key>",
            "curveType": "API_KEY_CURVE_P256"
          }
        ],
        "authenticators": [],
        "userTags": []
      }
    ]
  }
}
```

See `managing-users-api` for user provisioning details, sub-organization patterns, and key rotation.
