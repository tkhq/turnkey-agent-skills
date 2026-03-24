# API Key Examples

Complete examples for generating, managing, and rotating API keys using the Turnkey API.

## Generate keys with different curves

Generate key pairs locally using any crypto library. The supported curves are:

- **P-256** (API_KEY_CURVE_P256): Default. Recommended for most use cases.
- **secp256k1** (API_KEY_CURVE_SECP256K1): Compatible with Ethereum-style signing.
- **Ed25519** (API_KEY_CURVE_ED25519): Used for Ed25519-based authentication.

The public key should be hex-encoded. Store the private key securely for signing API requests via the X-Stamp header.

## Create multiple users in one API call

```
POST https://api.turnkey.com/public/v1/submit/create_users
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_USERS_V2",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "users": [
      {
        "userName": "alice",
        "userEmail": "alice@example.com",
        "apiKeys": [{
          "apiKeyName": "alice-key",
          "publicKey": "<ALICE_PUBLIC_KEY>",
          "curveType": "API_KEY_CURVE_P256"
        }],
        "authenticators": [],
        "userTags": ["engineering"]
      },
      {
        "userName": "bob",
        "userEmail": "bob@example.com",
        "apiKeys": [{
          "apiKeyName": "bob-key",
          "publicKey": "<BOB_PUBLIC_KEY>",
          "curveType": "API_KEY_CURVE_P256"
        }],
        "authenticators": [],
        "userTags": ["operations"]
      },
      {
        "userName": "charlie",
        "userEmail": "charlie@example.com",
        "apiKeys": [
          {
            "apiKeyName": "charlie-primary",
            "publicKey": "<CHARLIE_PUBLIC_KEY_1>",
            "curveType": "API_KEY_CURVE_P256"
          },
          {
            "apiKeyName": "charlie-backup",
            "publicKey": "<CHARLIE_PUBLIC_KEY_2>",
            "curveType": "API_KEY_CURVE_ED25519"
          }
        ],
        "authenticators": [],
        "userTags": ["admin"]
      }
    ]
  }
}
```

A single user can have multiple API keys with different curves. This is useful for providing backup access or supporting different authentication flows.

## Get user details

```
POST https://api.turnkey.com/public/v1/query/get_user
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "userId": "<USER_ID>"
}
```

The response includes the user's API keys (public keys only), authenticators, and tags.

## Key rotation pattern

Key rotation follows a three-step process: create the new key, register it, verify it works, then delete the old key.

### Step 1: Generate a new API key

Generate a new P-256 key pair locally using any crypto library. Save the hex-encoded public key for registration.

### Step 2: Register the new key with your user

```
POST https://api.turnkey.com/public/v1/submit/create_api_keys
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_API_KEYS",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "userId": "<YOUR_USER_ID>",
    "apiKeys": [{
      "apiKeyName": "rotated-key",
      "publicKey": "<NEW_PUBLIC_KEY>",
      "curveType": "API_KEY_CURVE_P256"
    }]
  }
}
```

### Step 3: Verify the new key works

Sign a request using the new private key and make a test call:

```
POST https://api.turnkey.com/public/v1/query/list_users
```

```json
{
  "organizationId": "<ORGANIZATION_ID>"
}
```

If this returns successfully, the new key is working.

### Step 4: Delete the old key

Sign this request with the new key:

```
POST https://api.turnkey.com/public/v1/submit/delete_api_keys
```

```json
{
  "type": "ACTIVITY_TYPE_DELETE_API_KEYS",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "userId": "<YOUR_USER_ID>",
    "apiKeyIds": ["<OLD_API_KEY_ID>"]
  }
}
```

The `apiKeyIds` field accepts an array, so you can delete multiple old keys at once.

## List all API keys for a user

To see all API keys associated with a user, use `get_user` and inspect the `apiKeys` field in the response:

```
POST https://api.turnkey.com/public/v1/query/get_user
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "userId": "<USER_ID>"
}
```

The response includes each key's `apiKeyId`, `apiKeyName`, and `publicKey`. Use the `apiKeyId` values when deleting keys.
