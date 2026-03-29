# Agent Persona Planning Templates

Use these templates inside `agentic-wallet-workflow` after the human has chosen a wallet, chains, and risk limits. These are guided templates, not copy-paste production policies.

All personas assume the agent is a **non-root user**.

## Worker Agent

Signs transactions using a Turnkey wallet. Cannot mutate guardrails, create users, or expand its own authority. This is the default persona for production agents.

**Use cases:** trading bot, payment processor, DeFi yield optimizer, NFT minting agent.

### Human decisions to lock before writing policy

- Wallet or address scope
- Allowed destinations
- Per-transfer and rolling spending limits
- Contract address and function restrictions
- Whether raw payload signing is allowed

### Base permission shape

```
POST https://api.turnkey.com/public/v1/submit/create_policy
```

```json
{
  "policyName": "worker-agent-allow-signing",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '<AGENT_USER_ID>')",
  "condition": "activity.action == 'SIGN' && wallet.id == '<WALLET_ID>'",
  "notes": "Base Worker permission. Tighten this with the human-selected guardrails before submitting."
}
```

Examples of additional constraints to layer in:

- `eth.tx.to in ['<ADDR1>', '<ADDR2>']`
- `eth.tx.value <= <WEI_LIMIT>`
- `eth.tx.function_name in ['transfer', 'approve']`
- `activity.resource in ['USER', 'POLICY', 'ORGANIZATION']` denial for admin operations

### User tag setup

When creating the worker agent user, apply the `worker-agent` tag:

```json
{
  "users": [{
    "userName": "worker-agent",
    "apiKeys": [{
      "apiKeyName": "worker-agent-key",
      "publicKey": "<AGENT_PUBLIC_KEY>",
      "curveType": "API_KEY_CURVE_P256"
    }],
    "authenticators": [],
    "userTags": ["worker-agent"]
  }]
}
```

## Observer Agent

Read-only access. In the usual case, create the observer user and do not add signing permissions.

**Use cases:** monitoring dashboard, compliance auditor, balance tracker, alerting agent.

### Optional explicit observer denial

If the org needs a hard stop on signing for observers, add one narrow DENY:

```json
{
  "policyName": "observer-agent-deny-signing",
  "effect": "EFFECT_DENY",
  "consensus": "approvers.any(user, user.id == '<OBSERVER_USER_ID>')",
  "condition": "activity.action == 'SIGN'",
  "notes": "Use only when the org's broader policy set makes an explicit observer block necessary."
}
```

### User tag setup

When creating the observer agent user, apply the `observer-agent` tag:

```json
{
  "users": [{
    "userName": "observer-agent",
    "apiKeys": [{
      "apiKeyName": "observer-agent-key",
      "publicKey": "<AGENT_PUBLIC_KEY>",
      "curveType": "API_KEY_CURVE_P256"
    }],
    "authenticators": [],
    "userTags": ["observer-agent"]
  }]
}
```

## Choosing a Persona

| Persona | Can sign | Best default |
|---------|----------|--------------|
| Worker  | Yes      | start narrow and add constraints |
| Observer| No       | no extra ALLOW policies |
