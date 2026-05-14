# Policy Update Examples

Complete request/response examples for common agent policy changes.

**Base URL:** `https://api.turnkey.com`

## List current policies

Always list policies first to find the one you need to update.

```
POST /public/v1/query/list_policies
```

```json
{
  "organizationId": "<ORG_ID>"
}
```

**Response:**

```json
{
  "policies": [
    {
      "policyId": "pol-allow-001",
      "policyName": "agent-can-sign",
      "effect": "EFFECT_ALLOW",
      "consensus": "approvers.any(user, user.tags.contains('tag-agent-001'))",
      "condition": "activity.action == 'SIGN' && wallet.id == 'wlt_abc'"
    },
    {
      "policyId": "pol-deny-001",
      "policyName": "deny-large-eth",
      "effect": "EFFECT_DENY",
      "condition": "eth.tx.value > 100000000000000000"
    },
    {
      "policyId": "pol-allow-002",
      "policyName": "agent-eth-allowlist",
      "effect": "EFFECT_ALLOW",
      "consensus": "approvers.any(user, user.tags.contains('tag-agent-001'))",
      "condition": "wallet.id == 'wlt_abc' && eth.tx.to in ['0xAddr1', '0xAddr2']"
    }
  ]
}
```

## Increase spending cap

Change the DENY threshold from 0.1 ETH to 0.5 ETH:

```
POST /public/v1/submit/update_policy
```

```json
{
  "policyId": "pol-deny-001",
  "policyName": "deny-large-eth",
  "policyEffect": "EFFECT_DENY",
  "policyCondition": "eth.tx.value > 500000000000000000",
  "policyNotes": "Block transfers above 0.5 ETH (updated from 0.1 ETH)"
}
```

**Unit reminder:** 0.5 ETH = `500000000000000000` wei. 1 ETH = `1000000000000000000` wei.

## Add an address to the allowlist

Add `0xNewAddr3` to an existing ALLOW:

```json
{
  "policyId": "pol-allow-002",
  "policyName": "agent-eth-allowlist",
  "policyEffect": "EFFECT_ALLOW",
  "policyConsensus": "approvers.any(user, user.tags.contains('tag-agent-001'))",
  "policyCondition": "wallet.id == 'wlt_abc' && eth.tx.to in ['0xAddr1', '0xAddr2', '0xNewAddr3']",
  "policyNotes": "Added 0xNewAddr3"
}
```

You must include the full list of addresses — `update_policy` replaces the condition entirely, it doesn't append.

## Remove an address from the allowlist

Remove `0xAddr2`:

```json
{
  "policyId": "pol-allow-002",
  "policyName": "agent-eth-allowlist",
  "policyEffect": "EFFECT_ALLOW",
  "policyConsensus": "approvers.any(user, user.tags.contains('tag-agent-001'))",
  "policyCondition": "wallet.id == 'wlt_abc' && eth.tx.to in ['0xAddr1', '0xNewAddr3']",
  "policyNotes": "Removed 0xAddr2"
}
```

## Add a function restriction (requires ABI)

If the agent should only call `transfer()` on a specific contract, and you've already uploaded the ABI:

```json
{
  "policyId": "pol-allow-002",
  "policyName": "agent-usdc-transfer-only",
  "policyEffect": "EFFECT_ALLOW",
  "policyConsensus": "approvers.any(user, user.tags.contains('tag-agent-001'))",
  "policyCondition": "wallet.id == 'wlt_abc' && eth.tx.to == '0xUSDC_CONTRACT' && eth.tx.function_name == 'transfer'",
  "policyNotes": "Restrict to transfer() on USDC only"
}
```

## Add a Solana policy (after adding Solana chain)

After deriving a Solana account on the agent's wallet, create a new ALLOW for Solana signing:

```
POST /public/v1/submit/create_policy
```

```json
{
  "policyName": "agent-solana-sign",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('tag-agent-001'))",
  "condition": "wallet.id == 'wlt_abc' && solana.tx.program_keys.all(p, p == '11111111111111111111111111111111')",
  "notes": "Allow agent to sign Solana System Program transactions"
}
```

The existing EVM ALLOW policy doesn't cover Solana — you need a separate policy with `solana.tx.*` conditions.

## Delete a policy

If a policy is no longer needed (e.g., removing a DENY guardrail):

```
POST /public/v1/submit/delete_policy
```

```json
{
  "policyId": "pol-deny-001"
}
```

**Warning:** Deleting a DENY policy immediately broadens the agent's access. Deleting an ALLOW policy immediately restricts it. Confirm with the human before deleting.
