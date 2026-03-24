# Sub-Organization Examples

Complete examples for creating and managing sub-organizations using the Turnkey API.

## Create a sub-organization with a root user and API key

This is the basic pattern for setting up a new sub-organization with API key authentication.

First, generate a P-256 key pair locally for the sub-org root user. Then create the sub-organization:

```
POST https://api.turnkey.com/public/v1/submit/create_sub_organization
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V7",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "subOrganizationName": "customer-123",
    "rootUsers": [{
      "userName": "root-admin",
      "userEmail": "admin@customer123.com",
      "apiKeys": [{
        "apiKeyName": "root-admin-key",
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

The `rootQuorumThreshold` determines how many root users must approve sensitive operations. Set to 1 for single-admin sub-orgs.

## Create a sub-organization with multiple root users

For higher security, require multiple root users to approve operations:

```
POST https://api.turnkey.com/public/v1/submit/create_sub_organization
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V7",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "subOrganizationName": "enterprise-456",
    "rootUsers": [
      {
        "userName": "admin-primary",
        "userEmail": "primary@enterprise456.com",
        "apiKeys": [{
          "apiKeyName": "primary-key",
          "publicKey": "<PRIMARY_PUBLIC_KEY>",
          "curveType": "API_KEY_CURVE_P256"
        }],
        "authenticators": [],
        "oauthProviders": []
      },
      {
        "userName": "admin-secondary",
        "userEmail": "secondary@enterprise456.com",
        "apiKeys": [{
          "apiKeyName": "secondary-key",
          "publicKey": "<SECONDARY_PUBLIC_KEY>",
          "curveType": "API_KEY_CURVE_P256"
        }],
        "authenticators": [],
        "oauthProviders": []
      }
    ],
    "rootQuorumThreshold": 2
  }
}
```

With `rootQuorumThreshold` set to 2, both root users must approve root-level operations.

## Create a sub-organization with a wallet (multi-tenant pattern)

This is the recommended pattern for applications where each customer gets their own sub-org with a wallet. The wallet is created atomically with the sub-organization.

```
POST https://api.turnkey.com/public/v1/submit/create_sub_organization
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V7",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "subOrganizationName": "user-789",
    "rootUsers": [{
      "userName": "end-user",
      "userEmail": "user789@example.com",
      "apiKeys": [{
        "apiKeyName": "user-key",
        "publicKey": "<USER_PUBLIC_KEY>",
        "curveType": "API_KEY_CURVE_P256"
      }],
      "authenticators": [],
      "oauthProviders": []
    }],
    "rootQuorumThreshold": 1,
    "wallet": {
      "walletName": "Default Wallet",
      "accounts": [
        {
          "curve": "CURVE_SECP256K1",
          "pathFormat": "PATH_FORMAT_BIP32",
          "path": "m/44'/60'/0'/0/0",
          "addressFormat": "ADDRESS_FORMAT_ETHEREUM"
        },
        {
          "curve": "CURVE_ED25519",
          "pathFormat": "PATH_FORMAT_BIP32",
          "path": "m/44'/501'/0'/0'",
          "addressFormat": "ADDRESS_FORMAT_SOLANA"
        }
      ]
    }
  }
}
```

This creates a sub-organization with a wallet that has both Ethereum and Solana addresses in a single API call. The wallet is fully isolated within the sub-organization.

## Create a sub-organization with OAuth root user

For consumer applications using social login:

```
POST https://api.turnkey.com/public/v1/submit/create_sub_organization
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V7",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "subOrganizationName": "oauth-user-abc",
    "rootUsers": [{
      "userName": "google-user",
      "userEmail": "user@gmail.com",
      "apiKeys": [],
      "authenticators": [],
      "oauthProviders": [{
        "providerName": "google",
        "oidcToken": "<OIDC_TOKEN_FROM_GOOGLE>"
      }]
    }],
    "rootQuorumThreshold": 1
  }
}
```

## Delete a sub-organization

Sub-organization deletion is blocked by default until all wallets and private keys are exported. Use `deleteWithoutExport` to override.

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

Note: the `organizationId` here is the sub-organization's own ID, not the parent's.
