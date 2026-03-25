# Treasury Setup Walkthrough

Complete end-to-end walkthrough for setting up a two-tier treasury (hot + cold wallet) with operator roles and multi-sig policies.

## Step 1: Create Operator Users

Create three users: two admins (for cold wallet multi-sig) and one operator (for hot wallet daily ops).

**Request:**

```
POST https://api.turnkey.com/public/v1/submit/create_users
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_USERS_V2",
  "timestampMs": "1234567890000",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "users": [
      {
        "userName": "alice-treasury-admin",
        "userTags": ["treasury-admin"],
        "apiKeys": [{
          "apiKeyName": "alice-api-key",
          "publicKey": "04abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab"
        }]
      },
      {
        "userName": "bob-treasury-admin",
        "userTags": ["treasury-admin"],
        "apiKeys": [{
          "apiKeyName": "bob-api-key",
          "publicKey": "04fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fe"
        }]
      },
      {
        "userName": "carol-treasury-operator",
        "userTags": ["treasury-operator"],
        "apiKeys": [{
          "apiKeyName": "carol-api-key",
          "publicKey": "04112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff0011"
        }]
      }
    ]
  }
}
```

**Response:**

```json
{
  "activity": {
    "id": "act_create_users_001",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_USERS_V2",
    "result": {
      "createUsersResultV2": {
        "userIds": [
          "usr_alice_001",
          "usr_bob_002",
          "usr_carol_003"
        ]
      }
    }
  }
}
```

## Step 2: Create Hot Wallet

Create the hot wallet for daily operations with Ethereum and Solana accounts.

**Request:**

```
POST https://api.turnkey.com/public/v1/submit/create_wallet
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_WALLET",
  "timestampMs": "1234567890001",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "walletName": "treasury-hot",
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
    ]
  }
}
```

**Response:**

```json
{
  "activity": {
    "id": "act_create_wallet_hot_001",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_WALLET",
    "result": {
      "createWalletResult": {
        "walletId": "wlt_hot_001",
        "addresses": [
          "0x1234567890abcdef1234567890abcdef12345678",
          "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
        ]
      }
    }
  }
}
```

Save `wlt_hot_001` as the hot wallet ID and `0x1234...` as the hot wallet Ethereum address.

## Step 3: Create Cold Wallet

Create the cold wallet for reserves with the same chain accounts.

**Request:**

```
POST https://api.turnkey.com/public/v1/submit/create_wallet
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_WALLET",
  "timestampMs": "1234567890002",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "walletName": "treasury-cold",
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
    ]
  }
}
```

**Response:**

```json
{
  "activity": {
    "id": "act_create_wallet_cold_001",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_WALLET",
    "result": {
      "createWalletResult": {
        "walletId": "wlt_cold_001",
        "addresses": [
          "0xabcdef1234567890abcdef1234567890abcdef12",
          "9yLMNtg3DX98e08UYTEQcE6kCmieTrB94UAStKthBtVW"
        ]
      }
    }
  }
}
```

## Step 4: Tag Wallet Keys

Tag the private keys associated with each wallet so policies can reference them by tag rather than by individual key ID.

Get private key IDs from `list_wallets` or the wallet creation response, then create tags.

**Tag hot wallet keys:**

```
POST https://api.turnkey.com/public/v1/submit/create_private_key_tag
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_PRIVATE_KEY_TAG",
  "timestampMs": "1234567890003",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "privateKeyTagName": "hot-wallet",
    "privateKeyIds": ["pk_hot_eth_001", "pk_hot_sol_001"]
  }
}
```

**Tag cold wallet keys:**

```
POST https://api.turnkey.com/public/v1/submit/create_private_key_tag
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_PRIVATE_KEY_TAG",
  "timestampMs": "1234567890004",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "privateKeyTagName": "cold-storage",
    "privateKeyIds": ["pk_cold_eth_001", "pk_cold_sol_001"]
  }
}
```

## Step 5: Create Policies

Create all policies for the treasury. The order does not matter, but create them all before testing.

### Policy 1: Hot Wallet ALLOW (single signer)

Any user tagged `treasury-operator` can sign with keys tagged `hot-wallet`.

```
POST https://api.turnkey.com/public/v1/submit/create_policy
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_POLICY_V3",
  "timestampMs": "1234567890005",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "policyName": "treasury-hot-wallet-allow",
    "effect": "EFFECT_ALLOW",
    "consensus": "approvers.any(user, user.tags.contains('treasury-operator'))",
    "condition": "private_key.tags.contains('hot-wallet')",
    "notes": "Operators can sign transactions using the hot wallet"
  }
}
```

### Policy 2: Hot Wallet DENY (per-transaction limit)

Block any single hot wallet transaction above 1 ETH (1000000000000000000 wei).

```
POST https://api.turnkey.com/public/v1/submit/create_policy
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_POLICY_V3",
  "timestampMs": "1234567890006",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "policyName": "treasury-hot-wallet-deny-large-tx",
    "effect": "EFFECT_DENY",
    "condition": "eth.tx.value > 1000000000000000000",
    "consensus": "approvers.any(user, user.tags.contains('treasury-operator'))",
    "notes": "Block EVM transactions above 1 ETH. Scoped to treasury operators via consensus. Split chain-specific DENY policies into separate rules to avoid policy engine evaluation errors."
  }
}
```

### Policy 3: Cold Wallet ALLOW (2-of-3 multi-sig)

Requires 2 of the 3 treasury admins to approve any cold wallet signing.

```
POST https://api.turnkey.com/public/v1/submit/create_policy
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_POLICY_V3",
  "timestampMs": "1234567890007",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "policyName": "treasury-cold-wallet-multisig",
    "effect": "EFFECT_ALLOW",
    "consensus": "approvers.filter(user, user.tags.contains('treasury-admin')).count() >= 2",
    "condition": "private_key.tags.contains('cold-storage')",
    "notes": "Cold wallet requires 2-of-3 admin approval for any signing operation"
  }
}
```

### Policy 4: Cold Wallet Address Allowlist

Cold wallet can only send to the hot wallet address and a known exchange address.

```
POST https://api.turnkey.com/public/v1/submit/create_policy
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_POLICY_V3",
  "timestampMs": "1234567890008",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "policyName": "treasury-cold-wallet-allowlist",
    "effect": "EFFECT_DENY",
    "condition": "!(eth.tx.to in ['0x1234567890abcdef1234567890abcdef12345678', '0xEXCHANGE_ADDRESS']) && private_key.tags.contains('cold-storage')",
    "notes": "Deny cold wallet transactions to addresses not in the allowlist. Add new addresses by updating this policy condition."
  }
}
```

Note: this uses a DENY with a negated condition. Any transaction to an address NOT in the list is denied. This is safer than an ALLOW allowlist because DENY always takes precedence.

### Policy 5: Global DENY Guardrails

Block dangerous administrative operations for non-root users.

```
POST https://api.turnkey.com/public/v1/submit/create_policy
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_POLICY_V3",
  "timestampMs": "1234567890009",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "policyName": "treasury-global-deny-dangerous-ops",
    "effect": "EFFECT_DENY",
    "condition": "activity.action in ['DELETE_WALLETS', 'EXPORT_WALLET', 'UPDATE_ROOT_QUORUM']",
    "notes": "Block wallet deletion, export, and root quorum changes. Only root quorum (which bypasses policies) can perform these."
  }
}
```

## Step 6: Verify the Setup

### Test hot wallet signing

Sign a test payload with the hot wallet. This should succeed immediately (single signer).

```
POST https://api.turnkey.com/public/v1/submit/sign_raw_payload
```

```json
{
  "type": "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2",
  "timestampMs": "1234567890010",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "signWith": "0x1234567890abcdef1234567890abcdef12345678",
    "payload": "68656c6c6f",
    "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
    "hashFunction": "HASH_FUNCTION_SHA256"
  }
}
```

**Expected response:** `activity.status` is `ACTIVITY_STATUS_COMPLETED`.

### Test cold wallet signing

Sign a test payload with the cold wallet. This should trigger multi-sig.

```
POST https://api.turnkey.com/public/v1/submit/sign_raw_payload
```

```json
{
  "type": "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2",
  "timestampMs": "1234567890011",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "signWith": "0xabcdef1234567890abcdef1234567890abcdef12",
    "payload": "68656c6c6f",
    "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
    "hashFunction": "HASH_FUNCTION_SHA256"
  }
}
```

**Expected response:** `activity.status` is `ACTIVITY_STATUS_CONSENSUS_NEEDED`.

If the cold wallet test returns `COMPLETED`, the multi-sig policy is not working. Check that:
- The cold wallet keys are tagged with `cold-storage`
- The consensus expression uses `.count() >= 2`
- The signing user is not a root quorum member (root bypasses all policies)

### Complete the multi-sig test

Have a second admin approve the pending activity:

```
POST https://api.turnkey.com/public/v1/submit/approve_activity
```

```json
{
  "type": "ACTIVITY_TYPE_APPROVE_ACTIVITY",
  "timestampMs": "1234567890012",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "fingerprint": "<ACTIVITY_FINGERPRINT>"
  }
}
```

After approval, check the original activity status. It should now be `ACTIVITY_STATUS_COMPLETED`.

## Summary

After completing this walkthrough, your treasury has:

- 3 operator users (2 admins, 1 operator) with role tags
- 2 wallets (hot and cold) with Ethereum and Solana accounts
- Private key tags linking wallets to policy rules
- 5 policies: hot ALLOW, hot DENY limit, cold multi-sig ALLOW, cold address allowlist, global guardrails
- Verified hot wallet signs immediately and cold wallet requires multi-sig
