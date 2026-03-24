# Security Hardening Walkthrough

This walkthrough demonstrates a complete security hardening flow for a production Turnkey organization with a hot wallet. It covers auditing, creating a scoped bot user, implementing an allowlist with spending limits, and testing enforcement.

## Scenario

You have a Turnkey organization with a hot wallet used by a trading bot. You want to:
- Create a scoped user for the bot (no root access)
- Allow the bot to sign only with the hot wallet
- Restrict transfers to approved addresses
- Block transfers above 1 ETH
- Verify enforcement

## Step 1: Audit Current State

```bash
export ORGANIZATION_ID="<your-org-id>"

# List wallets
turnkey wallets list --key-name default
# Expected: "default" wallet with Ethereum account

# Get wallet ID (you will need this for policies)
turnkey request --path /public/v1/query/list_wallets --body '{}' --organization $ORGANIZATION_ID
# Record the walletId from the response

# List users
turnkey request --path /public/v1/query/list_users --body '{}' --organization $ORGANIZATION_ID
# Expected: your root user

# List policies
turnkey request --path /public/v1/query/list_policies --body '{}' --organization $ORGANIZATION_ID
# Expected: empty (no policies yet)
```

## Step 2: Create Scoped Bot User

```bash
# Generate API key for the bot
turnkey generate api-key --organization $ORGANIZATION_ID --key-name trading-bot-key
# Record the public key from stdout

# Create user with tags
turnkey request --path /public/v1/submit/create_users --body '{
  "users": [{
    "userName": "trading-bot",
    "apiKeys": [{
      "apiKeyName": "trading-bot-key",
      "publicKey": "<BOT_PUBLIC_KEY>",
      "curveType": "API_KEY_CURVE_P256"
    }],
    "authenticators": [],
    "userTags": ["bot", "trading"]
  }]
}' --organization $ORGANIZATION_ID
# Record the userId from the response
```

Verify the user was created:
```bash
turnkey request --path /public/v1/query/list_users --body '{}' --organization $ORGANIZATION_ID
# Expected: root user + trading-bot user with tags ["bot", "trading"]
```

## Step 3: Create ALLOW Policy (Bot Can Sign with Hot Wallet)

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "allow-bot-sign-hot-wallet",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('\''trading'\''))",
  "condition": "wallet.id == '\''<HOT_WALLET_ID>'\''",
  "notes": "Trading bot can sign transactions from the hot wallet only"
}' --organization $ORGANIZATION_ID
```

This policy: users tagged "trading" can sign with the specified wallet. Without this policy, the bot would be denied by implicit deny.

## Step 4: Create Address Allowlist

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "allow-eth-approved-destinations",
  "effect": "EFFECT_ALLOW",
  "condition": "eth.tx.to in ['\''0xAPPROVED_ADDR_1'\'', '\''0xAPPROVED_ADDR_2'\'']",
  "consensus": "approvers.any(user, user.tags.contains('\''trading'\''))",
  "notes": "Only allow ETH transfers to approved exchange addresses"
}' --organization $ORGANIZATION_ID
```

## Step 5: Create DENY Guardrail (Spending Limit)

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "deny-large-eth-transfers",
  "effect": "EFFECT_DENY",
  "condition": "eth.tx.value > 1000000000000000000",
  "notes": "Block any single ETH transfer above 1 ETH (1e18 wei). Applies to ALL users including bot."
}' --organization $ORGANIZATION_ID
```

DENY policies have no consensus field because they block everyone. This acts as a hard ceiling regardless of other ALLOW policies.

## Step 6: Verify Policies

```bash
turnkey request --path /public/v1/query/list_policies --body '{}' --organization $ORGANIZATION_ID
```

Expected: three policies listed:
1. `allow-bot-sign-hot-wallet` (EFFECT_ALLOW)
2. `allow-eth-approved-destinations` (EFFECT_ALLOW)
3. `deny-large-eth-transfers` (EFFECT_DENY)

## Step 7: Test Enforcement

### Test 1: Bot signs a small message (should succeed)

```bash
turnkey raw sign \
  --signer <HOT_WALLET_ETH_ADDRESS> \
  --payload "test-signing" \
  --payload-encoding PAYLOAD_ENCODING_TEXT_UTF8 \
  --hash-function HASH_FUNCTION_KECCAK256 \
  --key-name trading-bot-key \
  --organization $ORGANIZATION_ID
```

Expected: signature returned successfully.

### Test 2: Root user still works (emergency access)

```bash
turnkey raw sign \
  --signer <HOT_WALLET_ETH_ADDRESS> \
  --payload "root-test" \
  --payload-encoding PAYLOAD_ENCODING_TEXT_UTF8 \
  --hash-function HASH_FUNCTION_KECCAK256 \
  --key-name default \
  --organization $ORGANIZATION_ID
```

Expected: signature returned successfully. Root quorum bypasses all policies.

### Test 3: Preview a large transfer (should be denied)

Use `--no-post` to preview without sending:

```bash
turnkey request --path /public/v1/submit/sign_transaction --body '{
  "signWith": "<HOT_WALLET_ETH_ADDRESS>",
  "unsignedTransaction": "<SERIALIZED_TX_ABOVE_1_ETH>",
  "type": "TRANSACTION_TYPE_ETHEREUM"
}' --organization $ORGANIZATION_ID --no-post
```

In a real test (without `--no-post`), this would return a policy denial error.

## Additional Patterns

### Multi-Sig Treasury (2-of-3 approval)

```bash
# Create three treasury users with "treasury" tag
# Then create a consensus policy:
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "treasury-multi-sig",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.filter(user, user.tags.contains('\''treasury'\'')).count() >= 2",
  "condition": "wallet.id == '\''<TREASURY_WALLET_ID>'\''",
  "notes": "Require 2-of-3 treasury members to approve signing"
}' --organization $ORGANIZATION_ID
```

### Testnet-Only Policy

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "testnet-only",
  "effect": "EFFECT_DENY",
  "condition": "eth.tx.chain_id != 11155111",
  "notes": "Block all non-Sepolia transactions. Remove when ready for mainnet."
}' --organization $ORGANIZATION_ID
```

### Restrict Solana Programs

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "allow-solana-approved-programs",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('\''trading'\''))",
  "condition": "solana.tx.program_keys.all(p, p == '\''<APPROVED_PROGRAM_ID>'\'')",
  "notes": "Bot can only interact with approved Solana programs"
}' --organization $ORGANIZATION_ID
```

For more policy patterns (Bitcoin fee caps, Tron restrictions, agent wallet scoping), see `managing-policies-api/references/policy-cli-examples.md`.

For the complete policy language reference (all keywords, types, and chain-specific fields), see `managing-policies-api/references/policy-language.md`.
