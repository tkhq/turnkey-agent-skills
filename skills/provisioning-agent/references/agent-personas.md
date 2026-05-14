# Agent Persona Templates

Use these templates after locking the decision gates with the human. These are starting points — tighten them based on the human's specific constraints.

All personas assume the agent is a **non-root user** with default-deny permissions.

## Worker Agent

Signs transactions using a Turnkey wallet. Cannot mutate guardrails, create users, or expand its own authority.

**Use cases:** trading bot, payment processor, DeFi agent, NFT minting agent, automated payroll.

### Decisions to lock before writing policies

Ask the human to confirm each:

- **Wallet scope**: Which wallet ID can the agent sign with?
- **Destination addresses**: Are transfers restricted to specific addresses?
- **Spending cap**: Is there a per-transaction limit? (in wei for ETH, lamports for SOL, satoshis for BTC)
- **Contract restrictions**: Are contract calls limited to specific addresses or function names? (function-level requires ABI upload)
- **Raw payload signing**: Default to chain-aware signing (`sign_transaction` or managed chain endpoints). Is `sign_raw_payload` absolutely required? If not, leave it excluded.

### Base ALLOW (always required)

This base policy intentionally excludes `sign_raw_payload` so the policy engine can inspect chain-specific transaction fields.

```json
{
  "policyName": "worker-agent-sign",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('<AGENT_TAG_ID>'))",
  "condition": "activity.type in ['ACTIVITY_TYPE_SIGN_TRANSACTION_V2', 'ACTIVITY_TYPE_ETH_SEND_TRANSACTION', 'ACTIVITY_TYPE_SOL_SEND_TRANSACTION'] && wallet.id == '<WALLET_ID>'",
  "notes": "Base chain-aware signing permission — raw payload signing excluded"
}
```

### Layering additional constraints

**Address allowlist (EVM):**
```json
{
  "policyName": "worker-eth-allowlist",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('<AGENT_TAG_ID>'))",
  "condition": "wallet.id == '<WALLET_ID>' && eth.tx.to in ['<ADDR_1>', '<ADDR_2>']"
}
```

**Spending cap (EVM, 0.1 ETH):**
```json
{
  "policyName": "worker-deny-large-eth",
  "effect": "EFFECT_DENY",
  "condition": "eth.tx.value > 100000000000000000"
}
```

**Function restriction (requires ABI upload):**
```json
{
  "policyName": "worker-usdc-transfer-only",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('<AGENT_TAG_ID>'))",
  "condition": "wallet_account.address == '<WALLET_ACCOUNT_ADDRESS>' && eth.tx.to == '<USDC_CONTRACT>' && eth.tx.function_name == 'transfer'"
}
```

**Solana program restriction:**
```json
{
  "policyName": "worker-solana-system-only",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('<AGENT_TAG_ID>'))",
  "condition": "wallet.id == '<WALLET_ID>' && solana.tx.program_keys.all(p, p == '11111111111111111111111111111111')"
}
```

**Block admin operations (optional DENY guardrail):**
```json
{
  "policyName": "worker-deny-admin",
  "effect": "EFFECT_DENY",
  "condition": "activity.resource in ['USER', 'POLICY', 'ORGANIZATION'] || (activity.resource == 'WALLET' && activity.action in ['DELETE', 'EXPORT'])"
}
```

### Worker user creation

`userTags` takes tag **IDs**. Create the `agent` tag via `create_user_tag` first (or look it up with `list_user_tags`) to get its `userTagId`:

```json
{
  "users": [{
    "userName": "worker-agent",
    "apiKeys": [{
      "apiKeyName": "worker-key-v1",
      "publicKey": "<AGENT_PUBLIC_KEY>",
      "curveType": "API_KEY_CURVE_P256"
    }],
    "authenticators": [],
    "userTags": ["<AGENT_TAG_ID>"]
  }]
}
```

The tag's **ID** (`<AGENT_TAG_ID>`) is what the policy DSL matches — `user.tags.contains('<AGENT_TAG_ID>')` in the consensus expressions above. The `tagName` you set when creating the tag (e.g. `"agent"`) is a label only; it is never compared against `user.tags` at evaluation time.

## Observer Agent

Read-only access. No signing permissions. Default-deny handles this automatically — a non-root user with no ALLOW policies can only read data in their organization.

**Use cases:** monitoring dashboard, compliance auditor, balance tracker, alerting agent.

### Policy approach

Usually no policies are needed. A non-root user without any ALLOW policies can:
- Read organization data (implicit permission)
- Manage their own credentials (implicit permission)
- Nothing else

If the organization has broad shared ALLOW policies that would unintentionally grant the observer signing access, add an explicit DENY:

```json
{
  "policyName": "observer-deny-signing",
  "effect": "EFFECT_DENY",
  "consensus": "approvers.any(user, user.tags.contains('<OBSERVER_TAG_ID>'))",
  "condition": "activity.action == 'SIGN'",
  "notes": "Explicit observer block — only needed if org has shared ALLOWs"
}
```

### Observer user creation

`userTags` takes tag **IDs**. Create the `observer` tag via `create_user_tag` first (or look it up with `list_user_tags`) to get its `userTagId`:

```json
{
  "users": [{
    "userName": "observer-agent",
    "apiKeys": [{
      "apiKeyName": "observer-key-v1",
      "publicKey": "<AGENT_PUBLIC_KEY>",
      "curveType": "API_KEY_CURVE_P256"
    }],
    "authenticators": [],
    "userTags": ["<OBSERVER_TAG_ID>"]
  }]
}
```

## Choosing a persona

| Persona | Can sign | Needs ALLOW policies | Default approach |
|---------|----------|---------------------|------------------|
| Worker | Yes | Yes — at minimum a wallet-scoped signing ALLOW | Start narrow, add constraints per decision gates |
| Observer | No | Usually no | Default-deny handles it; add DENY only if shared ALLOWs exist |
