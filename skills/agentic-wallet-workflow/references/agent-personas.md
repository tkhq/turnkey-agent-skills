# Agent Persona Policy Templates

Three standard personas for AI agents operating on Turnkey. Each defines a trust level with complete policy templates you can deploy directly.

All personas assume the agent is a **non-root user** inside a sub-organization. Root users bypass all policies, which defeats the purpose of guardrails.

## Worker Agent

Signs transactions using a Turnkey wallet. Cannot mutate guardrails, create users, or expand its own authority. This is the default persona for production agents.

**Use cases:** trading bot, payment processor, DeFi yield optimizer, NFT minting agent.

### ALLOW policy: signing only

```
POST https://api.turnkey.com/public/v1/submit/create_policy
```

```json
{
  "policyName": "worker-agent-allow-signing",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('worker-agent'))",
  "condition": "activity.action == 'SIGN'",
  "notes": "Allow worker agent to sign transactions and raw payloads"
}
```

### DENY policy: block admin operations

```
POST https://api.turnkey.com/public/v1/submit/create_policies
```

```json
{
  "policies": [
    {
      "policyName": "worker-agent-deny-admin-ops",
      "effect": "EFFECT_DENY",
      "consensus": "approvers.any(user, user.tags.contains('worker-agent'))",
      "condition": "activity.resource in ['USER', 'POLICY', 'ORGANIZATION'] || (activity.resource == 'WALLET' && activity.action in ['DELETE', 'EXPORT'])",
      "notes": "Block worker agent from user, policy, org, and wallet delete/export operations"
    }
  ]
}
```

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

Read-only access. Cannot sign transactions or mutate anything. All users can implicitly call query endpoints (list_wallets, list_activities, etc.), so no ALLOW policy is needed. The DENY policy acts as a safety net to block all submit actions.

**Use cases:** monitoring dashboard, compliance auditor, balance tracker, alerting agent.

### DENY policy: block all mutations

No ALLOW policy is needed. Query endpoints are accessible to all authenticated users. The explicit DENY ensures the observer cannot submit any actions even if an ALLOW policy is accidentally added later.

```
POST https://api.turnkey.com/public/v1/submit/create_policies
```

```json
{
  "policies": [
    {
      "policyName": "observer-agent-deny-signing",
      "effect": "EFFECT_DENY",
      "consensus": "approvers.any(user, user.tags.contains('observer-agent'))",
      "condition": "activity.action == 'SIGN'",
      "notes": "Block observer agent from signing transactions"
    },
    {
      "policyName": "observer-agent-deny-wallet-mutations",
      "effect": "EFFECT_DENY",
      "consensus": "approvers.any(user, user.tags.contains('observer-agent'))",
      "condition": "activity.resource == 'WALLET' && activity.action in ['CREATE', 'DELETE', 'EXPORT', 'IMPORT']",
      "notes": "Block observer agent from wallet mutations"
    },
    {
      "policyName": "observer-agent-deny-user-mutations",
      "effect": "EFFECT_DENY",
      "consensus": "approvers.any(user, user.tags.contains('observer-agent'))",
      "condition": "activity.resource in ['USER', 'CREDENTIAL'] && activity.action in ['CREATE', 'DELETE', 'UPDATE']",
      "notes": "Block observer agent from user mutations"
    },
    {
      "policyName": "observer-agent-deny-policy-mutations",
      "effect": "EFFECT_DENY",
      "consensus": "approvers.any(user, user.tags.contains('observer-agent'))",
      "condition": "activity.resource in ['POLICY', 'ORGANIZATION'] && activity.action in ['CREATE', 'DELETE', 'UPDATE']",
      "notes": "Block observer agent from policy and org mutations"
    }
  ]
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

## Admin Agent

Administers the Turnkey organization. Can sign transactions, manage users, and manage policies. Still operates as a non-root user so that policies apply. Critical operations (quorum changes, wallet deletion, wallet export) are blocked as a safety net requiring human intervention.

**Use cases:** organizational automation, infrastructure management, onboarding automation, policy lifecycle management.

### ALLOW policy: signing and management

```
POST https://api.turnkey.com/public/v1/submit/create_policies
```

```json
{
  "policies": [
    {
      "policyName": "admin-agent-allow-signing",
      "effect": "EFFECT_ALLOW",
      "consensus": "approvers.any(user, user.tags.contains('admin-agent'))",
      "condition": "activity.action == 'SIGN'",
      "notes": "Allow admin agent to sign transactions"
    },
    {
      "policyName": "admin-agent-allow-user-management",
      "effect": "EFFECT_ALLOW",
      "consensus": "approvers.any(user, user.tags.contains('admin-agent'))",
      "condition": "activity.resource in ['USER', 'CREDENTIAL'] && activity.action in ['CREATE', 'DELETE', 'UPDATE']",
      "notes": "Allow admin agent to manage users and API keys"
    },
    {
      "policyName": "admin-agent-allow-policy-management",
      "effect": "EFFECT_ALLOW",
      "consensus": "approvers.any(user, user.tags.contains('admin-agent'))",
      "condition": "activity.resource == 'POLICY' && activity.action in ['CREATE', 'DELETE', 'UPDATE']",
      "notes": "Allow admin agent to manage policies"
    },
    {
      "policyName": "admin-agent-allow-wallet-management",
      "effect": "EFFECT_ALLOW",
      "consensus": "approvers.any(user, user.tags.contains('admin-agent'))",
      "condition": "activity.resource == 'WALLET' && activity.action == 'CREATE'",
      "notes": "Allow admin agent to create wallets and accounts"
    }
  ]
}
```

### DENY policy: safety net for critical operations

Even admin agents should not modify root quorum, delete wallets, or export wallet material without human approval.

```
POST https://api.turnkey.com/public/v1/submit/create_policy
```

```json
{
  "policyName": "admin-agent-deny-critical-ops",
  "effect": "EFFECT_DENY",
  "consensus": "approvers.any(user, user.tags.contains('admin-agent'))",
  "condition": "activity.resource == 'WALLET' && activity.action in ['DELETE', 'EXPORT']",
  "notes": "Block admin agent from wallet deletion and wallet export. Root quorum changes bypass the policy engine entirely and do not need a DENY policy."
}
```

### User tag setup

When creating the admin agent user, apply the `admin-agent` tag:

```json
{
  "users": [{
    "userName": "admin-agent",
    "apiKeys": [{
      "apiKeyName": "admin-agent-key",
      "publicKey": "<AGENT_PUBLIC_KEY>",
      "curveType": "API_KEY_CURVE_P256"
    }],
    "authenticators": [],
    "userTags": ["admin-agent"]
  }]
}
```

## Choosing a Persona

| Persona | Can sign | Can manage users/policies | Can delete wallets | Can modify quorum |
|---------|----------|--------------------------|-------------------|-------------------|
| Worker  | Yes      | No                       | No                | No                |
| Observer| No       | No                       | No                | No                |
| Admin   | Yes      | Yes                      | No                | No                |

Start with the Worker persona. Escalate to Admin only when the agent needs to provision other users or manage policies programmatically. Use Observer for any agent that only needs to read data.
