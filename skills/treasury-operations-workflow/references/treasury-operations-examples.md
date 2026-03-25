# Treasury Operations Examples

Day-to-day treasury operations with complete request/response JSON.

## Process a Payment (Hot Wallet)

### 1. Check balance

```
POST https://api.turnkey.com/public/v1/query/get_balances
```

```json
{
  "organizationId": "<ORG_ID>",
  "accountAddress": "0x1234567890abcdef1234567890abcdef12345678"
}
```

**Response:**

```json
{
  "balances": [
    {
      "asset": "ETH",
      "balance": "2500000000000000000",
      "decimals": 18,
      "chain": "ethereum-mainnet"
    }
  ]
}
```

### 2. Sign and broadcast the transaction

Use `sign_transaction` to sign a pre-built unsigned transaction. Turnkey signs within the secure enclave and returns the signed transaction bytes.

```
POST https://api.turnkey.com/public/v1/submit/sign_transaction
```

```json
{
  "type": "ACTIVITY_TYPE_SIGN_TRANSACTION_V2",
  "timestampMs": "1234567890100",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "signWith": "0x1234567890abcdef1234567890abcdef12345678",
    "unsignedTransaction": "0x02f87001808459682f008459682f10825208940xRECIPIENT_ADDRESS880de0b6b3a764000080c0",
    "type": "TRANSACTION_TYPE_ETHEREUM"
  }
}
```

**Response:**

```json
{
  "activity": {
    "id": "act_sign_tx_001",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_SIGN_TRANSACTION_V2",
    "result": {
      "signTransactionResult": {
        "signedTransaction": "0x02f8b00180...signed_bytes..."
      }
    }
  }
}
```

The `signedTransaction` is ready to broadcast to the network via your preferred RPC provider (e.g., `eth_sendRawTransaction`).

### 3. Monitor the activity

```
POST https://api.turnkey.com/public/v1/query/get_activity
```

```json
{
  "organizationId": "<ORG_ID>",
  "activityId": "act_sign_tx_001"
}
```

Poll this endpoint until `activity.status` is `ACTIVITY_STATUS_COMPLETED` or `ACTIVITY_STATUS_FAILED`.

## Cold-to-Hot Replenishment (Multi-Sig Flow)

This flow demonstrates the full multi-sig approval process when moving funds from cold storage to the hot wallet.

### 1. First admin initiates the transfer

```
POST https://api.turnkey.com/public/v1/submit/sign_transaction
```

```json
{
  "type": "ACTIVITY_TYPE_SIGN_TRANSACTION_V2",
  "timestampMs": "1234567890200",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "signWith": "0xabcdef1234567890abcdef1234567890abcdef12",
    "unsignedTransaction": "0x02f87001808459682f008459682f10825208940x1234567890abcdef1234567890abcdef12345678886f05b59d3b20000080c0",
    "type": "TRANSACTION_TYPE_ETHEREUM"
  }
}
```

**Response (multi-sig triggered):**

```json
{
  "activity": {
    "id": "act_cold_transfer_001",
    "status": "ACTIVITY_STATUS_CONSENSUS_NEEDED",
    "type": "ACTIVITY_TYPE_SIGN_TRANSACTION_V2",
    "fingerprint": "fp_abc123def456",
    "result": null
  }
}
```

The `CONSENSUS_NEEDED` status means the policy engine found a matching ALLOW policy that requires multi-sig consensus. The transaction will not execute until enough approvers sign off.

### 2. Find pending activities (approval queue)

```
POST https://api.turnkey.com/public/v1/query/list_activities
```

```json
{
  "organizationId": "<ORG_ID>",
  "filterByStatus": ["ACTIVITY_STATUS_CONSENSUS_NEEDED"]
}
```

**Response:**

```json
{
  "activities": [
    {
      "id": "act_cold_transfer_001",
      "status": "ACTIVITY_STATUS_CONSENSUS_NEEDED",
      "type": "ACTIVITY_TYPE_SIGN_TRANSACTION_V2",
      "fingerprint": "fp_abc123def456",
      "createdAt": { "seconds": "1700000000" },
      "organizationId": "<ORG_ID>"
    }
  ]
}
```

### 3. Second admin approves

The second admin reviews the pending activity and approves it using the fingerprint.

```
POST https://api.turnkey.com/public/v1/submit/approve_activity
```

```json
{
  "type": "ACTIVITY_TYPE_APPROVE_ACTIVITY",
  "timestampMs": "1234567890201",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "fingerprint": "fp_abc123def456"
  }
}
```

**Response:**

```json
{
  "activity": {
    "id": "act_approve_001",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_APPROVE_ACTIVITY"
  }
}
```

### 4. Verify the original activity completed

```
POST https://api.turnkey.com/public/v1/query/get_activity
```

```json
{
  "organizationId": "<ORG_ID>",
  "activityId": "act_cold_transfer_001"
}
```

**Response:**

```json
{
  "activity": {
    "id": "act_cold_transfer_001",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_SIGN_TRANSACTION_V2",
    "result": {
      "signTransactionResult": {
        "signedTransaction": "0x02f8b00180...signed_bytes..."
      }
    }
  }
}
```

The signed transaction is now available for broadcast.

## Add Approved Destination Address

Update the cold wallet allowlist policy to include a new partner address.

### 1. Get the current policy

```
POST https://api.turnkey.com/public/v1/query/get_policy
```

```json
{
  "organizationId": "<ORG_ID>",
  "policyId": "<ALLOWLIST_POLICY_ID>"
}
```

**Response:**

```json
{
  "policy": {
    "policyId": "<ALLOWLIST_POLICY_ID>",
    "policyName": "treasury-cold-wallet-allowlist",
    "effect": "EFFECT_DENY",
    "condition": "!(eth.tx.to in ['0x1234567890abcdef1234567890abcdef12345678', '0xEXCHANGE_ADDRESS']) && private_key.tags.contains('cold-storage')",
    "notes": "Deny cold wallet transactions to addresses not in the allowlist"
  }
}
```

### 2. Update with the new address

```
POST https://api.turnkey.com/public/v1/submit/update_policy
```

```json
{
  "type": "ACTIVITY_TYPE_UPDATE_POLICY",
  "timestampMs": "1234567890300",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "policyId": "<ALLOWLIST_POLICY_ID>",
    "policyName": "treasury-cold-wallet-allowlist",
    "policyEffect": "EFFECT_DENY",
    "policyCondition": "!(eth.tx.to in ['0x1234567890abcdef1234567890abcdef12345678', '0xEXCHANGE_ADDRESS', '0xNEW_PARTNER_ADDRESS']) && private_key.tags.contains('cold-storage')",
    "policyNotes": "Deny cold wallet transactions to addresses not in the allowlist. Updated to include partner address."
  }
}
```

## Onboard a New Treasury Operator

### Create the user with the operator tag

```
POST https://api.turnkey.com/public/v1/submit/create_users
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_USERS_V2",
  "timestampMs": "1234567890400",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "users": [
      {
        "userName": "dave-treasury-operator",
        "userTags": ["treasury-operator"],
        "apiKeys": [{
          "apiKeyName": "dave-api-key",
          "publicKey": "04aabb...dave_public_key_hex..."
        }]
      }
    ]
  }
}
```

Because the hot wallet ALLOW policy uses `user.tags.contains('treasury-operator')` in its consensus expression, Dave automatically inherits hot wallet signing permissions. No policy changes are needed.

## Offboard a Treasury Operator

### 1. Revoke API key access

```
POST https://api.turnkey.com/public/v1/submit/delete_api_keys
```

```json
{
  "type": "ACTIVITY_TYPE_DELETE_API_KEYS",
  "timestampMs": "1234567890500",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "userId": "usr_carol_003",
    "apiKeyIds": ["<CAROL_API_KEY_ID>"]
  }
}
```

This immediately prevents Carol from authenticating. The user still exists but cannot make API calls.

### 2. Delete the user

```
POST https://api.turnkey.com/public/v1/submit/delete_users
```

```json
{
  "type": "ACTIVITY_TYPE_DELETE_USERS",
  "timestampMs": "1234567890501",
  "organizationId": "<ORG_ID>",
  "parameters": {
    "userIds": ["usr_carol_003"]
  }
}
```

No policy updates are needed. The tag-based policies automatically stop matching for the deleted user.
