# Organization Management Examples

Examples for root quorum management, organization features, and org listing/filtering.

## Get current organization config

Always check current state before modifying quorum or features.

```
POST https://api.turnkey.com/public/v1/query/get_configs
```

```json
{
  "organizationId": "<ORGANIZATION_ID>"
}
```

The response includes the current quorum settings (threshold and user IDs) and a list of enabled features with their values.

## Root Quorum Management

### Update root quorum (add a member, raise threshold)

```
POST https://api.turnkey.com/public/v1/submit/update_root_quorum
```

```json
{
  "type": "ACTIVITY_TYPE_UPDATE_ROOT_QUORUM",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "threshold": 2,
    "userIds": ["<USER_ID_1>", "<USER_ID_2>", "<USER_ID_3>"]
  }
}
```

This sets the root quorum to require 2 out of 3 specified users to approve root-level operations.

### Lower quorum threshold (emergency recovery)

If a root user becomes unavailable and you need to lower the threshold:

```json
{
  "type": "ACTIVITY_TYPE_UPDATE_ROOT_QUORUM",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "threshold": 1,
    "userIds": ["<REMAINING_USER_ID_1>", "<REMAINING_USER_ID_2>"]
  }
}
```

CRITICAL: This still requires the current quorum threshold to approve. If you have lost enough root users to be below the current threshold, recovery is not possible through the API.

### Remove a root user from quorum

To remove a user from the root quorum, submit an update that excludes their ID:

```json
{
  "type": "ACTIVITY_TYPE_UPDATE_ROOT_QUORUM",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "threshold": 1,
    "userIds": ["<USER_ID_1>"]
  }
}
```

## Organization Features

### Enable email authentication

```
POST https://api.turnkey.com/public/v1/submit/set_organization_feature
```

```json
{
  "type": "ACTIVITY_TYPE_SET_ORGANIZATION_FEATURE",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "name": "FEATURE_NAME_EMAIL_AUTH",
    "value": "true"
  }
}
```

### Enable OTP email authentication

```json
{
  "type": "ACTIVITY_TYPE_SET_ORGANIZATION_FEATURE",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "name": "FEATURE_NAME_OTP_EMAIL_AUTH",
    "value": "true"
  }
}
```

### Enable SMS OTP authentication

```json
{
  "type": "ACTIVITY_TYPE_SET_ORGANIZATION_FEATURE",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "name": "FEATURE_NAME_SMS_OTP_AUTH",
    "value": "true"
  }
}
```

### Configure WebAuthn allowed origins

The value for `FEATURE_NAME_WEBAUTHN_ORIGINS` is a JSON-encoded list of allowed origins:

```json
{
  "type": "ACTIVITY_TYPE_SET_ORGANIZATION_FEATURE",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "name": "FEATURE_NAME_WEBAUTHN_ORIGINS",
    "value": "[\"https://app.example.com\", \"https://staging.example.com\"]"
  }
}
```

### Enable webhook notifications

```json
{
  "type": "ACTIVITY_TYPE_SET_ORGANIZATION_FEATURE",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "name": "FEATURE_NAME_WEBHOOK",
    "value": "true"
  }
}
```

### Remove a feature

```
POST https://api.turnkey.com/public/v1/submit/remove_organization_feature
```

```json
{
  "type": "ACTIVITY_TYPE_REMOVE_ORGANIZATION_FEATURE",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "name": "FEATURE_NAME_EMAIL_AUTH"
  }
}
```

### Available feature names reference

| Feature Name | Description | Value |
|-------------|-------------|-------|
| FEATURE_NAME_EMAIL_AUTH | Enable email-based authentication | `"true"` |
| FEATURE_NAME_OTP_EMAIL_AUTH | Enable OTP via email | `"true"` |
| FEATURE_NAME_SMS_AUTH | Enable SMS-based authentication | `"true"` |
| FEATURE_NAME_SMS_OTP_AUTH | Enable OTP via SMS | `"true"` |
| FEATURE_NAME_EMAIL_RECOVERY | Enable email-based recovery | `"true"` |
| FEATURE_NAME_ROOT_USER_EMAIL_RECOVERY | Enable root user email recovery | `"true"` |
| FEATURE_NAME_WEBAUTHN_ORIGINS | Allowed WebAuthn origins | JSON array of origin strings |
| FEATURE_NAME_WEBHOOK | Enable activity webhooks | `"true"` |

## Listing and Filtering Sub-Organizations

### List all sub-organizations

```
POST https://api.turnkey.com/public/v1/query/get_sub_organizations
```

```json
{
  "organizationId": "<PARENT_ORGANIZATION_ID>",
  "paginationOptions": {
    "limit": "100"
  }
}
```

Returns `organizationIds`, a list of sub-organization IDs.

### Filter sub-organizations by name

```json
{
  "organizationId": "<PARENT_ORGANIZATION_ID>",
  "filterType": "NAME",
  "filterValue": "customer-123"
}
```

### Filter sub-organizations by email

```json
{
  "organizationId": "<PARENT_ORGANIZATION_ID>",
  "filterType": "EMAIL",
  "filterValue": "user@example.com"
}
```

### Get verified sub-organizations by email

Returns only sub-orgs where the email has been verified:

```
POST https://api.turnkey.com/public/v1/query/get_verified_sub_organizations
```

```json
{
  "organizationId": "<PARENT_ORGANIZATION_ID>",
  "filterType": "EMAIL",
  "filterValue": "user@example.com"
}
```

Filter types for `get_verified_sub_organizations`: `EMAIL`, `PHONE_NUMBER`.

### Pagination

Both `get_sub_organizations` and `get_verified_sub_organizations` support pagination:

```json
{
  "organizationId": "<PARENT_ORGANIZATION_ID>",
  "paginationOptions": {
    "limit": "10",
    "after": "<LAST_ORG_ID_FROM_PREVIOUS_PAGE>"
  }
}
```

## Update Organization Name

```
POST https://api.turnkey.com/public/v1/submit/update_organization_name
```

```json
{
  "type": "ACTIVITY_TYPE_UPDATE_ORGANIZATION_NAME",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "organizationName": "my-updated-org-name"
  }
}
```
