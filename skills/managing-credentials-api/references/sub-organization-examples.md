# Sub-Organization Examples

Complete examples for creating and managing sub-organizations using `turnkey request`.

## Create a sub-organization with a root user and API key

This is the basic pattern for setting up a new sub-organization with API key authentication.

```bash
# First, generate an API key for the sub-org root user
turnkey generate api-key --organization $ORGANIZATION_ID --key-name customer-123-root

# Then create the sub-organization
turnkey request --path /public/v1/submit/create_sub_organization --body '{
  "subOrganizationName": "customer-123",
  "rootUsers": [{
    "userName": "root-admin",
    "userEmail": "admin@customer123.com",
    "apiKeys": [{
      "apiKeyName": "root-admin-key",
      "publicKey": "<PUBLIC_KEY_FROM_GENERATE>",
      "curveType": "API_KEY_CURVE_P256"
    }],
    "authenticators": [],
    "oauthProviders": []
  }],
  "rootQuorumThreshold": 1
}' --organization $ORGANIZATION_ID
```

The `rootQuorumThreshold` determines how many root users must approve sensitive operations. Set to 1 for single-admin sub-orgs.

## Create a sub-organization with multiple root users

For higher security, require multiple root users to approve operations:

```bash
turnkey request --path /public/v1/submit/create_sub_organization --body '{
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
}' --organization $ORGANIZATION_ID
```

With `rootQuorumThreshold` set to 2, both root users must approve root-level operations.

## Create a sub-organization with a wallet (multi-tenant pattern)

This is the recommended pattern for applications where each customer gets their own sub-org with a wallet. The wallet is created atomically with the sub-organization.

```bash
turnkey request --path /public/v1/submit/create_sub_organization --body '{
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
        "path": "m/44'\'''/60'\'''/0'\'''/0/0",
        "addressFormat": "ADDRESS_FORMAT_ETHEREUM"
      },
      {
        "curve": "CURVE_ED25519",
        "pathFormat": "PATH_FORMAT_BIP32",
        "path": "m/44'\'''/501'\'''/0'\'''/0'\''",
        "addressFormat": "ADDRESS_FORMAT_SOLANA"
      }
    ]
  }
}' --organization $ORGANIZATION_ID
```

This creates a sub-organization with a wallet that has both Ethereum and Solana addresses in a single API call. The wallet is fully isolated within the sub-organization.

## Create a sub-organization with a wallet (using file input)

For complex JSON bodies, use file input to avoid shell escaping issues:

```json
// save as create-sub-org.json
{
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
      }
    ]
  }
}
```

```bash
turnkey request --path /public/v1/submit/create_sub_organization \
  --body @create-sub-org.json \
  --organization $ORGANIZATION_ID
```

## Note on listing sub-organizations

The Turnkey API does not currently provide a dedicated endpoint for listing sub-organizations. To track sub-organizations, maintain a mapping in your application database between your customer identifiers and the sub-organization IDs returned from the creation response.
