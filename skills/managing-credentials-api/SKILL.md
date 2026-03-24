---
name: managing-credentials-api
description: "Generates API key pairs, creates users, and manages organizations using the Turnkey API. Covers key generation, user provisioning, sub-organization setup, and encryption key management. Use when asked to 'generate an API key', 'create a turnkey API key', 'authenticate with Turnkey API', 'add a user to my turnkey organization', 'create a sub-organization', 'generate an encryption key', 'rotate API keys', 'list turnkey users', 'create an organization via Turnkey API', or 'provision API access'. Do NOT use for creating wallets (use creating-wallets-api), signing transactions (use signing-transactions-api), managing policies (use managing-policies-api)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). All requests use the X-Stamp authentication header."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["api-keys", "organization", "users", "encryption-keys", "sub-organization", "authentication"]
---

# Generating API Keys

## Quick Start

Use the Turnkey API to generate and register API key pairs for authenticating with the Turnkey platform. API keys are P-256 key pairs where the public key is registered with Turnkey and the private key is stored locally.

## Prerequisites

You need an organization ID from the Turnkey dashboard (app.turnkey.com) and a P-256 key pair for authenticating API requests.

## Authentication

Every request to `https://api.turnkey.com` must include an `X-Stamp` header. This header proves you hold the private key corresponding to a registered API key.

To construct the `X-Stamp` header:

1. Serialize the request body as a JSON string.
2. Sign the JSON string bytes with your P-256 private key using ECDSA.
3. Hex-encode the DER signature.
4. Create a stamp JSON object:
   ```json
   {
     "publicKey": "<hex-encoded-public-key>",
     "signature": "<hex-encoded-DER-signature>",
     "scheme": "SIGNATURE_SCHEME_TK_API_P256"
   }
   ```
5. Base64URL-encode the stamp JSON string.
6. Set the result as the `X-Stamp` header on every request.

All examples below assume the `X-Stamp` header is present on each request.

## Instructions

### Step 1: Generate an API key pair

Generate a P-256 key pair locally using any crypto library (e.g., OpenSSL, Node.js crypto, Go crypto/ecdsa). The public key should be hex-encoded in uncompressed form.

Supported key curves:

| API Enum | Notes |
|----------|-------|
| API_KEY_CURVE_P256 | Default. Recommended for most use cases. |
| API_KEY_CURVE_SECP256K1 | Compatible with Ethereum-style signing. |
| API_KEY_CURVE_ED25519 | Used for Ed25519-based authentication. |

Once generated, register the public key with your user via the API (see Step 2 for creating users, or the key rotation section in the references for adding keys to existing users).

### Step 2: Create a user with API keys

```
POST https://api.turnkey.com/public/v1/submit/create_users
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
        "publicKey": "<PUBLIC_KEY_FROM_STEP_1>",
        "curveType": "API_KEY_CURVE_P256"
      }],
      "authenticators": [],
      "userTags": []
    }]
  }
}
```

The `publicKey` field is the hex-encoded public key from Step 1.

### Step 3: List users

```
POST https://api.turnkey.com/public/v1/query/list_users
```

```json
{
  "organizationId": "<ORGANIZATION_ID>"
}
```

### Step 4: Create a sub-organization (for multi-tenant apps)

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

Sub-organizations provide full tenant isolation. Each sub-org has its own users, wallets, and policies independent of the parent organization.

### Step 5: Generate an encryption key (for wallet import/export)

Generate a P-256 HPKE key pair locally using any crypto library that supports HPKE (Hybrid Public Key Encryption). This is a client-side operation. The resulting target encryption key is used for secure wallet import/export operations. These are separate from API keys and serve a different purpose.

For complete examples including key rotation and sub-organization patterns, see [references/api-key-examples.md](references/api-key-examples.md) and [references/sub-organization-examples.md](references/sub-organization-examples.md).

## Rules

- Never expose private API keys in logs, commits, or shared environments.
- Store private keys securely using your platform's secret management (e.g., environment variables, vault, HSM).
- Always include the `organizationId` field in request bodies.
- Sub-organizations provide tenant isolation; each sub-org has its own users, wallets, and policies.
- Root quorum users bypass all policies. Minimize root quorum membership.
- Rotate API keys periodically by creating a new key, verifying it works, then deleting the old one.

## Related Skills

- `creating-wallets-api` for wallet creation and address derivation via API
- `signing-transactions-api` for signing transactions via API
- `managing-policies-api` for access control and transaction governance via API
- `setup-account-workflow` for end-to-end organization bootstrapping (keys, wallets, first signature)
- `wallet-governance-workflow` for production hardening (policies, scoped users, governance)
