---
name: managing-users-api
description: "Manages user lifecycle, API keys, and user tags using the Turnkey API. Covers creating, updating, deleting, and listing users, API key generation and rotation, user tag management for policy targeting, and identity queries. Use when asked to 'create a user', 'add a user to my organization', 'manage users', 'generate an API key', 'create API keys', 'rotate API keys', 'delete API keys', 'user tags', 'tag a user', 'whoami', 'list users', 'update user email', 'update user name', 'recover a user', or 'get user details'. Do NOT use for sub-organizations (use managing-organizations-api), wallet operations (use managing-wallets-api), signing transactions (use signing-transactions-api), managing policies (use managing-policies-api)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). All requests use the X-Stamp authentication header."
metadata:
  version: "2.0.0"
  author: turnkey
  tags: ["users", "api-keys", "user-tags", "authentication", "identity"]
---

# Managing Users (API)

## Quick Start

Use the Turnkey API to manage users, API keys, and user tags within your organization. Base URL: `https://api.turnkey.com`

## Prerequisites

Requires Turnkey API credentials. Start with `getting-started-workflow` if the caller still needs initial credential setup.

## Making Requests

### Stamping (X-Stamp header)

Every request must include an `X-Stamp` header. Build it with standard CLI tools:

1. **Convert hex private key to PEM** (one-time): `echo "30310201010420${TURNKEY_API_PRIVATE_KEY}a00a06082a8648ce3d030107" | xxd -r -p | openssl ec -inform der -outform pem -out /tmp/tk_stamp.pem 2>/dev/null`
2. **Sign the request body**: `SIG_HEX=$(echo -n "$BODY" | openssl dgst -sha256 -sign /tmp/tk_stamp.pem | xxd -p -c 256)`
3. **Build stamp JSON**: `{"publicKey":"$TURNKEY_API_PUBLIC_KEY","signature":"$SIG_HEX","scheme":"SIGNATURE_SCHEME_TK_API_P256"}`
4. **Base64URL-encode and send**: `STAMP=$(echo -n "$STAMP_JSON" | base64 | tr '+/' '-_' | tr -d '=')` then add `-H "X-Stamp: $STAMP"` to curl.

Sign the **exact** body bytes. The public key must match a registered API key. All examples below assume this header is present.

- Query endpoints use `POST /public/v1/query/...` and include `organizationId` in the request body.
- Submit endpoints use `POST /public/v1/submit/...` and return an activity object.

## Instructions

### Users

#### Check current identity

```
POST /public/v1/query/whoami
```

```json
{
  "organizationId": "<ORGANIZATION_ID>"
}
```

Returns your userId, username, and organizationId. Useful for verifying credentials work before performing other operations.

#### Get user details

```
POST /public/v1/query/get_user
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "userId": "<USER_ID>"
}
```

Returns the user's API keys (public keys only), authenticators, tags, email, and phone number.

#### List users

```
POST /public/v1/query/list_users
```

```json
{
  "organizationId": "<ORGANIZATION_ID>"
}
```

#### Create users

```
POST /public/v1/submit/create_users
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_USERS_V2",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "users": [{
      "userName": "alice",
      "userEmail": "alice@example.com",
      "apiKeys": [{
        "apiKeyName": "alice-key",
        "publicKey": "<HEX_ENCODED_PUBLIC_KEY>",
        "curveType": "API_KEY_CURVE_P256"
      }],
      "authenticators": [],
      "userTags": ["engineering"]
    }]
  }
}
```

Accepts multiple users in a single call. Each user can have API keys, authenticators, and tags assigned at creation time.

#### Update user (general)

```
POST /public/v1/submit/update_user
```

```json
{
  "type": "ACTIVITY_TYPE_UPDATE_USER",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "userId": "<USER_ID>",
    "userName": "alice-updated",
    "userEmail": "newalice@example.com",
    "userTagIds": ["<TAG_ID_1>", "<TAG_ID_2>"]
  }
}
```

Updates name, email, and tag assignments in one call. Use the field-specific endpoints below when updating a single field.

#### Update individual fields

Each field-specific endpoint follows the same pattern. Parameters always include `userId` plus the new value.

| Endpoint | Activity Type | Parameter |
|----------|--------------|-----------|
| `/public/v1/submit/update_user_email` | `ACTIVITY_TYPE_UPDATE_USER_EMAIL` | `email` |
| `/public/v1/submit/update_user_name` | `ACTIVITY_TYPE_UPDATE_USER_NAME` | `userName` |
| `/public/v1/submit/update_user_phone_number` | `ACTIVITY_TYPE_UPDATE_USER_PHONE_NUMBER` | `phoneNumber` |

Example (update email):

```
POST /public/v1/submit/update_user_email
```

```json
{
  "type": "ACTIVITY_TYPE_UPDATE_USER_EMAIL",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "userId": "<USER_ID>",
    "email": "new-email@example.com"
  }
}
```

See [references/user-management-examples.md](references/user-management-examples.md) for all update variants.

#### Delete users

```
POST /public/v1/submit/delete_users
```

```json
{
  "type": "ACTIVITY_TYPE_DELETE_USERS",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "userIds": ["<USER_ID_1>", "<USER_ID_2>"]
  }
}
```

#### Recover a user

`POST /public/v1/submit/recover_user` with `ACTIVITY_TYPE_RECOVER_USER`. Parameters: `userId` and an `authenticator` object containing WebAuthn attestation data (authenticatorName, challenge, attestation with credentialId, clientDataJson, attestationObject, transports). Used after an email or SMS recovery flow to register a new passkey. See [references/user-management-examples.md](references/user-management-examples.md) for the full request body.

### User Tags

Tags let you group users for policy targeting. Write policies like `approvers.filter(user, user.tags.contains('trader')).count() >= 2` to require two traders to approve an action.

#### List user tags

```
POST /public/v1/query/list_user_tags
```

```json
{
  "organizationId": "<ORGANIZATION_ID>"
}
```

#### Create a user tag

```
POST /public/v1/submit/create_user_tag
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_USER_TAG",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "userTagName": "trader",
    "userIds": ["<USER_ID_1>", "<USER_ID_2>"]
  }
}
```

Creates a tag and attaches it to the specified users in one call.

#### Update a user tag

```
POST /public/v1/submit/update_user_tag
```

```json
{
  "type": "ACTIVITY_TYPE_UPDATE_USER_TAG",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "userTagId": "<TAG_ID>",
    "newUserTagName": "senior-trader",
    "addUserIds": ["<USER_ID_3>"],
    "removeUserIds": ["<USER_ID_1>"]
  }
}
```

This operation is atomic: all updates succeed together or all fail.

#### Delete user tags

```
POST /public/v1/submit/delete_user_tags
```

```json
{
  "type": "ACTIVITY_TYPE_DELETE_USER_TAGS",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "userTagIds": ["<TAG_ID_1>", "<TAG_ID_2>"]
  }
}
```

### API Keys

API keys are cryptographic key pairs used to authenticate with the Turnkey API. Generate the key pair locally, then register the public key with Turnkey.

Supported curves:

| Enum | Notes |
|------|-------|
| API_KEY_CURVE_P256 | Default. Recommended for most use cases. |
| API_KEY_CURVE_SECP256K1 | Compatible with Ethereum-style signing. |
| API_KEY_CURVE_ED25519 | Used for Ed25519-based authentication. |

#### Get API key details

```
POST /public/v1/query/get_api_key
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "apiKeyId": "<API_KEY_ID>"
}
```

#### Get all API keys for a user

```
POST /public/v1/query/get_api_keys
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "userId": "<USER_ID>"
}
```

#### Create API keys

```
POST /public/v1/submit/create_api_keys
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

#### Delete API keys

```
POST /public/v1/submit/delete_api_keys
```

```json
{
  "type": "ACTIVITY_TYPE_DELETE_API_KEYS",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "userId": "<USER_ID>",
    "apiKeyIds": ["<API_KEY_ID>"]
  }
}
```

#### Key rotation pattern

Rotate keys safely by following these steps in order:

1. Generate a new key pair locally.
2. Register the new public key via `create_api_keys`.
3. Verify the new key works by signing a test request (e.g., `whoami`).
4. Delete the old key via `delete_api_keys` (sign this request with the new key).

See [references/api-key-examples.md](references/api-key-examples.md) for the full rotation workflow.

## Activity Responses

All submit endpoints return an activity object. Poll the activity status if it is not `ACTIVITY_STATUS_COMPLETE`. The result is nested under `activity.result` with endpoint-specific fields (e.g., `createUsersResult.userIds`).

## Rules

- Never expose private API keys in logs, commits, or shared environments.
- Always include `organizationId` in request bodies.
- Rotate API keys periodically: create new, verify, then delete old.
- Use user tags to group users for policy-based access control.

## Related Skills

- Full wallet reference: `managing-wallets-api`
- Full signing reference: `signing-transactions-api`
- Full policy reference: `managing-policies-api`
- Full organization reference: `managing-organizations-api`
- Full activity monitoring reference: `monitoring-activities-api`
