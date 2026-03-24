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

List wallets:

`POST /public/v1/query/list_wallets`

```json
{
  "organizationId": "<your-org-id>"
}
```

Expected: "default" wallet with Ethereum account. Record the walletId from the response.

List wallet accounts:

`POST /public/v1/query/list_wallet_accounts`

```json
{
  "organizationId": "<your-org-id>",
  "walletId": "<wallet-id>"
}
```

List users:

`POST /public/v1/query/list_users`

```json
{
  "organizationId": "<your-org-id>"
}
```

Expected: your root user.

List policies:

`POST /public/v1/query/list_policies`

```json
{
  "organizationId": "<your-org-id>"
}
```

Expected: empty (no policies yet).

## Step 2: Create Scoped Bot User

Generate a P-256 key pair locally for the bot. See `managing-users-api` for key generation details.

Register the key by creating the bot user. First, create tags (the API requires tag IDs, not names):

`POST /public/v1/submit/create_user_tag`

```json
{
  "organizationId": "<your-org-id>",
  "tagName": "bot"
}
```

Note the tagId from the response.

`POST /public/v1/submit/create_user_tag`

```json
{
  "organizationId": "<your-org-id>",
  "tagName": "trading"
}
```

Note the tagId from the response.

Create the user with tag IDs:

`POST /public/v1/submit/create_users`

```json
{
  "organizationId": "<your-org-id>",
  "users": [{
    "userName": "trading-bot",
    "apiKeys": [{
      "apiKeyName": "trading-bot-key",
      "publicKey": "<BOT_PUBLIC_KEY>",
      "curveType": "API_KEY_CURVE_P256"
    }],
    "authenticators": [],
    "userTags": ["<BOT_TAG_ID>", "<TRADING_TAG_ID>"]
  }]
}
```

Record the userId from the response.

Verify the user was created:

`POST /public/v1/query/list_users`

```json
{
  "organizationId": "<your-org-id>"
}
```

Expected: root user + trading-bot user with tags ["bot", "trading"].

## Step 3: Create ALLOW Policy (Bot Can Sign with Hot Wallet)

`POST /public/v1/submit/create_policy`

```json
{
  "organizationId": "<your-org-id>",
  "policyName": "allow-bot-sign-hot-wallet",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('trading'))",
  "condition": "wallet.id == '<HOT_WALLET_ID>'",
  "notes": "Trading bot can sign transactions from the hot wallet only"
}
```

This policy: users tagged "trading" can sign with the specified wallet. Without this policy, the bot would be denied by implicit deny.

## Step 4: Create Address Allowlist

`POST /public/v1/submit/create_policy`

```json
{
  "organizationId": "<your-org-id>",
  "policyName": "allow-eth-approved-destinations",
  "effect": "EFFECT_ALLOW",
  "condition": "eth.tx.to in ['0xAPPROVED_ADDR_1', '0xAPPROVED_ADDR_2']",
  "consensus": "approvers.any(user, user.tags.contains('trading'))",
  "notes": "Only allow ETH transfers to approved exchange addresses"
}
```

## Step 5: Create DENY Guardrail (Spending Limit)

`POST /public/v1/submit/create_policy`

```json
{
  "organizationId": "<your-org-id>",
  "policyName": "deny-large-eth-transfers",
  "effect": "EFFECT_DENY",
  "condition": "eth.tx.value > 1000000000000000000",
  "notes": "Block any single ETH transfer above 1 ETH (1e18 wei). Applies to ALL users including bot."
}
```

DENY policies have no consensus field because they block everyone. This acts as a hard ceiling regardless of other ALLOW policies.

## Step 6: Verify Policies

`POST /public/v1/query/list_policies`

```json
{
  "organizationId": "<your-org-id>"
}
```

Expected: three policies listed:
1. `allow-bot-sign-hot-wallet` (EFFECT_ALLOW)
2. `allow-eth-approved-destinations` (EFFECT_ALLOW)
3. `deny-large-eth-transfers` (EFFECT_DENY)

## Step 7: Test Enforcement

### Test 1: Bot signs a small message (should succeed)

`POST /public/v1/submit/sign_raw_payload`

```json
{
  "organizationId": "<your-org-id>",
  "signWith": "<HOT_WALLET_ETH_ADDRESS>",
  "payload": "test-signing",
  "encoding": "PAYLOAD_ENCODING_TEXT_UTF8",
  "hashFunction": "HASH_FUNCTION_KECCAK256"
}
```

Expected: signature returned successfully.

### Test 2: Root user still works (emergency access)

`POST /public/v1/submit/sign_raw_payload`

```json
{
  "organizationId": "<your-org-id>",
  "signWith": "<HOT_WALLET_ETH_ADDRESS>",
  "payload": "root-test",
  "encoding": "PAYLOAD_ENCODING_TEXT_UTF8",
  "hashFunction": "HASH_FUNCTION_KECCAK256"
}
```

Expected: signature returned successfully. Root quorum bypasses all policies.

### Test 3: Large transfer (should be denied)

`POST /public/v1/submit/sign_transaction`

```json
{
  "organizationId": "<your-org-id>",
  "signWith": "<HOT_WALLET_ETH_ADDRESS>",
  "unsignedTransaction": "<SERIALIZED_TX_ABOVE_1_ETH>",
  "type": "TRANSACTION_TYPE_ETHEREUM"
}
```

Expected: policy denial error. The DENY policy blocks any single ETH transfer above 1 ETH regardless of other ALLOW policies.

## Additional Patterns

### Multi-Sig Treasury (2-of-3 approval)

Create three treasury users with "treasury" tag, then create a consensus policy:

`POST /public/v1/submit/create_policy`

```json
{
  "organizationId": "<your-org-id>",
  "policyName": "treasury-multi-sig",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.filter(user, user.tags.contains('treasury')).count() >= 2",
  "condition": "wallet.id == '<TREASURY_WALLET_ID>'",
  "notes": "Require 2-of-3 treasury members to approve signing"
}
```

### Testnet-Only Policy

`POST /public/v1/submit/create_policy`

```json
{
  "organizationId": "<your-org-id>",
  "policyName": "testnet-only",
  "effect": "EFFECT_DENY",
  "condition": "eth.tx.chain_id != 11155111",
  "notes": "Block all non-Sepolia transactions. Remove when ready for mainnet."
}
```

### Restrict Solana Programs

`POST /public/v1/submit/create_policy`

```json
{
  "organizationId": "<your-org-id>",
  "policyName": "allow-solana-approved-programs",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('trading'))",
  "condition": "solana.tx.program_keys.all(p, p == '<APPROVED_PROGRAM_ID>')",
  "notes": "Bot can only interact with approved Solana programs"
}
```

For more policy patterns (Bitcoin fee caps, Tron restrictions, agent wallet scoping), see `managing-policies-api/references/policy-api-examples.md`.

For the complete policy language reference (all keywords, types, and chain-specific fields), see `managing-policies-api/references/policy-language.md`.
