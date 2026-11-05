# API Key Examples

> **CLI migration:** This is retained API parameter/semantic reference material. Execute supported core operations through the commands in the parent SKILL.md and root CLI convention. SDK authentication, stamping, inline key-generation scripts, and old envelope/retry instructions below are superseded. Import/export crypto and unvalidated request bridges remain explicit gaps; this reference alone does not establish CLI completion. Existing user authorization takes precedence over blanket per-call confirmation wording in legacy examples.


Complete request/response examples for API key lifecycle and rotation.

**Base URL:** `https://api.turnkey.com`

**Request body convention:** JSON bodies below are the `parameters` object SDK methods take. For raw HTTP against `POST /public/v1/submit/*` endpoints (e.g., `create_api_keys`, `delete_api_keys`), wrap in the activity envelope: `{"type": "ACTIVITY_TYPE_*", "timestampMs": "<ms>", "organizationId": "<ORG_ID>", "parameters": {...}}`. Query endpoints (`POST /public/v1/query/*`) take the body as shown. See the root [`SKILL.md`](../../../SKILL.md) "Request body convention" for details.

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
      "publicKey": "02abc123...",
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
    "publicKey": "03def456...",
    "curveType": "API_KEY_CURVE_P256"
  }]
}
```

Optionally pass `"expirationSeconds": "<SECONDS>"` on an API key to have it auto-expire. This is a useful defense-in-depth for agent keys — expired keys cannot sign, even if leaked. Example: `"expirationSeconds": "2592000"` for a 30-day key. `expirationSeconds` is also accepted when creating the user with `create_users` (inside `apiKeys[]`), so you can bake expiration into provisioning instead of patching afterwards.

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

Use this to remove specific retired or compromised keys only when the user keeps another valid credential.

```
POST /public/v1/submit/delete_api_keys
```

```json
{
  "userId": "usr_...",
  "apiKeyIds": ["key_old_..."]
}
```

Do not use `delete_api_keys` to remove a user's only valid credential. Turnkey rejects that request with `user missing valid credential`.

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

If a disposable, non-root agent is compromised, shut it down by deleting the agent user. First verify the target user with `get_user` and confirm it is the intended disposable agent, not a root/admin/human user:

```
POST /public/v1/query/get_user
```

```json
{
  "organizationId": "<ORG_ID>",
  "userId": "usr_agent"
}
```

After the safety check passes, warn that deletion is permanent and wait for explicit human confirmation:

```
POST /public/v1/submit/delete_users
```

```json
{
  "userIds": ["usr_agent"]
}
```

The agent can no longer authenticate or sign once `delete_users` succeeds. Use `delete_api_keys` only for users that will retain another valid credential, such as during key rotation.

## Supported key curves

| Curve | Use case |
|-------|----------|
| `API_KEY_CURVE_P256` | Default. Recommended for most API authentication. |
| `API_KEY_CURVE_SECP256K1` | Compatible with Ethereum-style signing patterns. |
| `API_KEY_CURVE_ED25519` | Ed25519-based authentication. |

All three curves are supported for API key authentication. `API_KEY_CURVE_P256` is the default and most commonly used.
