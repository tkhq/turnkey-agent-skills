---
name: getting-started
description: "Day-0 onboarding workflow for Turnkey. Takes a user from API credentials to a working wallet in two steps: verify credentials, then create a wallet. Includes an optional signing test. Use when asked to 'get started with Turnkey', 'create my first wallet', 'set up Turnkey for the first time', 'verify my Turnkey API key', 'hello world with Turnkey', 'I just got my API credentials', or 'new to Turnkey'. Do NOT use for agent wallet setup (use provisioning-agent), policy design (use managing-policies), or day-2 user management (use managing-users)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair) from the Turnkey Dashboard (app.turnkey.com)."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["workflow", "onboarding", "getting-started", "first-wallet"]
---

# Getting Started

## Quick Start

Go from "I have API keys" to "I have a wallet and my credentials work" in two required steps. An optional third step lets you try signing.

## Prerequisites

Three environment variables from the Turnkey Dashboard (app.turnkey.com):

```env
TURNKEY_API_PUBLIC_KEY=    # P-256 public key (hex)
TURNKEY_API_PRIVATE_KEY=   # P-256 private key (hex)
TURNKEY_ORGANIZATION_ID=   # Organization ID
```

These are your **root credentials**. They have full access to the organization and bypass all policies. After onboarding, if you plan to set up an agent, use the `provisioning-agent` skill to create scoped, non-root credentials for the agent. Never give root credentials to an agent.

Base URL: `https://api.turnkey.com`

## Phase 1: Verify credentials

Confirm your API key works before creating any resources. If this step fails, fix credentials before moving on.

```
POST /public/v1/query/whoami
```

```json
{
  "organizationId": "<YOUR_ORG_ID>"
}
```

**Success:** Returns `userId`, `username`, and `organizationName`.

**Failure:** Check that:
- `TURNKEY_API_PUBLIC_KEY` matches the key registered in the Turnkey Dashboard
- `TURNKEY_API_PRIVATE_KEY` is the corresponding private key
- `TURNKEY_ORGANIZATION_ID` is correct
- The key pair is P-256 (not Ed25519 or secp256k1)

## Phase 2: Create your first wallet

First, check for existing wallets:

```
POST /public/v1/query/list_wallets
```

```json
{
  "organizationId": "<YOUR_ORG_ID>"
}
```

If a wallet already exists, skip creation and use `list_wallet_accounts` to retrieve its addresses.

If no wallet exists, choose your chains:
- **EVM only** (Ethereum, Base, Polygon): Simplest — one account covers all EVM chains
- **EVM + Solana**: Most common for multi-chain apps
- **Custom**: See `managing-wallets` for all 13 supported chains

```
POST /public/v1/submit/create_wallet
```

```json
{
  "walletName": "my-first-wallet",
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
```

The result contains `walletId` and an `addresses` array. Save these — you'll need the address as `SIGN_WITH` for signing operations.

Verify by listing accounts:

```
POST /public/v1/query/list_wallet_accounts
```

```json
{
  "organizationId": "<YOUR_ORG_ID>",
  "walletId": "<YOUR_WALLET_ID>"
}
```

## Phase 3 (optional): Test signing

If you want an end-to-end signing demo. This is optional — `whoami` plus wallet creation already proves your setup works.

```
POST /public/v1/submit/sign_raw_payload
```

```json
{
  "signWith": "<YOUR_ETH_ADDRESS>",
  "payload": "48656c6c6f2c205475726e6b657921",
  "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
  "hashFunction": "HASH_FUNCTION_SHA256"
}
```

The payload `48656c6c6f2c205475726e6b657921` is the hex encoding of "Hello, Turnkey!". `HASH_FUNCTION_SHA256` is simpler for a quick test because it accepts any payload length (unlike `HASH_FUNCTION_NO_OP` which requires a pre-hashed 32-byte input).

Success returns `r`, `s`, `v` signature components.

## What's next?

| Goal | Skill |
|------|-------|
| Give an agent a scoped wallet | `provisioning-agent` |
| Manage wallets, add chains | `managing-wallets` |
| Sign or broadcast transactions | `signing-transactions` |
| Manage users and API keys | `managing-users` |
| Set up policies and access control | `managing-policies` |

For the complete walkthrough with full request/response JSON, see [references/first-wallet-walkthrough.md](references/first-wallet-walkthrough.md).

## Rules

- Always verify credentials with `whoami` before creating resources
- Always check for existing wallets with `list_wallets` before creating new ones
- One EVM account covers all EVM-compatible chains
- These are root credentials — never give them to an agent

## Related Skills

- `managing-wallets` — full wallet reference (all 13 chains, import/export)
- `signing-transactions` — sign and broadcast transactions
- `provisioning-agent` — create a scoped agent with constrained credentials
