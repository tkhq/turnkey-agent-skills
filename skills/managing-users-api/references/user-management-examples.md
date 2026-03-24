# User Management Examples

Complete examples for user CRUD operations, tag management, and identity queries using the Turnkey API.

## Whoami: check current identity

```
POST https://api.turnkey.com/public/v1/query/whoami
```

```json
{
  "organizationId": "<ORGANIZATION_ID>"
}
```

Returns your userId, username, and organizationId. Use this to verify credentials before performing other operations.

## Create multiple users in one call

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
      }
    ]
  }
}
```

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

The response includes the user's API keys (public keys only), authenticators, tags, email, and phone number.

## List all users

```
POST https://api.turnkey.com/public/v1/query/list_users
```

```json
{
  "organizationId": "<ORGANIZATION_ID>"
}
```

## Update user email

```
POST https://api.turnkey.com/public/v1/submit/update_user_email
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

## Update user name

```
POST https://api.turnkey.com/public/v1/submit/update_user_name
```

```json
{
  "type": "ACTIVITY_TYPE_UPDATE_USER_NAME",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "userId": "<USER_ID>",
    "userName": "new-display-name"
  }
}
```

## Update user phone number

```
POST https://api.turnkey.com/public/v1/submit/update_user_phone_number
```

```json
{
  "type": "ACTIVITY_TYPE_UPDATE_USER_PHONE_NUMBER",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "userId": "<USER_ID>",
    "phoneNumber": "+1234567890"
  }
}
```

## Update user (general, multiple fields)

```
POST https://api.turnkey.com/public/v1/submit/update_user
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

## Delete users

```
POST https://api.turnkey.com/public/v1/submit/delete_users
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

## Create a user tag and attach to users

```
POST https://api.turnkey.com/public/v1/submit/create_user_tag
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

## Update a user tag (rename and reassign)

```
POST https://api.turnkey.com/public/v1/submit/update_user_tag
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

## List user tags

```
POST https://api.turnkey.com/public/v1/query/list_user_tags
```

```json
{
  "organizationId": "<ORGANIZATION_ID>"
}
```

## Delete user tags

```
POST https://api.turnkey.com/public/v1/submit/delete_user_tags
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

## Recover a user

Used after an email or SMS recovery flow to register a new passkey for a user who has lost access.

```
POST https://api.turnkey.com/public/v1/submit/recover_user
```

```json
{
  "type": "ACTIVITY_TYPE_RECOVER_USER",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "userId": "<USER_ID>",
    "authenticator": {
      "authenticatorName": "recovery-passkey",
      "challenge": "<WEBAUTHN_CHALLENGE>",
      "attestation": {
        "credentialId": "<CREDENTIAL_ID>",
        "clientDataJson": "<CLIENT_DATA_JSON>",
        "attestationObject": "<ATTESTATION_OBJECT>",
        "transports": ["AUTHENTICATOR_TRANSPORT_HYBRID"]
      }
    }
  }
}
```
