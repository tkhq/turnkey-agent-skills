# Policy Debugging Examples

> **CLI migration:** This is retained API parameter/semantic reference material. Execute supported core operations through the commands in the parent SKILL.md and root CLI convention. SDK authentication, stamping, inline key-generation scripts, and old envelope/retry instructions below are superseded. Import/export crypto and unvalidated request bridges remain explicit gaps; this reference alone does not establish CLI completion. Existing user authorization takes precedence over blanket per-call confirmation wording in legacy examples.


How to interpret `get_policy_evaluations` results when an agent transaction is denied.

**Base URL:** `https://api.turnkey.com`

## Get policy evaluations

```
POST /public/v1/query/get_policy_evaluations
```

```json
{
  "organizationId": "<ORG_ID>",
  "activityId": "<DENIED_ACTIVITY_ID>"
}
```

## Example: DENY policy matched (spending cap exceeded)

**Response:**

```json
{
  "policyEvaluations": [
    {
      "policyId": "pol-allow-sign-001",
      "policyName": "agent-can-sign",
      "outcome": "OUTCOME_ALLOW"
    },
    {
      "policyId": "pol-deny-large-001",
      "policyName": "deny-large-eth",
      "outcome": "OUTCOME_DENY_EXPLICIT"
    }
  ]
}
```

**Interpretation:** The ALLOW policy matched (agent is permitted to sign with this wallet), but the DENY policy also matched because `eth.tx.value` exceeded the cap. DENY wins over ALLOW.

**Fix:** Either lower the transaction amount or update the spending cap policy (with human confirmation).

## Example: No ALLOW matched (implicit deny)

**Response:**

```json
{
  "policyEvaluations": [
    {
      "policyId": "pol-allow-sign-001",
      "policyName": "agent-can-sign",
      "outcome": "OUTCOME_DENY_IMPLICIT"
    }
  ]
}
```

**Interpretation:** The ALLOW policy didn't match. Common causes:
- The `wallet.id` in the condition doesn't match the wallet being signed with
- The `consensus` expression doesn't match the agent's user ID or tags
- The `activity.action` condition doesn't cover this action type

**Fix:** Check the ALLOW policy's condition against the actual signing request. Verify wallet ID, user tags, and action type all align.

## Example: Policy evaluation errored

**Response:**

```json
{
  "policyEvaluations": [
    {
      "policyId": "pol-combined-001",
      "policyName": "combined-wallet-and-key",
      "outcome": "OUTCOME_ERROR"
    }
  ]
}
```

**Interpretation:** The policy condition errored during evaluation. Most common cause: the no-short-circuit rule. If the condition uses `wallet.id == 'X' || private_key.id == 'Y'`, one side always errors because the keyword doesn't exist in the current context.

**Fix:** Split the policy into two separate policies — one for wallet signing, one for private key signing. See the anti-patterns section in `managing-policies`.

## Example: Consensus required (multi-sig)

**Response:**

```json
{
  "policyEvaluations": [
    {
      "policyId": "pol-multisig-001",
      "policyName": "require-two-admins",
      "outcome": "OUTCOME_REQUIRES_CONSENSUS"
    }
  ]
}
```

**Interpretation:** The policy requires multiple approvers. The activity is now in `ACTIVITY_STATUS_CONSENSUS_NEEDED` state. Other authorized users must call `approve_activity` with the activity's fingerprint before it proceeds.

**Fix:** This isn't an error — it's working as designed. Have the required approvers approve the activity, or adjust the consensus threshold if multi-sig isn't intended for this action.

## Debugging checklist

When an agent transaction is denied:

1. **Get the activity ID** from the failed signing response
2. **Call `get_policy_evaluations`** with that activity ID
3. **Check each policy's outcome:**
   - `OUTCOME_DENY_EXPLICIT` → a DENY policy matched. Check its condition.
   - `OUTCOME_DENY_IMPLICIT` → no ALLOW matched. Check ALLOW conditions.
   - `OUTCOME_ERROR` → policy condition errored. Check for no-short-circuit issues.
   - `OUTCOME_REQUIRES_CONSENSUS` → multi-sig needed. Have approvers approve.
4. **Before broadening any policy**, revisit the original constraint decisions with the human
