# API Key Examples

Complete examples for generating, managing, and rotating API keys using the Turnkey API.

## Generate keys with different curves

Generate key pairs locally using any crypto library. The supported curves are:

- **P-256** (API_KEY_CURVE_P256): Default. Recommended for most use cases.
- **secp256k1** (API_KEY_CURVE_SECP256K1): Compatible with Ethereum-style signing.
- **Ed25519** (API_KEY_CURVE_ED25519): Used for Ed25519-based authentication.

The public key should be hex-encoded. Store the private key securely for signing API requests via the X-Stamp header.

## Get API key details

```
POST https://api.turnkey.com/public/v1/query/get_api_key
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "apiKeyId": "<API_KEY_ID>"
}
```

Returns the key's name, public key, curve type, and creation timestamp.

## Get all API keys for a user

```
POST https://api.turnkey.com/public/v1/query/get_api_keys
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "userId": "<USER_ID>"
}
```

Returns an array of API key objects. Each includes `apiKeyId`, `apiKeyName`, `publicKey`, and `curveType`. Use the `apiKeyId` values when deleting keys.

## Create API keys for an existing user

```
POST https://api.turnkey.com/public/v1/submit/create_api_keys
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_API_KEYS",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "userId": "<USER_ID>",
    "apiKeys": [{
      "apiKeyName": "new-key",
      "publicKey": "<HEX_ENCODED_PUBLIC_KEY>",
      "curveType": "API_KEY_CURVE_P256"
    }]
  }
}
```

A user can have multiple API keys with different curves. This is useful for backup access or supporting different authentication flows.

## Create a user with multiple API keys

```
POST https://api.turnkey.com/public/v1/submit/create_users
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_USERS_V2",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "users": [{
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
    }]
  }
}
```

## Delete API keys

```
POST https://api.turnkey.com/public/v1/submit/delete_api_keys
```

```json
{
  "type": "ACTIVITY_TYPE_DELETE_API_KEYS",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "userId": "<USER_ID>",
    "apiKeyIds": ["<OLD_API_KEY_ID_1>", "<OLD_API_KEY_ID_2>"]
  }
}
```

The `apiKeyIds` field accepts an array, so you can delete multiple keys at once.

## Key rotation workflow

Key rotation follows a four-step process: generate, register, verify, then delete.

### Step 1: Generate a new API key

Generate a new P-256 key pair locally using any crypto library. Save the hex-encoded public key for registration.

### Step 2: Register the new key

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

Sign a request using the new private key and call whoami:

```
POST https://api.turnkey.com/public/v1/query/whoami
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
