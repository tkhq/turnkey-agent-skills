---
name: wallet-governance-workflow
description: "Adds governance, policies, and access control to existing Turnkey wallets for production readiness. Walks through auditing current state, choosing a governance strategy, creating scoped API users, implementing policies (allowlists, spending limits, consensus requirements), testing enforcement, and hardening root quorum. Use when asked to 'secure my Turnkey wallets', 'harden Turnkey for production', 'set up governance for my organization', 'lock down my wallets', 'production-ready Turnkey setup', 'add access control to Turnkey', 'prepare Turnkey for mainnet', 'implement least privilege on Turnkey', or 'what policies should I add to my wallets'. Do NOT use for creating wallets (use managing-wallets-api), initial account setup (use setup-account-workflow), signing transactions (use signing-transactions-api), or individual policy CRUD (use managing-policies-api)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). See managing-users-api for authentication setup. Requires existing wallets and API keys."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["workflow", "security", "governance", "policies", "production", "hardening", "access-control"]
---

# Securing Turnkey Wallets

## Quick Start

Add governance and access control to existing Turnkey wallets by auditing current state, implementing policies, and verifying enforcement before going live.

## Prerequisites

- Turnkey API credentials (P-256 key pair). See `managing-users-api` for authentication setup.
- Existing wallets and API keys (complete `setup-account-workflow` first if starting fresh)
- Root quorum access for policy changes

## Building Blocks

This workflow composes two primitive skills:

1. **managing-policies-api** - Policy creation, updating, deletion, and the policy expression language
2. **managing-users-api** - Scoped user creation, API key generation, key rotation

Each phase tells you WHAT to do and HOW to verify. For detailed commands and policy language syntax, consult the corresponding skill.

## How Policy Evaluation Works

Before implementing any policy, understand these four rules:

1. **Root quorum users bypass ALL policies.** They are always allowed. Minimize root quorum membership.
2. **DENY always wins.** If any matching policy has EFFECT_DENY, the outcome is DENY regardless of ALLOW policies.
3. **At least one ALLOW is needed.** If no policy explicitly allows an action, it is denied.
4. **Implicit deny.** If no policy matches at all, the action is denied.

Design ALLOW policies for what should work, then add DENY policies as guardrails for what should never happen.

## Instructions

### Phase 1: Audit Current State

List everything in your organization to understand what you are securing:

`POST /public/v1/query/list_wallets`

```json
{
  "organizationId": "<your-org-id>"
}
```

`POST /public/v1/query/list_wallet_accounts`

```json
{
  "organizationId": "<your-org-id>",
  "walletId": "<wallet-id>"
}
```

`POST /public/v1/query/list_users`

```json
{
  "organizationId": "<your-org-id>"
}
```

`POST /public/v1/query/list_policies`

```json
{
  "organizationId": "<your-org-id>"
}
```

**Verify:** You have a clear picture of all wallets, their addresses, all users, and any existing policies. Document this before making changes.

### Decision Gate: Choose Your Governance Tier

| Environment | Root Quorum | User Model | Policy Level |
|-------------|-------------|------------|-------------|
| Development | 1/1 (solo) | Shared root key | None needed |
| Staging | 2/2 | Named users, shared access | Basic allowlists |
| Production | 3/2 minimum | Scoped users with tags, least privilege | Full: allowlists + limits + consensus |

Pick the tier that matches your environment and follow the corresponding phases below.

### Phase 2: Create Scoped API Users

Stop using root keys for day-to-day operations. Create purpose-built users with descriptive names and tags.

Generate a P-256 key pair locally, then register it via the API. See `managing-users-api` for key generation details.

Create tags first (the API requires tag IDs, not names):

`POST /public/v1/submit/create_user_tag`

```json
{
  "organizationId": "<your-org-id>",
  "tagName": "bot"
}
```

Note the tagId from the response (e.g., "tag-abc123").

`POST /public/v1/submit/create_user_tag`

```json
{
  "organizationId": "<your-org-id>",
  "tagName": "trading"
}
```

Note the tagId from the response (e.g., "tag-def456").

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

| Role | Suggested Tags | Purpose |
|------|---------------|---------|
| Trading bot | bot, trading | Automated signing with specific wallet |
| Ops team member | ops, admin | Wallet creation, user management |
| CI/CD pipeline | ci, deploy | Deploy-wallet signing only |
| Read-only monitor | monitor | No policies needed (reads are implicit) |

**Verify:** Call `POST /public/v1/query/list_users` and confirm the new users appear with correct tags.

See `managing-users-api` for detailed user provisioning and sub-organization patterns.

### Phase 3: Implement Policies

Choose policies based on your use case. Start with the pattern that matches, then layer additional restrictions.

#### Policy Pattern Selector

| Use Case | Start With | Then Add |
|----------|-----------|----------|
| Hot wallet with spending limits | ALLOW sign for bot user | DENY above threshold |
| Treasury with allowlist | ALLOW sign to approved addresses | DENY to all others (implicit) |
| Multi-sig treasury | ALLOW sign with 2-of-3 consensus | DENY single-signer |
| Automated trading bot | ALLOW sign for bot tag + specific wallet | DENY non-whitelisted contracts |
| Testnet-only dev | ALLOW sign on testnet chain IDs | DENY mainnet chain IDs |

#### Example: Hot Wallet with Spending Limit

ALLOW: trading bot can sign with the hot wallet.

`POST /public/v1/submit/create_policy`

```json
{
  "organizationId": "<your-org-id>",
  "policyName": "allow-trading-bot-signing",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('trading'))",
  "condition": "activity.action == 'SIGN' && wallet.id == '<HOT_WALLET_ID>'",
  "notes": "Trading bot can sign transactions from the hot wallet"
}
```

DENY: block transfers above 1 ETH (1e18 wei).

`POST /public/v1/submit/create_policy`

```json
{
  "organizationId": "<your-org-id>",
  "policyName": "deny-large-transfers",
  "effect": "EFFECT_DENY",
  "condition": "eth.tx.value > 1000000000000000000",
  "notes": "Block any single transfer above 1 ETH"
}
```

For more patterns (allowlists, multi-sig, Solana, Bitcoin), see the complete examples in `managing-policies-api` and [references/security-hardening-walkthrough.md](references/security-hardening-walkthrough.md).

### Phase 4: Harden Root Quorum

For production, increase root quorum to at least 3 members with a threshold of 2:

- Root quorum members bypass ALL policies. This is by design for emergency access.
- Minimize who has root quorum access. Day-to-day operations should go through scoped users + policies.
- Each root quorum member should use a separate, securely stored key (different machines, hardware keys).
- Root quorum changes require existing root quorum approval.

List current users to identify root quorum candidates:

`POST /public/v1/query/list_users`

```json
{
  "organizationId": "<your-org-id>"
}
```

Update root quorum to require 2-of-3 approval:

`POST /public/v1/submit/update_root_quorum`

```json
{
  "organizationId": "<your-org-id>",
  "threshold": 2,
  "userIds": ["<USER_ID_1>", "<USER_ID_2>", "<USER_ID_3>"]
}
```

**Verify:** Call `POST /public/v1/query/list_users` again and confirm the root quorum shows the updated threshold and member list. If the current root quorum threshold is already greater than 1, this activity will require approval from other root quorum members before it completes.

### Phase 5: Test Before Going Live

Test both the happy path and the denial path.

Test ALLOWED: bot signs a small message (should succeed).

`POST /public/v1/submit/sign_raw_payload`

```json
{
  "organizationId": "<your-org-id>",
  "signWith": "<HOT_WALLET_ADDRESS>",
  "payload": "test",
  "encoding": "PAYLOAD_ENCODING_TEXT_UTF8",
  "hashFunction": "HASH_FUNCTION_KECCAK256"
}
```

Test DENIED: attempt a large transfer (should fail with policy denial).

`POST /public/v1/submit/sign_transaction`

```json
{
  "organizationId": "<your-org-id>",
  "signWith": "<HOT_WALLET_ADDRESS>",
  "unsignedTransaction": "<SERIALIZED_TX_ABOVE_1_ETH>",
  "type": "TRANSACTION_TYPE_ETHEREUM"
}
```

This should return a policy denial error because the DENY policy blocks transfers above 1 ETH.

**Verify:**
- Authorized operations succeed
- Unauthorized operations return a policy denial error
- Root quorum users can still act (emergency access)

### Phase 6: (Optional) Ongoing Security

- **Key rotation**: Create new key, verify it works, then delete the old one. Never delete first.
- **Periodic audit**: Re-run Phase 1 quarterly. Look for unused users, overly broad policies, root quorum drift.
- **New team members**: Always create scoped users with tags from the start. Never add people to root quorum for convenience.

## Production Checklist

- [ ] All wallets and users documented
- [ ] Root quorum has 3+ members with threshold >= 2
- [ ] No shared API keys between services or team members
- [ ] Every signing user/bot has scoped policies (not root access)
- [ ] Spending limits or allowlists on all hot wallets
- [ ] DENY policies as guardrails for high-value operations
- [ ] Policies tested with both allowed and denied operations
- [ ] Key rotation schedule documented

## Rules

- DENY always takes precedence over ALLOW. Design with this in mind.
- Do not add users to root quorum unless they need to bypass all policies.
- Test policies on testnet before applying to production.
- The policy engine does not short-circuit. Split complex conditions into separate policies to avoid evaluation errors.
- Use descriptive policy names and notes for auditability.
- Key rotation: create new, verify, then delete old. Never delete first.
- When in doubt, start restrictive and loosen. It is safer to add ALLOW policies than to remove DENY policies after an incident.

## Related Skills

- `managing-policies-api` for individual policy CRUD, expression language, and all chain-specific policy keywords
- `managing-users-api` for user provisioning, key generation, and sub-organization management
- `setup-account-workflow` for initial organization bootstrapping (if you have not set up yet)
- `managing-wallets-api` for wallet and address management
- `signing-transactions-api` for transaction signing methods

For a complete end-to-end security hardening walkthrough, see [references/security-hardening-walkthrough.md](references/security-hardening-walkthrough.md).
