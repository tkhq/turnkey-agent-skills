---
name: treasury-operations-workflow
description: "Sets up and operates a company treasury on Turnkey with tiered wallet architecture (hot and cold wallets), multi-sig approval policies, and spending controls. Composes wallets, private keys, signing, policies, users, and activity monitoring into a complete treasury workflow. Covers onboarding (wallet creation, operator roles, policy setup), day-to-day management (process payments, replenish hot wallet, manage approved addresses, onboard operators), and monitoring (audit trail, approval queue, compliance reporting). Use when asked to 'set up a treasury', 'manage treasury wallets', 'multi-sig wallet', 'hot and cold wallet', 'treasury operations', 'process a payment', 'approve a transaction', 'treasury audit', 'cold wallet multi-sig', 'spending limits for wallets', or 'treasury operator management'. Do NOT use for agent wallet setup (use agentic-wallet-workflow), standalone key creation (use managing-private-keys-api), or sub-organization management (use managing-organizations-api)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). See managing-users-api for authentication setup."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["workflow", "treasury", "multi-sig", "hot-wallet", "cold-wallet", "payments", "governance"]
---

# Treasury Operations Workflow

## ⚠️ CRITICAL: Human Review Required for Policy Steps

🚨 **This workflow creates policies that govern access to treasury wallets holding real funds. Spending limits, multi-sig thresholds, and address allowlists are all enforced by policies. A misconfigured policy can allow unauthorized withdrawals, bypass multi-sig requirements, or permanently lock treasury funds with no recovery path except root quorum.**

Before executing any policy creation step in this workflow, you MUST:

1. **Stop and present each policy to the human for review.** Show the exact effect, consensus, and condition. Explain the financial impact: what transactions this policy allows or blocks, for which operators, and up to what amounts.
2. **Create DENY guardrails first, ALLOW permissions second.** Spending limits (DENY policies that block amounts above a threshold) must be in place before any ALLOW policies grant signing access.
3. **Verify multi-sig policies trigger CONSENSUS_NEEDED before going live.** If a cold wallet transaction returns COMPLETED instead of CONSENSUS_NEEDED, the multi-sig policy is not working and the cold wallet has single-signer access.
4. **Confirm the full policy set with the human before any operator begins transacting.**

The human is solely responsible for verifying that spending limits, approval thresholds, and address allowlists match their treasury security requirements.

## Quick Start

Set up a company treasury on Turnkey by creating tiered wallets (hot for daily ops, cold for reserves), assigning operator roles via user tags, and enforcing spending limits and multi-sig approval through policies.

Base URL: `https://api.turnkey.com`

Request bodies below show the `parameters` object. The full API envelope wraps these as: `{"type": "ACTIVITY_TYPE_...", "timestampMs": "<ms>", "organizationId": "<ORG_ID>", "parameters": { ... }}`. Query endpoints require `organizationId` in the request body.

## Prerequisites

Requires API credentials configured via the managing-users-api skill. You need root or admin-level access to create wallets, users, and policies.

## Phase 1: Treasury Onboarding

Before building anything, resolve four decision gates with the user.

### Decision Gate 1: Wallet Architecture

| Architecture | When to use |
|---|---|
| **Two-tier** (hot + cold) | Most common. Hot wallet for daily payments, cold wallet for reserves with multi-sig. |
| **Three-tier** (hot + warm + cold) | High-volume operations needing a middle tier for scheduled/batch payments. |
| **Single wallet** with policy tiers | Simplest setup. One wallet, policies control who can sign what amounts. |

Default to two-tier unless the user specifies otherwise.

### Decision Gate 2: Approval Model

| Tier | Approval | Rationale |
|---|---|---|
| Hot wallet | Single signer (any operator) | Speed for daily transactions |
| Cold wallet | 2-of-3 multi-sig (admins only) | Security for reserves |
| Value threshold | Under limit = hot rules, over limit = cold rules | Combine speed and safety |

### Decision Gate 3: Chain Strategy

Single-chain or multi-chain? This determines whether you create one wallet with multiple accounts or separate wallets per chain. Multi-chain wallets share a single seed and derive addresses per chain.

### Decision Gate 4: Contract Interaction

Plain transfers only, or DeFi protocol interaction? If DeFi, you need to upload smart contract interfaces (ABIs) to enable function-level policy control. See managing-policies-api for ABI upload.

### Setup Flow (Two-Tier Path)

After resolving the decision gates, execute these steps in order:

**Step 1: Create operator users with role tags**

```
POST /public/v1/submit/create_users
```

```json
{
  "users": [
    {
      "userName": "alice-admin",
      "userTags": ["treasury-admin"],
      "apiKeys": [{ "apiKeyName": "alice-key", "publicKey": "<P256_PUB_HEX>" }]
    },
    {
      "userName": "bob-admin",
      "userTags": ["treasury-admin"],
      "apiKeys": [{ "apiKeyName": "bob-key", "publicKey": "<P256_PUB_HEX>" }]
    },
    {
      "userName": "carol-operator",
      "userTags": ["treasury-operator"],
      "apiKeys": [{ "apiKeyName": "carol-key", "publicKey": "<P256_PUB_HEX>" }]
    }
  ]
}
```

Tag-based roles: `treasury-admin` (can approve cold wallet transactions), `treasury-operator` (can sign hot wallet transactions), `treasury-viewer` (read-only, no policies needed since all users can read).

**Step 2: Create hot wallet**

```
POST /public/v1/submit/create_wallet
```

```json
{
  "walletName": "treasury-hot",
  "accounts": [
    { "curve": "CURVE_SECP256K1", "pathFormat": "PATH_FORMAT_BIP32", "path": "m/44'/60'/0'/0/0", "addressFormat": "ADDRESS_FORMAT_ETHEREUM" }
  ]
}
```

**Step 3: Create cold wallet**

```
POST /public/v1/submit/create_wallet
```

```json
{
  "walletName": "treasury-cold",
  "accounts": [
    { "curve": "CURVE_SECP256K1", "pathFormat": "PATH_FORMAT_BIP32", "path": "m/44'/60'/0'/0/0", "addressFormat": "ADDRESS_FORMAT_ETHEREUM" }
  ]
}
```

**Step 4: Tag wallet keys for policy targeting**

```
POST /public/v1/submit/create_private_key_tag
```

```json
{
  "privateKeyTagName": "hot-wallet",
  "privateKeyIds": ["<HOT_WALLET_PRIVATE_KEY_ID>"]
}
```

Repeat with `"cold-storage"` tag for the cold wallet key. Get private key IDs from the wallet creation response or `list_wallets`.

**Step 5: Create policies**

Create these policies in order. See [references/treasury-setup-walkthrough.md](references/treasury-setup-walkthrough.md) for the complete set with full JSON.

1. **Hot wallet ALLOW**: operators can sign with the hot wallet.
   - consensus: `approvers.any(user, user.tags.contains('treasury-operator'))`
   - condition: `private_key.tags.contains('hot-wallet')`

2. **Hot wallet DENY limit**: block transactions above the per-tx threshold. Split into a separate policy per chain to avoid evaluation errors (the policy engine does not short-circuit, so combining `eth.tx.value` with other fields in one policy can error on non-EVM actions).
   - condition: `eth.tx.value > 1000000000000000000`
   - Apply this policy only to the hot wallet by scoping the consensus to hot-wallet operators.

3. **Cold wallet ALLOW (multi-sig)**: requires 2 of 3 admins.
   - consensus: `approvers.filter(user, user.tags.contains('treasury-admin')).count() >= 2`
   - condition: `private_key.tags.contains('cold-storage')`

4. **Cold wallet address allowlist**: cold wallet can only send to approved destinations.
   - effect: DENY, condition: `!(eth.tx.to in ['<HOT_WALLET_ADDR>', '<EXCHANGE_ADDR>']) && private_key.tags.contains('cold-storage')`
   - Uses DENY with negated condition because DENY always takes precedence, making it safer than an ALLOW allowlist.

5. **Global DENY guardrails**: block dangerous operations from non-root users.
   - condition: `activity.resource == 'WALLET' && activity.action in ['DELETE', 'EXPORT']`
   - Root quorum changes bypass the policy engine entirely and do not need a DENY policy.

**Step 6: Verify the setup**

Test hot wallet signing (should succeed immediately):
```
POST /public/v1/submit/sign_raw_payload
```

Test cold wallet signing (should return `ACTIVITY_STATUS_CONSENSUS_NEEDED`):
```
POST /public/v1/submit/sign_raw_payload
```

If the cold wallet test returns `COMPLETED` instead of `CONSENSUS_NEEDED`, the multi-sig policy is misconfigured. Review the consensus expression.

## Phase 2: Treasury Management

### Process a payment (hot wallet)

1. Check balance: `POST /public/v1/query/get_balances` with the hot wallet account address
2. Sign and broadcast: `POST /public/v1/submit/sign_transaction` with the unsigned transaction
3. Monitor: `POST /public/v1/query/get_activity` to poll until `COMPLETED`

### Replenish hot wallet (cold-to-hot transfer)

This triggers multi-sig because the cold wallet policy requires 2-of-3 admin approval:

1. First admin signs: `POST /public/v1/submit/sign_transaction` (returns `CONSENSUS_NEEDED`)
2. Second admin approves: `POST /public/v1/submit/approve_activity` with the activity fingerprint
3. Transaction executes after quorum is met

### Add approved destination address

Update the cold wallet allowlist policy to include a new address:

```
POST /public/v1/submit/update_policy
```

```json
{
  "policyId": "<ALLOWLIST_POLICY_ID>",
  "policyCondition": "eth.tx.to in ['<HOT_WALLET_ADDR>', '<EXCHANGE_ADDR>', '<NEW_ADDR>'] && private_key.tags.contains('cold-storage')"
}
```

### Add a new chain

Create new wallet accounts on both hot and cold wallets:

```
POST /public/v1/submit/create_wallet_accounts
```

Then create chain-specific policies if needed (e.g., `solana.tx.*` conditions).

### Onboard a new operator

```
POST /public/v1/submit/create_users
```

Create the user with the `treasury-operator` tag. Existing tag-based policies automatically apply. No policy changes needed. This is the power of tags: new users inherit permissions by tag membership.

### Remove an operator

1. `POST /public/v1/submit/delete_api_keys` to revoke access immediately
2. `POST /public/v1/submit/delete_users` to clean up

No policy changes needed. Tag-based policies adjust automatically when the user is removed.

See [references/treasury-operations-examples.md](references/treasury-operations-examples.md) for complete request/response examples.

## Phase 3: Treasury Monitoring

### Daily operations dashboard

- `POST /public/v1/query/list_activities` with status and date filters for the last 24h
- `POST /public/v1/query/get_balances` for current holdings across both wallets

### Approval queue

- `POST /public/v1/query/list_activities` filtered by `ACTIVITY_STATUS_CONSENSUS_NEEDED`
- These are cold wallet transactions waiting for multi-sig approval
- Review transaction details, then `approve_activity` or `reject_activity`

### Security audit

- `POST /public/v1/query/get_policy_evaluations` for any denied transactions
- `POST /public/v1/query/list_activities` filtered by `ACTIVITY_STATUS_FAILED`
- `POST /public/v1/query/list_users` to verify all users have correct tags
- `POST /public/v1/query/list_policies` to verify no unauthorized policy changes

### Compliance reporting

- `POST /public/v1/query/list_activities` with date range for monthly/quarterly reports
- `POST /public/v1/query/list_app_proofs` for cryptographic attestation of activity execution
- Combine activity history, policy state, and user roster into an audit package

## Rules

- **STOP before every policy step.** Present each policy (spending limits, multi-sig thresholds, address allowlists) to the human and get explicit confirmation before creating it. Treasury policies directly govern access to funds.
- DENY always takes precedence over ALLOW. A misconfigured DENY policy can lock out all signing.
- **Deny-first, always.** Create spending limit DENY policies and address restriction DENY policies before any ALLOW policies that grant signing access. Never create ALLOW policies before the corresponding guardrails are in place.
- The policy engine does NOT short-circuit. Do not combine `wallet.id` and `private_key.id` checks in a single condition. Split them into separate policies.
- `eth.tx.value` is in wei (1 ETH = 10^18 wei). Always convert human-readable amounts to wei.
- Always verify cold wallet triggers `CONSENSUS_NEEDED` before going live. If it returns `COMPLETED`, the multi-sig policy is not working.
- Tag keys and users rather than writing per-key or per-user policies. Tags make onboarding/offboarding automatic.
- Test all policies on testnet before mainnet. A bad policy can permanently lock funds.
- Root quorum users bypass all policies. Keep the root quorum small and offline.
- **After all policies are created, list the full policy set and present it to the human for final review.** Confirm that spending limits, multi-sig thresholds, and allowlists all match the human's stated requirements before any operator begins transacting.

## Related Skills

- `managing-wallets-api` for wallet creation and account derivation
- `managing-private-keys-api` for key tagging and key management
- `signing-transactions-api` for signing and broadcasting transactions
- `managing-policies-api` for policy creation, evaluation, and smart contract interfaces
- `managing-users-api` for user creation, API keys, and user tags
- `stamping-api` for constructing X-Stamp authentication headers manually
- `monitoring-activities-api` for activity status, consensus approval, and audit proofs
