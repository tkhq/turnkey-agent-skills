---
name: getting-started-workflow
description: "Day-0 onboarding workflow that takes a user from API credentials to a working wallet and first signature. Covers credential verification, wallet creation with chain selection, and a test signature. Use when asked to 'get started with Turnkey', 'create my first wallet', 'set up Turnkey for the first time', 'verify my Turnkey API key', 'hello world with Turnkey API', 'onboard to Turnkey', 'I just got my API credentials', or 'new to Turnkey, help me set up'. Do NOT use for agent wallet setup (use agentic-wallet-workflow), treasury management (use treasury-operations-workflow), or policy management (use managing-policies-api)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair) from the Turnkey Dashboard (app.turnkey.com)."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["workflow", "onboarding", "getting-started", "first-wallet"]
---

# Getting Started Workflow

## Quick Start

Go from "I have API keys" to "I have a wallet and signed my first transaction" in three steps: verify credentials, create a wallet, sign a test message.

## Prerequisites

Requires API credentials configured via the managing-users-api skill. You need three environment variables from the Turnkey Dashboard (app.turnkey.com):

- `TURNKEY_API_PUBLIC_KEY`: Your P-256 public key (hex)
- `TURNKEY_API_PRIVATE_KEY`: Your P-256 private key (hex)
- `TURNKEY_ORGANIZATION_ID`: Your organization ID

All requests must be signed with your P-256 key pair using Turnkey's stamp authentication.

## Phase 1: Verify Your Credentials

Confirm your API key works before creating any resources.

> Skill: managing-users-api

```
POST https://api.turnkey.com/public/v1/query/whoami
```

```json
{
  "organizationId": "<YOUR_ORG_ID>"
}
```

If this succeeds, you will see your `userId`, `username`, and `organizationName` in the response. If it fails, check that `TURNKEY_API_PUBLIC_KEY`, `TURNKEY_API_PRIVATE_KEY`, and `TURNKEY_ORGANIZATION_ID` are set correctly and that the key pair was generated as P-256 (not Ed25519 or secp256k1).

## Phase 2: Create Your First Wallet

Before creating a wallet, decide which chains you need:

- **EVM only** (Ethereum, Base, Polygon): Simplest setup, one account covers all EVM chains.
- **EVM + Solana**: Most common for multi-chain apps. Two accounts.
- **Custom**: See managing-wallets-api for all supported chains and address formats.

> Skill: managing-wallets-api

**Create the wallet (EVM + Solana example):**

```
POST https://api.turnkey.com/public/v1/submit/create_wallet
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

The activity result contains the `walletId` and an `addresses` array with your derived addresses.

**Verify your wallet accounts:**

```
POST https://api.turnkey.com/public/v1/query/list_wallet_accounts
```

```json
{
  "walletId": "<YOUR_WALLET_ID>"
}
```

This returns all derived addresses for your wallet. Save the Ethereum address for the next step.

## Phase 3: Sign Your First Transaction

Confirm your full setup works end to end by signing a test message.

> Skill: signing-transactions-api

```
POST https://api.turnkey.com/public/v1/submit/sign_raw_payload
```

```json
{
  "signWith": "<YOUR_ETH_ADDRESS>",
  "payload": "68656c6c6f",
  "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
  "hashFunction": "HASH_FUNCTION_NO_OP"
}
```

The payload `68656c6c6f` is the hex encoding of "hello". The response contains an activity object with the signature in `activity.result.signRawPayloadResult` (fields: `r`, `s`, `v`).

If this succeeds, your setup is complete: credentials work, wallet exists, and signing is operational.

## What's Next?

- Give an agent scoped wallet access: `agentic-wallet-workflow`
- Set up a company treasury: `treasury-operations-workflow`
- Add access control and spending limits: `managing-policies-api`
- Manage users and API keys: `managing-users-api`

For the complete walkthrough with full request/response JSON for every step, see [references/first-wallet-walkthrough.md](references/first-wallet-walkthrough.md).

## Rules

- Always verify credentials with whoami before creating resources
- Wallet names should be descriptive and unique within the organization
- The test signature confirms your full setup (credentials, wallet, signing) works end to end
- One EVM account covers all EVM-compatible chains (Ethereum, Base, Polygon, Arbitrum, Optimism)
- Check for existing wallets with `list_wallets` before creating new ones to avoid duplicates

## Related Skills

- `managing-users-api` for API key setup and authentication
- `managing-wallets-api` for wallet and account management
- `signing-transactions-api` for transaction signing
- `agentic-wallet-workflow` for setting up agent wallets with scoped access
- `managing-policies-api` for access control and transaction governance
