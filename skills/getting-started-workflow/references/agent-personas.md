# Agent Persona Planning Templates

Use these templates when onboarding a Turnkey-powered agent after `getting-started-workflow`. They are intentionally guided, not turnkey policy bundles: the human should pick the constraints before any policy is created.

All personas assume the agent is a **non-root user**. Root users bypass policies and are not appropriate for scoped agents.

## Worker Agent

Signs transactions using a Turnkey wallet. Cannot mutate guardrails, create users, or expand its own authority. This is the default persona for production agents.

**Use cases:** trading bot, payment processor, DeFi yield optimizer, NFT minting agent.

### Human decisions to gather first

- Which wallet or address can this agent touch?
- Which destinations are allowed?
- Are there per-transfer or daily limits?
- Is this limited to specific contract addresses or function names?
- Should the agent sign chain-aware transactions only, or also raw payloads?

### Starter ALLOW shape

```
POST https://api.turnkey.com/public/v1/submit/create_policy
```

```json
{
  "policyName": "worker-agent-allow-signing",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '<AGENT_USER_ID>')",
  "condition": "activity.action == 'SIGN' && wallet.id == '<WALLET_ID>'",
  "notes": "Base worker permission. Tighten with destination, spending, or function constraints before submitting."
}
```

Then layer in the guardrails that fit the use case, for example:

- destination allowlists
- transfer caps
- contract/function allowlists
- explicit admin-operation denials when the org uses broader shared policies

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

Read-only access. Query endpoints do not require extra ALLOW policies, so the default Observer path is usually "create the user, then do not grant signing permissions."

**Use cases:** monitoring dashboard, compliance auditor, balance tracker, alerting agent.

### Optional hard-stop guardrail

If the org has broader shared ALLOW policies and the human wants a hard stop on signing for observers, add a narrowly targeted DENY like:

```json
{
  "policyName": "observer-agent-deny-signing",
  "effect": "EFFECT_DENY",
  "consensus": "approvers.any(user, user.id == '<OBSERVER_USER_ID>')",
  "condition": "activity.action == 'SIGN'",
  "notes": "Only add this when the org needs an explicit observer-specific block."
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

| Persona | Can sign | Suggested default | Best for |
|---------|----------|-------------------|----------|
| Worker  | Yes      | Start narrow and add constraints | Trading bots, payment processors, DeFi agents |
| Observer| No       | Usually no extra policies | Monitoring dashboards, compliance, balance tracking |

Start with Worker for agents that transact. Use Observer for agents that only read data.
