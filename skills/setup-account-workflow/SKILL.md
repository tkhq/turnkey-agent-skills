---
name: setup-account-workflow
description: "Bootstraps a Turnkey organization from zero to operational using the CLI and API. Walks through CLI installation, API key generation, wallet creation, address derivation for target chains, and verification with a test signature. Covers chain selection, wallet topology, and team member onboarding. Use when asked to 'get started with Turnkey', 'set up Turnkey from scratch', 'bootstrap my Turnkey organization', 'go from zero to signing transactions', 'Turnkey quickstart', 'initial Turnkey setup', 'onboard onto Turnkey', 'set up my first wallet and sign a transaction', or 'walk me through the full Turnkey setup'. Do NOT use for individual operations like creating a single wallet (use creating-wallets-api), signing a specific transaction (use signing-transactions-api), generating a single API key (use managing-credentials-api), or adding policies (use wallet-governance-workflow or managing-policies-api)."
license: Apache-2.0
compatibility: "Requires turnkey CLI (brew install tkhq/tap/turnkey). Composes managing-credentials-api, creating-wallets-api, and signing-transactions-api skills."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["workflow", "quickstart", "onboarding", "setup", "cli", "organization"]
---

# Setting Up a Turnkey Account

## Quick Start

Bootstrap a Turnkey organization from zero to "I can sign transactions" by following this five-phase workflow.

## Prerequisites

- Turnkey CLI: `brew install tkhq/tap/turnkey`
- An organization ID from the Turnkey dashboard (app.turnkey.com)

Set your org ID for all subsequent commands:

```bash
export ORGANIZATION_ID="<your-org-id>"
```

## Building Blocks

This workflow composes three primitive skills in order. Each phase below tells you WHAT to do and HOW to verify. For detailed command variations, consult the corresponding skill.

1. **managing-credentials-api** - CLI installation, API key generation, user provisioning
2. **creating-wallets-api** - Wallet creation, address derivation for target chains
3. **signing-transactions-api** - Test signing to verify everything works end-to-end

## Instructions

### Phase 1: Install CLI and Generate API Keys

Install the CLI and create your first API key pair:

```bash
brew install tkhq/tap/turnkey
turnkey generate api-key --organization $ORGANIZATION_ID --key-name default
```

The public key is printed to stdout. The private key is saved to `~/.config/turnkey/keys/default/`.

**Verify:**
- `turnkey version` returns a version number
- `ls ~/.config/turnkey/keys/default/` shows key files

See `managing-credentials-api` for key curves, custom paths, and key rotation patterns.

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

Check for existing wallets, then create a wallet with accounts for your target chains:

```bash
# Check existing
turnkey wallets list --key-name default

# Create wallet with Ethereum + Solana accounts
turnkey request --path /public/v1/submit/create_wallet --body '{
  "walletName": "default",
  "accounts": [
    {
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'\''/'60'\''/'0'\''/'0/0",
      "addressFormat": "ADDRESS_FORMAT_ETHEREUM"
    },
    {
      "curve": "CURVE_ED25519",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'\''/'501'\''/'0'\''/'0'\''",
      "addressFormat": "ADDRESS_FORMAT_SOLANA"
    }
  ],
  "mnemonicLength": 12
}'
```

**Verify:**
- `turnkey wallets list --key-name default` shows the new wallet
- `turnkey wallets accounts list --wallet default` shows your derived addresses

Record the addresses. You will need them for funding and signing.

For EVM-only, remove the Solana account. For other chains (Bitcoin, Cosmos, Sui, etc.), see the full address format table in `creating-wallets-api`.

### Phase 3: Verify with a Test Signature

Sign a test message to confirm everything is wired up correctly:

```bash
turnkey raw sign \
  --signer <YOUR_ETH_ADDRESS> \
  --payload "Hello, Turnkey!" \
  --payload-encoding PAYLOAD_ENCODING_TEXT_UTF8 \
  --hash-function HASH_FUNCTION_KECCAK256
```

**Verify:**
- The command returns a signature (r, s, v values) without errors

If this fails, check: is the signer address from a wallet you own? Are your API keys valid? Use `--no-post` to preview the request without sending.

See `signing-transactions-api` for chain-specific transaction signing methods.

### Phase 4: (Optional) Onboard Team Members

For teams, create additional API users with their own key pairs:

```bash
# Generate a key pair for the new team member
turnkey generate api-key --organization $ORGANIZATION_ID --key-name alice-key

# Create the user
turnkey request --path /public/v1/submit/create_users --body '{
  "users": [{
    "userName": "alice",
    "userEmail": "alice@example.com",
    "apiKeys": [{
      "apiKeyName": "alice-key",
      "publicKey": "<ALICE_PUBLIC_KEY>",
      "curveType": "API_KEY_CURVE_P256"
    }],
    "authenticators": [],
    "userTags": []
  }]
}'
```

| Team Size | Approach |
|-----------|----------|
| Solo / CI only | Skip this phase. Use your root key. |
| 2-5 members | Create named users. Root quorum is sufficient for now. |
| 5+ members | Create users with tags, then add policies (see `wallet-governance-workflow`). |

See `managing-credentials-api` for detailed user provisioning and sub-organization patterns.

### Phase 5: (Optional) Harden for Production

If you are moving toward production, continue with `wallet-governance-workflow` to add policies, access controls, and root quorum hardening.

## Verification Checklist

After completing phases 1-3, confirm:

- [ ] CLI installed and `turnkey version` responds
- [ ] API key generated and stored in `~/.config/turnkey/keys/`
- [ ] Wallet created with accounts for target chains
- [ ] `turnkey wallets accounts list` shows correct addresses
- [ ] Test signature succeeds without errors
- [ ] Addresses recorded for funding

## Rules

- Generate a fresh API key pair for each environment (dev, staging, prod). Do not reuse keys across environments.
- Verify each phase before moving to the next. A failed Phase 1 will cascade into failures in Phase 2 and 3.
- Record wallet addresses before funding them. There is no way to recover funds sent to an address you do not control.
- Do not skip the test signature. It catches misconfigured keys, missing permissions, and incorrect signer addresses.
- For production use, always follow up with `wallet-governance-workflow` to add governance.

## Related Skills

- `managing-credentials-api` for detailed API key and user management
- `creating-wallets-api` for all supported chains, derivation paths, and import/export
- `signing-transactions-api` for chain-specific signing methods and broadcasting
- `wallet-governance-workflow` for adding governance, policies, and access control

For a complete end-to-end command walkthrough, see [references/full-setup-walkthrough.md](references/full-setup-walkthrough.md).
