# Key Rotation Examples

Complete request/response for the 4-step API key rotation workflow.

**Base URL:** `https://api.turnkey.com`

**Request body convention:** JSON bodies below are the `parameters` object SDK methods take. For raw HTTP against `POST /public/v1/submit/*` endpoints (e.g., `create_api_keys`, `delete_api_keys`), wrap in the activity envelope: `{"type": "ACTIVITY_TYPE_*", "timestampMs": "<ms>", "organizationId": "<ORG_ID>", "parameters": {...}}`. Query endpoints (`POST /public/v1/query/*`) take the body as shown. See the root [`SKILL.md`](../../../SKILL.md) "Request body convention" for details.

## Prerequisites

You need:
- The agent's `userId` (from `list_users` or saved during provisioning)
- The old API key ID (from `get_api_keys`)
- A newly generated P-256 key pair (local)

## Step 1: List current API keys

```
POST /public/v1/query/get_api_keys
```

```json
{
  "organizationId": "<ORG_ID>",
  "userId": "usr-agent-003"
}
```

**Response:**

```json
{
  "apiKeys": [
    {
      "apiKeyId": "key-old-001",
      "apiKeyName": "agent-key-v1",
      "publicKey": "04abc123...",
      "curveType": "API_KEY_CURVE_P256",
      "createdAt": { "seconds": "1700000000", "nanos": "0" }
    }
  ]
}
```

Save `key-old-001` — this is the key you'll delete in Step 4.

## Step 2: Register the new key

Sign this with root credentials or the old agent key.

```
POST /public/v1/submit/create_api_keys
```

```json
{
  "userId": "usr-agent-003",
  "apiKeys": [{
    "apiKeyName": "agent-key-v2",
    "publicKey": "<NEW_PUBLIC_KEY>",
    "curveType": "API_KEY_CURVE_P256"
  }]
}
```

**Response:**

```json
{
  "activity": {
    "id": "act-create-key-001",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_API_KEYS_V2",
    "result": {
      "createApiKeysResult": {
        "apiKeyIds": ["key-new-002"]
      }
    }
  }
}
```

At this point, both old and new keys are active.

## Step 3: Verify the new key

Sign this request with the **new** key.

```
POST /public/v1/query/whoami
```

```json
{
  "organizationId": "<ORG_ID>"
}
```

**Response:**

```json
{
  "userId": "usr-agent-003",
  "username": "trading-agent",
  "organizationId": "<ORG_ID>"
}
```

If this succeeds, the new key is working. If it fails, check the key format and curve type before proceeding.

## Step 4: Delete the old key

Sign this request with the **new** key (the old one is about to be deleted).

```
POST /public/v1/submit/delete_api_keys
```

```json
{
  "userId": "usr-agent-003",
  "apiKeyIds": ["key-old-001"]
}
```

## Step 5: Update the agent's runtime

Replace the environment variables in the agent's runtime:

```env
TURNKEY_API_PUBLIC_KEY=<new public key>
TURNKEY_API_PRIVATE_KEY=<new private key>
```

The rotation is complete. The old key is revoked and the new key is active.

## Verify cleanup

Confirm only the new key remains:

```
POST /public/v1/query/get_api_keys
```

```json
{
  "organizationId": "<ORG_ID>",
  "userId": "usr-agent-003"
}
```

**Response:**

```json
{
  "apiKeys": [
    {
      "apiKeyId": "key-new-002",
      "apiKeyName": "agent-key-v2",
      "publicKey": "<NEW_PUBLIC_KEY>",
      "curveType": "API_KEY_CURVE_P256"
    }
  ]
}
```
