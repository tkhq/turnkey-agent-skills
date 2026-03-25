---
name: managing-organizations-api
description: "Manages Turnkey organizations, sub-organizations, root quorum, and organization features using the Turnkey HTTP API. Sub-organizations are Turnkey's multi-tenancy primitive, providing full isolation of users, wallets, and policies per tenant. Use when asked to 'create a sub-organization', 'manage organization settings', 'sub-org', 'multi-tenant setup', 'root quorum', 'update quorum threshold', 'organization features', 'update quorum', 'list sub-organizations', 'delete sub-organization', 'set organization feature', 'get organization config', or 'rename organization'. Do NOT use for user management (use managing-users-api), wallet operations (use managing-wallets-api), signing transactions (use signing-transactions-api), or policy management (use managing-policies-api)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). See managing-users-api for authentication setup."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["organization", "sub-organization", "multi-tenant", "root-quorum", "features", "api", "isolation"]
---

## Quick Start

Use the Turnkey API to create and manage organizations, sub-organizations, root quorum settings, and organization features. Sub-organizations are the core multi-tenancy primitive: each sub-org is a fully isolated namespace with its own users, wallets, and policies.

## Prerequisites

Requires API keys configured (see managing-users-api skill). You need your parent organization ID from the Turnkey dashboard (app.turnkey.com).

## Key Concept: Sub-Organization Isolation

Each sub-organization is a fully isolated namespace. It has its own users, wallets, policies, and settings, completely independent of the parent organization and other sub-orgs. This is how Turnkey implements multi-tenancy. The typical pattern is one sub-org per end user or customer.

The parent organization can create and delete sub-orgs, but cannot access resources within them. A sub-org's root users control everything inside that sub-org.

## Instructions

### Check current organization config

Before modifying quorum or features, always check the current state.

```
POST https://api.turnkey.com/public/v1/query/get_configs
```

```json
{
  "organizationId": "<ORGANIZATION_ID>"
}
```

Note: Unlike most query endpoints, the SDK does not auto-inject `organizationId` for this call. You must pass `{ organizationId: "<ORG_ID>" }` explicitly.

Returns the current quorum settings (threshold, user IDs) and enabled features.

### Create a sub-organization

Creates a sub-org with root users and optional wallets in a single atomic call.

```
POST https://api.turnkey.com/public/v1/submit/create_sub_organization
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V7",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<PARENT_ORGANIZATION_ID>",
  "parameters": {
    "subOrganizationName": "customer-123",
    "rootUsers": [{
      "userName": "root-user",
      "userEmail": "root@example.com",
      "apiKeys": [{
        "apiKeyName": "root-key",
        "publicKey": "<PUBLIC_KEY>",
        "curveType": "API_KEY_CURVE_P256"
      }],
      "authenticators": [],
      "oauthProviders": []
    }],
    "rootQuorumThreshold": 1
  }
}
```

You can also include a `wallet` field to atomically create a wallet with the sub-org. See [references/sub-organization-examples.md](references/sub-organization-examples.md) for wallet creation and multi-root-user patterns.

### List sub-organizations

```
POST https://api.turnkey.com/public/v1/query/get_sub_organizations
```

```json
{
  "organizationId": "<PARENT_ORGANIZATION_ID>",
  "filterType": "NAME",
  "filterValue": "customer-123",
  "paginationOptions": {
    "limit": "10"
  }
}
```

Filter types: `CREDENTIAL_ID`, `NAME`, `USERNAME`, `EMAIL`, `PHONE_NUMBER`, `OIDC_TOKEN`. Omit `filterType` and `filterValue` to list all sub-orgs.

For verified sub-orgs only (filtered by verified email or phone):

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

### Update organization name

```
POST https://api.turnkey.com/public/v1/submit/update_organization_name
```

```json
{
  "type": "ACTIVITY_TYPE_UPDATE_ORGANIZATION_NAME",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "organizationName": "new-org-name"
  }
}
```

### Delete a sub-organization

```
POST https://api.turnkey.com/public/v1/submit/delete_sub_organization
```

```json
{
  "type": "ACTIVITY_TYPE_DELETE_SUB_ORGANIZATION",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<SUB_ORGANIZATION_ID>",
  "parameters": {
    "deleteWithoutExport": true
  }
}
```

Set `deleteWithoutExport` to `true` to force deletion even if wallets/private keys have not been exported. Defaults to `false` (deletion blocked until export).

### Manage root quorum (HIGH STAKES)

The root quorum defines which users can perform root-level operations and how many must approve. Root quorum users bypass all policies.

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

CRITICAL: Always ensure `threshold` is less than or equal to the number of `userIds`. Setting threshold higher than the number of root users locks you out permanently.

### Set or remove organization features

Organization features enable capabilities like email auth, OTP, webhooks, and WebAuthn origins. Setting or removing features requires root quorum approval.

**Set a feature:**

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

**Remove a feature:**

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

Available feature names: `FEATURE_NAME_ROOT_USER_EMAIL_RECOVERY`, `FEATURE_NAME_WEBAUTHN_ORIGINS`, `FEATURE_NAME_EMAIL_AUTH`, `FEATURE_NAME_EMAIL_RECOVERY`, `FEATURE_NAME_OTP_EMAIL_AUTH`, `FEATURE_NAME_WEBHOOK`, `FEATURE_NAME_SMS_AUTH`, `FEATURE_NAME_SMS_OTP_AUTH`. For `WEBAUTHN_ORIGINS`, the value is a JSON-encoded list of allowed origins.

For detailed feature configuration examples, see [references/organization-examples.md](references/organization-examples.md).

## Activity Responses

All mutation endpoints (`submit/`) return an activity object with `status`, `type`, `intent`, and `result` fields. Poll the activity if the status is not yet complete. Query endpoints (`query/`) return results directly.

## Rules

- Sub-organizations provide full tenant isolation. One sub-org per end user or customer.
- The parent organization cannot access resources inside a sub-org.
- Always call `get_configs` before modifying quorum or features to verify current state.
- Root quorum threshold must be less than or equal to the number of root users. Violating this locks you out.
- Root quorum users bypass all policies. Minimize root quorum membership.
- Setting and removing organization features requires root quorum approval.
- Deleting a sub-org is blocked by default until all wallets and private keys are exported. Use `deleteWithoutExport: true` to override.
- Always include the `organizationId` field in request bodies.

## Related Skills

- `managing-users-api` for user provisioning, API key management, and authentication setup
- `managing-wallets-api` for wallet creation and address derivation
- `managing-policies-api` for access control and transaction governance
- `monitoring-activities-api` for tracking activity status and history
