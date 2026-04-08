# User Management Examples

Complete request/response examples for user lifecycle operations.

**Base URL:** `https://api.turnkey.com`

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
      "userTags": ["engineering"],
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
    "userTags": ["engineering"]
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

Agent users should be non-root with a tag for policy targeting. Do not include `userEmail` — agents don't need email:

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
    "userTags": ["agent"]
  }]
}
```

The `agent` tag enables policy expressions like `approvers.any(user, user.tags.contains('agent'))`.

## Create multiple users in one call

```json
{
  "users": [
    {
      "userName": "agent-1",
      "apiKeys": [{ "apiKeyName": "agent-1-key", "publicKey": "04aaa...", "curveType": "API_KEY_CURVE_P256" }],
      "authenticators": [],
      "userTags": ["agent", "trading"]
    },
    {
      "userName": "agent-2",
      "apiKeys": [{ "apiKeyName": "agent-2-key", "publicKey": "04bbb...", "curveType": "API_KEY_CURVE_P256" }],
      "authenticators": [],
      "userTags": ["agent", "monitoring"]
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
