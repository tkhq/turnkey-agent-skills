---
name: setup-account-workflow
description: "Bootstraps a Turnkey organization from zero to operational using the API. Walks through API key generation, wallet creation, address derivation for target chains, and verification with a test signature. Covers chain selection, wallet topology, and team member onboarding. Use when asked to 'get started with Turnkey from scratch', 'bootstrap my Turnkey organization via the API', 'set up Turnkey from scratch using the API', 'go from zero to signing transactions', 'Turnkey quickstart', 'initial Turnkey setup', 'onboard onto Turnkey', 'set up my first wallet and sign a transaction', or 'walk me through the full Turnkey setup'. Do NOT use for individual operations like creating a single wallet (use managing-wallets-api), signing a specific transaction (use signing-transactions-api), generating a single API key (use managing-users-api), or adding policies (use wallet-governance-workflow or managing-policies-api)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). See managing-users-api for authentication setup."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["workflow", "quickstart", "onboarding", "setup", "organization"]
---

# Setting Up a Turnkey Account

## Quick Start

Bootstrap a Turnkey organization from zero to "I can sign transactions" by following this five-phase workflow.

**Base URL:** `https://api.turnkey.com`

## Prerequisites

- An organization ID from the Turnkey dashboard (app.turnkey.com)
- A P-256 key pair for authenticating API requests (see managing-users-api for details)

## Building Blocks

This workflow composes three primitive skills in order. Each phase below tells you WHAT to do and HOW to verify. For detailed endpoint variations, consult the corresponding skill.

1. **managing-users-api** - API key generation, user provisioning
2. **managing-wallets-api** - Wallet creation, address derivation for target chains
3. **signing-transactions-api** - Test signing to verify everything works end-to-end

## Instructions

### Phase 1: Generate API Keys

Get your organization ID from the Turnkey dashboard at app.turnkey.com, then generate a P-256 key pair locally using any crypto library (e.g., OpenSSL, Node.js crypto, Go crypto/ecdsa). Register the public key with your organization:

`POST /public/v1/submit/create_api_keys`

```json
{
  "type": "ACTIVITY_TYPE_CREATE_API_KEYS",
  "timestampMs": "<current-timestamp-ms>",
  "organizationId": "<your-org-id>",
  "parameters": {
    "apiKeys": [
      {
        "apiKeyName": "default",
        "publicKey": "<hex-encoded-P256-public-key>",
        "curveType": "API_KEY_CURVE_P256"
      }
    ],
    "userId": "<your-user-id>"
  }
}
```

**Verify:**
- The response includes `apiKeyIds` confirming registration

See `managing-users-api` for key curves, authentication header construction, and key rotation patterns.

### Decision Gate: Choose Your Chain Strategy

| Scenario | Wallet Topology | Why |
|----------|----------------|-----|
| Single EVM chain (Ethereum, Polygon, Base) | 1 wallet, 1 account | EVM chains share the same address |
| Multiple EVM chains | 1 wallet, 1 account | Same address works across all EVM networks |
| EVM + Solana | 1 wallet, 2 accounts | Different curves (secp256k1 vs ed25519) |
| EVM + Bitcoin | 1 wallet, 2 accounts | Different derivation paths |
| Multiple non-EVM chains | 1 wallet, N accounts | One account per chain family |
| Separate security domains | Separate wallets | Isolate risk per use case |

One wallet with multiple accounts is the default recommendation. Use separate wallets only when you need independent access control per chain.

### Phase 2: Create Your Wallet

First check for existing wallets:

`POST /public/v1/query/list_wallets`

```json
{
  "organizationId": "<your-org-id>"
}
```

Then create a wallet with accounts for your target chains:

`POST /public/v1/submit/create_wallet`

```json
{
  "type": "ACTIVITY_TYPE_CREATE_WALLET",
  "timestampMs": "<current-timestamp-ms>",
  "organizationId": "<your-org-id>",
  "parameters": {
    "walletName": "default",
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
    ],
    "mnemonicLength": 12
  }
}
```

**Verify:**

`POST /public/v1/query/list_wallets`

```json
{
  "organizationId": "<your-org-id>"
}
```

Confirm the new wallet appears. Then list accounts:

`POST /public/v1/query/list_wallet_accounts`

```json
{
  "organizationId": "<your-org-id>",
  "walletId": "<wallet-id>"
}
```

Record the addresses. You will need them for funding and signing.

For EVM-only, remove the Solana account. For other chains (Bitcoin, Cosmos, Sui, etc.), see the full address format table in `managing-wallets-api`.

### Phase 3: Verify with a Test Signature

Sign a test message to confirm everything is wired up correctly:

`POST /public/v1/submit/sign_raw_payload`

```json
{
  "type": "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2",
  "timestampMs": "<current-timestamp-ms>",
  "organizationId": "<your-org-id>",
  "parameters": {
    "signWith": "<your-eth-address>",
    "payload": "48656c6c6f2c205475726e6b657921",
    "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
    "hashFunction": "HASH_FUNCTION_KECCAK256"
  }
}
```

**Verify:**
- The response includes a signature (r, s, v values) without errors

If this fails, check: is the signer address from a wallet you own? Are your API keys valid?

See `signing-transactions-api` for chain-specific transaction signing methods.

### Phase 4: (Optional) Onboard Team Members

For teams, generate a P-256 key pair for each new team member locally, then create users with their public keys:

`POST /public/v1/submit/create_users`

```json
{
  "type": "ACTIVITY_TYPE_CREATE_USERS",
  "timestampMs": "<current-timestamp-ms>",
  "organizationId": "<your-org-id>",
  "parameters": {
    "users": [
      {
        "userName": "alice",
        "userEmail": "alice@example.com",
        "apiKeys": [
          {
            "apiKeyName": "alice-key",
            "publicKey": "<alice-hex-encoded-P256-public-key>",
            "curveType": "API_KEY_CURVE_P256"
          }
        ],
        "authenticators": [],
        "userTags": []
      }
    ]
  }
}
```

| Team Size | Approach |
|-----------|----------|
| Solo / CI only | Skip this phase. Use your root key. |
| 2-5 members | Create named users. Root quorum is sufficient for now. |
| 5+ members | Create users with tags, then add policies (see `wallet-governance-workflow`). |

See `managing-users-api` for detailed user provisioning and sub-organization patterns.

### Phase 5: (Optional) Harden for Production

If you are moving toward production, continue with `wallet-governance-workflow` to add policies, access controls, and root quorum hardening.

## Verification Checklist

After completing phases 1-3, confirm:

- [ ] API key pair generated and registered with your organization
- [ ] Wallet created with accounts for target chains
- [ ] List wallet accounts returns correct addresses
- [ ] Test signature succeeds without errors
- [ ] Addresses recorded for funding

## Rules

- Generate a fresh API key pair for each environment (dev, staging, prod). Do not reuse keys across environments.
- Verify each phase before moving to the next. A failed Phase 1 will cascade into failures in Phase 2 and 3.
- Record wallet addresses before funding them. There is no way to recover funds sent to an address you do not control.
- Do not skip the test signature. It catches misconfigured keys, missing permissions, and incorrect signer addresses.
- For production use, always follow up with `wallet-governance-workflow` to add governance.

## Related Skills

- `managing-users-api` for detailed API key and user management
- `managing-wallets-api` for all supported chains, derivation paths, and import/export
- `signing-transactions-api` for chain-specific signing methods and broadcasting
- `wallet-governance-workflow` for adding governance, policies, and access control

For a complete end-to-end API walkthrough, see [references/full-setup-walkthrough.md](references/full-setup-walkthrough.md).
