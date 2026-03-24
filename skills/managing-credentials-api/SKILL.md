---
name: managing-credentials-api
description: "Generates API key pairs, creates users, and manages organizations using the Turnkey CLI and API endpoints. Covers key generation, user provisioning, sub-organization setup, and encryption key management. Use when asked to 'generate an API key', 'create a turnkey API key', 'set up turnkey CLI', 'add a user to my turnkey organization', 'create a sub-organization', 'generate an encryption key', 'rotate API keys', 'list turnkey users', 'create an organization via turnkey request', or 'provision API access'. Do NOT use for creating wallets (use creating-wallets-api), signing transactions (use signing-transactions-api), managing policies (use managing-policies-api), ."
license: Apache-2.0
compatibility: "Requires turnkey CLI (brew install tkhq/tap/turnkey). API keys stored in ~/.config/turnkey/keys/."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["api-keys", "cli", "organization", "users", "encryption-keys", "sub-organization"]
---

# Generating API Keys

## Quick Start

Use the Turnkey CLI or API endpoints to generate API key pairs for authenticating with the Turnkey platform. API keys are P-256 key pairs where the public key is registered with Turnkey and the private key is stored locally.

## Prerequisites

```bash
brew install tkhq/tap/turnkey
```

You need an organization ID from the Turnkey dashboard (app.turnkey.com). After installation, verify the CLI is available by running `turnkey version`.

## Global CLI Patterns

These flags and patterns apply across all `turnkey` CLI commands:

- `--organization <org-id>` is required on most commands to specify the target organization.
- `--key-name <name>` (default: "default") selects which API key pair to authenticate with.
- `--keys-folder <path>` (default: `~/.config/turnkey/keys/`) sets where key files are read from and written to.
- `--output json|yaml` (default: json) controls the output format.
- `turnkey request --path <endpoint> --body '<json>'` sends raw API calls to any Turnkey endpoint.
- Body input accepts an inline JSON string, `@filename` for file input, or `-` for stdin.
- The `--no-post` flag previews the request as a curl command without actually sending it.

All commands that mutate state require a valid API key pair for authentication. Read-only queries also require authentication.

## Instructions

### Step 1: Generate an API key pair

```bash
# CLI shortcut
turnkey generate api-key --organization $ORGANIZATION_ID --key-name my-key

# Output: public key printed to stdout, private key saved to ~/.config/turnkey/keys/my-key/
```

By default, keys use the P-256 curve. Use the `--curve` flag to specify a different curve:

| CLI Flag | API Enum | Notes |
|----------|----------|-------|
| p256 | API_KEY_CURVE_P256 | Default. Recommended for most use cases. |
| secp256k1 | API_KEY_CURVE_SECP256K1 | Compatible with Ethereum-style signing. |
| ed25519 | API_KEY_CURVE_ED25519 | Used for Ed25519-based authentication. |

```bash
turnkey generate api-key --organization $ORGANIZATION_ID --key-name my-ed-key --curve ed25519
```

### Step 2: Create a user with API keys (API endpoint)

```bash
turnkey request --path /public/v1/submit/create_users --body '{
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
}' --organization $ORGANIZATION_ID
```

The `publicKey` field is the hex-encoded public key printed by `turnkey generate api-key`.

### Step 3: List users

```bash
turnkey request --path /public/v1/query/list_users --body '{}' --organization $ORGANIZATION_ID
```

### Step 4: Create an organization

```bash
# CLI shortcut
turnkey organizations create --name "My Org"
```

This creates a new top-level organization. The API key used for this command becomes the root credential.

### Step 5: Create a sub-organization (for multi-tenant apps)

```bash
turnkey request --path /public/v1/submit/create_sub_organization --body '{
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
}' --organization $ORGANIZATION_ID
```

Sub-organizations provide full tenant isolation. Each sub-org has its own users, wallets, and policies independent of the parent organization.

### Step 6: Generate an encryption key (for wallet import/export)

```bash
turnkey generate encryption-key --organization $ORGANIZATION_ID --user $USER_ID
```

Encryption keys are stored in `~/.config/turnkey/encryption-keys/` and used for secure wallet import/export operations. These are separate from API keys and serve a different purpose.

For complete examples including key rotation and sub-organization patterns, see [references/api-key-examples.md](references/api-key-examples.md) and [references/sub-organization-examples.md](references/sub-organization-examples.md).

## Rules

- Never expose private API keys in logs, commits, or shared environments.
- Store keys in the default location (`~/.config/turnkey/keys/`) or use `--keys-folder` for custom paths.
- Always specify `--organization` for non-default organizations.
- Use descriptive `--key-name` values for managing multiple keys.
- Sub-organizations provide tenant isolation; each sub-org has its own users, wallets, and policies.
- Root quorum users bypass all policies. Minimize root quorum membership.
- Rotate API keys periodically by creating a new key, verifying it works, then deleting the old one.
- Use `--no-post` to preview requests before executing destructive operations.

## Related Skills

- `creating-wallets-api` for wallet creation and address derivation via CLI/API
- `signing-transactions-api` for signing transactions via CLI/API
- `managing-policies-api` for access control and transaction governance via CLI/API
- `setup-account-workflow` for end-to-end organization bootstrapping (install, keys, wallets, first signature)
- `wallet-governance-workflow` for production hardening (policies, scoped users, governance)
