---
name: managing-agent
description: "Day-2 operations for a provisioned Turnkey agent: debug denied transactions, update policies (spending limits, allowlists), rotate API keys, revoke access, and add chains. Requires root credentials. For initial agent setup, use provisioning-agent."
license: Apache-2.0
compatibility: "Requires Turnkey root credentials (P-256 key pair). All recipes run with root/admin access."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: "workflow agent management key-rotation revocation debugging policy-update"
---

# Managing an Agent

Independent recipes for day-2 agent operations. Each section is self-contained — find the one that matches your situation.

All recipes run with **root credentials** (or credentials with sufficient policy permissions). These are admin operations, not actions the agent performs on itself.

Base URL: `https://api.turnkey.com`

## Rules (mandatory)

1. **Human confirmation before any policy change.** Display the updated policy and explain what changes. Wait for explicit approval.
2. **When revoking access, delete keys first.** Key deletion is instant. Policy and user cleanup can happen after.

## Prerequisites

Requires **root** API credentials. All recipes run with root/admin access, not agent credentials.

```env
TURNKEY_API_PUBLIC_KEY=    # Root API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # Root API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Turnkey organization UUID
```

Use the `getting-started` skill if you still need to verify credentials.

---

## My agent's transaction was denied

Use `get_policy_evaluations` to see exactly which policy blocked it and why.

```
POST /public/v1/query/get_policy_evaluations
```

```json
{
  "organizationId": "<ORG_ID>",
  "activityId": "<DENIED_ACTIVITY_ID>"
}
```

The response contains a `policyEvaluations` array. Each entry shows a policy and its outcome:

| Outcome | Meaning |
|---------|---------|
| `OUTCOME_ALLOW` | This policy permitted the action |
| `OUTCOME_DENY_EXPLICIT` | This policy explicitly blocked the action (a DENY matched) |
| `OUTCOME_DENY_IMPLICIT` | No ALLOW policy matched — blocked by default deny |
| `OUTCOME_REQUIRES_CONSENSUS` | Policy requires multi-party approval before proceeding |
| `OUTCOME_ERROR` | Policy evaluation errored (likely a no-short-circuit issue — see `managing-policies`) |

**Common causes:**

- **`OUTCOME_DENY_EXPLICIT`**: A DENY policy's condition matched. Check the spending cap or address allowlist. Either lower the transaction amount / change the destination, or update the DENY policy with the human's approval.
- **`OUTCOME_DENY_IMPLICIT`**: No ALLOW policy matched. The agent's ALLOW policy condition doesn't cover this action. Check that `wallet.id`, chain-specific conditions, or consensus expressions match.
- **`OUTCOME_ERROR`**: A policy condition errored during evaluation. Most common cause: mixing `wallet.id` and `private_key.id` in one condition (no-short-circuit rule). Split into separate policies.

**Do not broaden policies without revisiting the original constraint decisions with the human.** A denied transaction may be the policy working correctly.

For full debugging examples, see [references/policy-debugging-examples.md](references/policy-debugging-examples.md).

---

## I need to change spending limits or allowed addresses

### Find the policy to update

```
POST /public/v1/query/list_policies
```

```json
{
  "organizationId": "<ORG_ID>"
}
```

Identify the relevant policy by name (e.g., `deny-large-eth` for spending cap, `agent-eth-allowlist` for address restrictions).

### Update the policy

**Confirm the change with the human before submitting.**

```
POST /public/v1/submit/update_policy
```

Example — increase spending cap from 0.1 ETH to 0.5 ETH:

```json
{
  "policyId": "<POLICY_ID>",
  "policyName": "deny-large-eth",
  "policyEffect": "EFFECT_DENY",
  "policyCondition": "eth.tx.value > 500000000000000000",
  "policyNotes": "Block transfers above 0.5 ETH (was 0.1 ETH)"
}
```

Example — add a new address to the allowlist:

```json
{
  "policyId": "<POLICY_ID>",
  "policyName": "agent-eth-allowlist",
  "policyEffect": "EFFECT_ALLOW",
  "policyConsensus": "approvers.any(user, user.tags.contains('agent'))",
  "policyCondition": "eth.tx.to in ['0xAddr1', '0xAddr2', '0xNewAddr3']",
  "policyNotes": "Added 0xNewAddr3 to allowlist"
}
```

After updating, list policies again and confirm the full active set with the human.

For more examples, see [references/policy-update-examples.md](references/policy-update-examples.md).

---

## I need to rotate the agent's API key

Rotate without downtime. Each step must succeed before proceeding.

**Step 1:** Generate a new P-256 key pair locally.

**Step 2:** Register the new public key (sign this with the **root** or **old agent** key):

```
POST /public/v1/submit/create_api_keys
```

```json
{
  "userId": "<AGENT_USER_ID>",
  "apiKeys": [{
    "apiKeyName": "agent-key-v2",
    "publicKey": "<NEW_PUBLIC_KEY>",
    "curveType": "API_KEY_CURVE_P256"
  }]
}
```

**Step 3:** Verify the new key works (sign this with the **new** key):

```
POST /public/v1/query/whoami
```

```json
{
  "organizationId": "<ORG_ID>"
}
```

If this returns the agent's user details, the new key is working.

**Step 4:** Delete the old key (sign this with the **new** key):

```
POST /public/v1/submit/delete_api_keys
```

```json
{
  "userId": "<AGENT_USER_ID>",
  "apiKeyIds": ["<OLD_KEY_ID>"]
}
```

**Step 5:** Update the agent's runtime environment with the new `TURNKEY_API_PUBLIC_KEY` and `TURNKEY_API_PRIVATE_KEY`.

For the complete rotation workflow with full request/response, see [references/key-rotation-examples.md](references/key-rotation-examples.md).

---

## I need to revoke agent access immediately

Delete all of the agent's API keys. This takes effect instantly — the agent can no longer authenticate.

```
POST /public/v1/submit/delete_api_keys
```

```json
{
  "userId": "<AGENT_USER_ID>",
  "apiKeyIds": ["<KEY_ID_1>", "<KEY_ID_2>"]
}
```

If you don't know the key IDs, list them first:

```
POST /public/v1/query/get_api_keys
```

```json
{
  "organizationId": "<ORG_ID>",
  "userId": "<AGENT_USER_ID>"
}
```

**After revoking keys**, optionally clean up:
- Delete the agent's policies (if they were user-specific)
- Delete the agent user with `delete_users`
- The wallet remains — it may hold funds that need to be transferred first

---

## I need to add a new chain to the agent's wallet

### Derive a new account

```
POST /public/v1/submit/create_wallet_accounts
```

```json
{
  "walletId": "<AGENT_WALLET_ID>",
  "accounts": [{
    "curve": "CURVE_ED25519",
    "pathFormat": "PATH_FORMAT_BIP32",
    "path": "m/44'/501'/0'/0'",
    "addressFormat": "ADDRESS_FORMAT_SOLANA"
  }]
}
```

For Bitcoin, remember the dual-account requirement (compressed key + address at same path). See the `managing-wallets` skill.

### Update policies for the new chain

Adding a chain account does NOT automatically grant the agent permission to sign on it. If the agent's ALLOW policy only references `eth.tx.*` conditions, it won't cover Solana, Tron, Tempo, or Bitcoin transactions.

You may need to:
1. **Create a new ALLOW policy** for the new chain (e.g., `solana.tx.*` for Solana, `tron.tx.*` for Tron, `tempo.tx.*` for Tempo, `bitcoin.tx.*` for Bitcoin)
2. **Create chain-specific DENY guardrails** (e.g., Solana transfer cap, Tron amount cap in SUN, program restrictions)
3. **Verify** the agent can sign on the new chain with a test payload

Confirm all policy changes with the human before creating them.

---

## Troubleshooting

**Key rotation: new key doesn't work after registration**
Verify the public key format is correct (hex-encoded P-256). Check that the `curveType` is `API_KEY_CURVE_P256`. Try `whoami` signed with the new key to isolate the issue.

**Policy update has no effect**
List all policies to check for conflicting DENY policies that override the updated ALLOW. Remember: DENY always wins.

**Agent still has access after key deletion**
Verify all keys were deleted, not just one. Use `get_api_keys` to confirm zero keys remain for the user. If using sessions, those may need to expire separately.

**New chain added but agent can't sign on it**
Policies are chain-specific. An ALLOW with `eth.tx.to in [...]` doesn't cover Solana, Tron, Tempo, or Bitcoin. Create a separate policy with the appropriate namespace (`solana.tx.*`, `tron.tx.*`, `tempo.tx.*`, `bitcoin.tx.*`).

## Related Skills

- `provisioning-agent` — initial agent setup (run this first)
- `managing-policies` — full policy reference, language, anti-patterns
- `managing-users` — user and API key details
- `managing-wallets` — wallet accounts and chain support
- `signing-transactions` — what the agent does with its wallet
