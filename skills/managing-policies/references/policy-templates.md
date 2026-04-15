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

### Solana: restrict to a specific program

```json
{
  "policyName": "agent-solana-system-program-only",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "solana.tx.program_keys.all(p, p == '11111111111111111111111111111111')"
}
```

### Block admin operations for an agent

```json
{
  "policyName": "agent-deny-admin",
  "effect": "EFFECT_DENY",
  "condition": "activity.resource in ['USER', 'POLICY', 'ORGANIZATION']"
}
```

No `consensus` — applies universally. Prevents any user from creating users, modifying policies, or changing org settings. Root users bypass this.

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
