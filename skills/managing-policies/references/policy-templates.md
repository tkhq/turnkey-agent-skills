# Policy Templates and Anti-Patterns

Starting points for common policy patterns, plus mistakes to avoid. Always scope to the specific user/wallet and tighten further based on the use case.

## Good ALLOW policy templates

### Agent can sign with a specific wallet

```json
{
  "policyName": "agent-sign-with-wallet",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "activity.action == 'SIGN' && wallet.id == '<WALLET_ID>'"
}
```

This is the minimum viable ALLOW for an agent. It scopes to signing only, with one specific wallet.

### Agent can sign with a specific wallet account address

```json
{
  "policyName": "agent-sign-with-address",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "activity.action == 'SIGN' && wallet_account.address == '<WALLET_ACCOUNT_ADDRESS>'"
}
```

More granular than `wallet.id` — restricts signing to a single address within a wallet. Useful when a wallet has accounts on multiple chains and the agent should only sign on one.

### Agent can sign EVM transactions to approved addresses only

```json
{
  "policyName": "agent-eth-allowlist",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "eth.tx.to in ['<ADDR_1>', '<ADDR_2>', '<ADDR_3>']"
}
```

### Spending cap (use as a DENY guardrail)

```json
{
  "policyName": "deny-large-eth-transfers",
  "effect": "EFFECT_DENY",
  "condition": "eth.tx.value > 100000000000000000"
}
```

This denies any ETH transfer above 0.1 ETH (100000000000000000 wei) regardless of who submits it. No `consensus` means it applies to all users. DENY overrides any ALLOW.

### Restrict to specific contract function (requires ABI upload)

```json
{
  "policyName": "agent-usdc-transfer-only",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '<AGENT_USER_ID>')",
  "condition": "eth.tx.to == '<USDC_CONTRACT>' && eth.tx.function_name == 'transfer'"
}
```

`eth.tx.function_name` only works after uploading the contract's ABI. See the Smart Contract Interfaces section in the main skill.

### Multi-sig approval (require 2 of N)

```json
{
  "policyName": "require-two-traders",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.filter(user, user.tags.contains('trader')).count() >= 2",
  "condition": "activity.action == 'SIGN'"
}
```

This assumes the submitting user is tagged `trader` — their auto-vote then contributes to the count (1 of 2), a second trader approves to reach the threshold, and the activity completes. **If a non-trader would submit this signing request**, the submitter's vote counts toward nothing, consensus stays at 0, and the ALLOW never fires at submit time. In that case add a submitter clause, e.g. `approvers.any(user, user.tags.contains('agent')) && approvers.filter(user, user.tags.contains('trader')).count() >= 2`. See the submitter-in-consensus rule in the main skill.

### Solana: restrict to a specific program

```json
{
  "policyName": "agent-solana-system-program-only",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "solana.tx.program_keys.all(p, p == '11111111111111111111111111111111')"
}
```

### Tron: allow TRX transfers under a cap

```json
{
  "policyName": "agent-tron-transfer-cap",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "tron.tx.contract[0].type == 'TransferContract' && tron.tx.contract[0].amount < 10000000"
}
```

Amount is in SUN (1 TRX = 1,000,000 SUN). This cap is 10 TRX.

### Tempo: restrict calls to an approved contract

```json
{
  "policyName": "agent-tempo-approved-contract",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "tempo.tx.calls.all(call, call.to == '<APPROVED_CONTRACT>')"
}
```

Uses `all` to ensure every call in a batched Tempo transaction targets the approved address.

### Block admin operations for an agent

```json
{
  "policyName": "agent-deny-admin",
  "effect": "EFFECT_DENY",
  "condition": "activity.resource in ['USER', 'POLICY', 'ORGANIZATION']"
}
```

No `consensus` — applies universally. Prevents any user from creating users, modifying policies, or changing org settings. Root users bypass this.

### Allow only managed EVM transactions (block raw signing)

```json
{
  "policyName": "agent-managed-eth-only",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "activity.type == 'ACTIVITY_TYPE_ETH_SEND_TRANSACTION' && wallet.id == '<WALLET_ID>'"
}
```

Unlike `activity.action == 'SIGN'`, this only allows Turnkey-managed EVM sends. Raw payload signing and `SIGN_TRANSACTION_V2` are not covered, so the agent cannot sign arbitrary bytes.

### Deny raw payload signing (allow everything else)

```json
{
  "policyName": "deny-raw-signing",
  "effect": "EFFECT_DENY",
  "condition": "activity.type == 'ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2'"
}
```

Blocks raw payload signing while still permitting `SIGN_TRANSACTION_V2`, `ETH_SEND_TRANSACTION`, and `SOL_SEND_TRANSACTION`. Useful when you want parsed-transaction policies to govern signing but don't want agents signing arbitrary bytes.

## Anti-patterns (DO NOT use these)

### Unscoped signing ALLOW

```json
{
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "activity.action == 'SIGN'"
}
```

**Why it's bad:** No wallet scope. The agent can sign with ANY wallet or key in the organization. Always include `wallet.id == '<ID>'` or `private_key.id == '<ID>'`.

### ALLOW-all with no conditions

```json
{
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '<USER_ID>')"
}
```

**Why it's bad:** No condition means this user can do anything — create users, modify policies, delete wallets. Only use this for admin users who genuinely need full access.

### Mixed context in one condition

```json
{
  "condition": "wallet.id == 'wlt_123' || private_key.id == 'pk_456'"
}
```

**Why it's bad:** The policy engine doesn't short-circuit. One side will always error depending on whether the signing target is a wallet or private key. Split into separate policies.

### DENY-all with no admin escape

```json
{
  "effect": "EFFECT_DENY",
  "condition": "true"
}
```

**Why it's bad:** Blocks all non-root users from all actions. The only way to remove this policy is via root quorum. If root access is unavailable, the organization is permanently locked.

### Wrong units for spending caps

```json
{
  "condition": "eth.tx.value > 1"
}
```

**Why it's bad:** `eth.tx.value` is in wei. This blocks transfers above 1 wei (essentially all transfers). Use `1000000000000000000` for 1 ETH, `100000000000000000` for 0.1 ETH, etc.

**Unit reference:**
- ETH: `eth.tx.value` in wei (1 ETH = 10^18 wei)
- SOL: `solana.tx.transfers[].amount` in lamports (1 SOL = 10^9 lamports)
- BTC: `bitcoin.tx.outputs[].value` in satoshis (1 BTC = 10^8 satoshis)
- TRX: `tron.tx.contract[0].amount` in SUN (1 TRX = 10^6 SUN)
