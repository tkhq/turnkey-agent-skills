# User Management Examples

Complete request/response examples for user lifecycle operations.

**Base URL:** `https://api.turnkey.com`

**Request body convention:** JSON bodies below are the `parameters` object SDK methods take. For raw HTTP against `POST /public/v1/submit/*` endpoints (e.g., `create_users`, `delete_users`, `update_user`, `create_user_tag`), wrap in the activity envelope: `{"type": "ACTIVITY_TYPE_*", "timestampMs": "<ms>", "organizationId": "<ORG_ID>", "parameters": {...}}`. Query endpoints (`POST /public/v1/query/*`) take the body as shown. See the root [`SKILL.md`](../../../SKILL.md) "Request body convention" for details.

## Verify identity

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
  "userId": "usr_...",
  "username": "alice",
  "organizationId": "org_...",
  "organizationName": "my-org"
}
```

## List users

```
POST /public/v1/query/list_users
```

```json
{
  "organizationId": "<ORG_ID>"
}
```

**Response:**

```json
{
  "users": [
    {
      "userId": "usr_...",
      "userName": "alice",
      "userEmail": "alice@example.com",
      "userTags": ["tag_engineering123"],
      "apiKeys": [
        {
          "apiKeyId": "key_...",
          "apiKeyName": "alice-key",
          "publicKey": "04abc...",
          "curveType": "API_KEY_CURVE_P256"
        }
      ],
      "authenticators": [],
      "createdAt": { "seconds": "1700000000", "nanos": "0" },
      "updatedAt": { "seconds": "1700000000", "nanos": "0" }
    }
  ]
}
```

## Get user details

```
POST /public/v1/query/get_user
```

```json
{
  "organizationId": "<ORG_ID>",
  "userId": "usr_..."
}
```

## Create a human user with email

`userTags` takes tag **IDs**, not names. If the `engineering` tag doesn't exist yet, create it first:

```
POST /public/v1/submit/create_user_tag
```

```json
{
  "userTagName": "engineering",
  "userIds": []
}
```

**Response** (capture `userTagId`):

```json
{
  "activity": {
    "result": {
      "createUserTagResult": {
        "userTagId": "tag_engineering123"
      }
    }
  }
}
```

Then create the user, passing the tag's ID:

```
POST /public/v1/submit/create_users
```

```json
{
  "users": [{
    "userName": "alice",
    "userEmail": "alice@example.com",
    "apiKeys": [{
      "apiKeyName": "alice-key",
      "publicKey": "04abc123def456...",
      "curveType": "API_KEY_CURVE_P256"
    }],
    "authenticators": [],
    "userTags": ["tag_engineering123"]
  }]
}
```

**Response:**

```json
{
  "activity": {
    "id": "act_...",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_USERS_V2",
    "result": {
      "createUsersResultV2": {
        "userIds": ["usr_..."]
      }
    }
  }
}
```

## Create a non-root agent user

Agent users should be non-root with a tag for policy targeting. Do not include `userEmail` — agents don't need email. Create the `agent` tag first (via `create_user_tag` — shown above) to get its `userTagId`, then:

```json
{
  "users": [{
    "userName": "trading-agent",
    "apiKeys": [{
      "apiKeyName": "agent-key-v1",
      "publicKey": "04fed987cba654...",
      "curveType": "API_KEY_CURVE_P256"
    }],
    "authenticators": [],
    "userTags": ["tag_agent456"]
  }]
}
```

`userTags` holds the tag's **ID** (`tag_agent456`). Policy expressions target the tag's **name**: `approvers.any(user, user.tags.contains('agent'))`. Same tag object, different addressable fields — see the "Tag IDs vs. tag names" callout in `SKILL.md`.

## Create multiple users in one call

Each user's `userTags` contains tag **IDs**. The `trading` and `monitoring` tags must already exist (or be created via `create_user_tag`) to get their IDs:

```json
{
  "users": [
    {
      "userName": "agent-1",
      "apiKeys": [{ "apiKeyName": "agent-1-key", "publicKey": "04aaa...", "curveType": "API_KEY_CURVE_P256" }],
      "authenticators": [],
      "userTags": ["tag_agent456", "tag_trading789"]
    },
    {
      "userName": "agent-2",
      "apiKeys": [{ "apiKeyName": "agent-2-key", "publicKey": "04bbb...", "curveType": "API_KEY_CURVE_P256" }],
      "authenticators": [],
      "userTags": ["tag_agent456", "tag_monitoring012"]
    }
  ]
}
```

## Update user

General update (name, email, tags):

```
POST /public/v1/submit/update_user
```

```json
{
  "userId": "usr_...",
  "userName": "alice-updated",
  "userEmail": "newalice@example.com",
  "userTagIds": ["tag_engineering", "tag_admin"]
}
```

Update email only:

```
POST /public/v1/submit/update_user_email
```

```json
{
  "userId": "usr_...",
  "email": "new-email@example.com"
}
```

## Delete users

Permanently removes users and revokes all credentials:

```
POST /public/v1/submit/delete_users
```

```json
{
  "userIds": ["usr_abc123", "usr_def456"]
}
```

## User tag operations

### Create a tag

```
POST /public/v1/submit/create_user_tag
```

```json
{
  "userTagName": "trader",
  "userIds": ["usr_abc123", "usr_def456"]
}
```

### Update a tag (rename and reassign)

```
POST /public/v1/submit/update_user_tag
```

```json
{
  "userTagId": "tag_...",
  "newUserTagName": "senior-trader",
  "addUserIds": ["usr_ghi789"],
  "removeUserIds": ["usr_abc123"]
}
```

This operation is atomic — all updates succeed together or all fail.

### List tags

```
POST /public/v1/query/list_user_tags
```

```json
{
  "organizationId": "<ORG_ID>"
}
```

### Delete tags

Removes the tag association, not the users:

```
POST /public/v1/submit/delete_user_tags
```

```json
{
  "userTagIds": ["tag_old"]
}
```
