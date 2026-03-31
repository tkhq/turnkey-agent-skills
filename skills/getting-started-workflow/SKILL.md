---
name: getting-started-workflow
description: "Day-0 onboarding workflow that takes a user from API credentials to a working wallet. Covers credential verification, wallet creation with chain selection, and an optional signing check. Also covers how to construct an X-Stamp header, build a Turnkey API stamp, and sign a request body for Turnkey authentication. Use when asked to 'get started with Turnkey', 'create my first wallet', 'set up Turnkey for the first time', 'verify my Turnkey API key', 'hello world with Turnkey API', 'onboard to Turnkey', 'I just got my API credentials', 'new to Turnkey, help me set up', 'construct an X-Stamp header', 'build a Turnkey API stamp', 'stamp a Turnkey request', or 'sign a request body for Turnkey auth'. Do NOT use for agent wallet setup (use agentic-wallet-workflow), policy design (use managing-policies-api), or day-2 user management (use managing-users-api)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair) from the Turnkey Dashboard (app.turnkey.com)."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["workflow", "onboarding", "getting-started", "first-wallet"]
---

# Getting Started Workflow

## Quick Start

Go from "I have API keys" to "I have a wallet and know my requests are working" in two required steps: verify credentials, then create a wallet. An optional third step lets you try signing.

## Prerequisites

Requires three environment variables from the Turnkey Dashboard (app.turnkey.com):

- `TURNKEY_API_PUBLIC_KEY`: Your P-256 public key (hex)
- `TURNKEY_API_PRIVATE_KEY`: Your P-256 private key (hex)
- `TURNKEY_ORGANIZATION_ID`: Your organization ID

### Stamping (X-Stamp header)

Every request must include an `X-Stamp` header. Build it with standard CLI tools:

1. **Convert hex private key to PEM** (one-time): `echo "30310201010420${TURNKEY_API_PRIVATE_KEY}a00a06082a8648ce3d030107" | xxd -r -p | openssl ec -inform der -outform pem -out /tmp/tk_stamp.pem 2>/dev/null`
2. **Sign the request body**: `SIG_HEX=$(echo -n "$BODY" | openssl dgst -sha256 -sign /tmp/tk_stamp.pem | xxd -p -c 256)`
3. **Build stamp JSON**: `{"publicKey":"$TURNKEY_API_PUBLIC_KEY","signature":"$SIG_HEX","scheme":"SIGNATURE_SCHEME_TK_API_P256"}`
4. **Base64URL-encode and send**: `STAMP=$(echo -n "$STAMP_JSON" | base64 | tr '+/' '-_' | tr -d '=')` then add `-H "X-Stamp: $STAMP"` to curl.

Sign the **exact** body bytes. The public key must match a registered API key.

## Making Requests

Use direct HTTPS requests to `https://api.turnkey.com`.

- Query endpoints use `POST /public/v1/query/...` and include `organizationId` in the request body.
- Submit endpoints use `POST /public/v1/submit/...` and return an activity object.
- When a primitive skill is linked below, use that skill for fuller request/response coverage.

## Phase 1: Verify Your Credentials

Confirm your API key works before creating any resources.

If this step fails, stay in onboarding mode and fix credentials before moving on.

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

Full wallet reference: `managing-wallets-api`

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

## Optional Phase 3: Try Signing

If you want an end-to-end signing demo, sign a test message. This is optional. `whoami` plus wallet creation already proves your credentials and org setup are working.

Full signing reference: `signing-transactions-api`

```
POST https://api.turnkey.com/public/v1/submit/sign_raw_payload
```

```json
{
  "signWith": "<YOUR_ETH_ADDRESS>",
  "payload": "48656c6c6f2c205475726e6b657921",
  "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
  "hashFunction": "HASH_FUNCTION_SHA256"
}
```

The payload `48656c6c6f2c205475726e6b657921` is the hex encoding of "Hello, Turnkey!". Using `HASH_FUNCTION_SHA256` lets the API hash the payload before signing. The response contains an activity object with the signature in `activity.result.signRawPayloadResult` (fields: `r`, `s`, `v`).

Note: `HASH_FUNCTION_NO_OP` requires a pre-hashed 32-byte (64 hex character) payload. For a quick verification test, `HASH_FUNCTION_SHA256` is simpler because it accepts any payload length.

If this succeeds, signing is operational too.

## What's Next?

Choose the next path based on what you are trying to do:

**Next steps by persona:**

- **Administer your org with Claude Code**: Explore `managing-wallets-api`, `managing-users-api`, `managing-policies-api`, and `managing-organizations-api`
- **Set up an autonomous agent**: Use `agentic-wallet-workflow`
- **Check balances or supported assets**: Use `querying-balances-api`
- **Sign or broadcast transactions**: Use `signing-transactions-api`

If you are moving into agent setup, see [references/agent-personas.md](references/agent-personas.md) for Worker and Observer planning templates.

For the complete walkthrough with full request/response JSON for every step, see [references/first-wallet-walkthrough.md](references/first-wallet-walkthrough.md).

## Rules

- Always verify credentials with whoami before creating resources
- Wallet names should be descriptive and unique within the organization
- The optional test signature is a demo, not a prerequisite for successful onboarding
- One EVM account covers all EVM-compatible chains (Ethereum, Base, Polygon, Arbitrum, Optimism)
- Check for existing wallets with `list_wallets` before creating new ones to avoid duplicates

## Related Skills

- Full wallet reference: `managing-wallets-api`
- Full signing reference: `signing-transactions-api`
- Full agent wallet workflow reference: `agentic-wallet-workflow`
- Full policy reference: `managing-policies-api`
