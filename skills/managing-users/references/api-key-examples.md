# API Key Examples

Complete request/response examples for API key lifecycle and rotation.

**Base URL:** `https://api.turnkey.com`

## Get all API keys for a user

```
POST /public/v1/query/get_api_keys
```

```json
{
  "organizationId": "<ORG_ID>",
  "userId": "usr_..."
}
```

**Response:**

```json
{
  "apiKeys": [
    {
      "apiKeyId": "key_...",
      "apiKeyName": "alice-key",
      "publicKey": "04abc123...",
      "curveType": "API_KEY_CURVE_P256",
      "createdAt": { "seconds": "1700000000", "nanos": "0" },
      "updatedAt": { "seconds": "1700000000", "nanos": "0" }
    }
  ]
}
```

## Get a single API key

```
POST /public/v1/query/get_api_key
```

```json
{
  "organizationId": "<ORG_ID>",
  "apiKeyId": "key_..."
}
```

## Create API keys

Add one or more API keys to a user. Generate the key pair locally — only register the public key.

```
POST /public/v1/submit/create_api_keys
```

```json
{
  "userId": "usr_...",
  "apiKeys": [{
    "apiKeyName": "new-key",
    "publicKey": "04def456...",
    "curveType": "API_KEY_CURVE_P256"
  }]
}
```

**Response:**

```json
{
  "activity": {
    "id": "act_...",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_API_KEYS_V2",
    "result": {
      "createApiKeysResult": {
        "apiKeyIds": ["key_new_..."]
      }
    }
  }
}
```

## Delete API keys

```
POST /public/v1/submit/delete_api_keys
```

```json
{
  "userId": "usr_...",
  "apiKeyIds": ["key_old_..."]
}
```

Deleting all of a user's API keys immediately revokes their API access.

## Key rotation workflow

Rotate keys without downtime. Each step must succeed before proceeding to the next.

### Step 1: Generate new key pair locally

Generate a P-256 key pair. The private key stays on your machine.

### Step 2: Register the new public key

```
POST /public/v1/submit/create_api_keys
```

```json
{
  "userId": "usr_agent",
  "apiKeys": [{
    "apiKeyName": "agent-key-v2",
    "publicKey": "<NEW_PUBLIC_KEY>",
    "curveType": "API_KEY_CURVE_P256"
  }]
}
```

Sign this request with the **old** key (it's still active).

### Step 3: Verify the new key works

```
POST /public/v1/query/whoami
```

```json
{
  "organizationId": "<ORG_ID>"
}
```

Sign this request with the **new** key. If it returns your user details, the new key is working.

### Step 4: Delete the old key

```
POST /public/v1/submit/delete_api_keys
```

```json
{
  "userId": "usr_agent",
  "apiKeyIds": ["<OLD_KEY_ID>"]
}
```

Sign this request with the **new** key (the old one is about to be deleted).

### Step 5: Update the agent's runtime

Replace `TURNKEY_API_PUBLIC_KEY` and `TURNKEY_API_PRIVATE_KEY` in the agent's environment with the new key pair.

## Emergency: Revoke agent access immediately

If an agent is compromised, delete all its API keys in one call:

```
POST /public/v1/submit/delete_api_keys
```

```json
{
  "userId": "usr_agent",
  "apiKeyIds": ["key_1", "key_2"]
}
```

The agent can no longer authenticate. This takes effect immediately — no waiting for session expiry.

## Supported key curves

| Curve | Use case |
|-------|----------|
| `API_KEY_CURVE_P256` | Default. Recommended for most API authentication. |
| `API_KEY_CURVE_SECP256K1` | Compatible with Ethereum-style signing patterns. |
| `API_KEY_CURVE_ED25519` | Ed25519-based authentication. |

All three curves are supported for API key authentication. `API_KEY_CURVE_P256` is the default and most commonly used.
