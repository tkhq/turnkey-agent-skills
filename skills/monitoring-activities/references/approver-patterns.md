# Approver Patterns

Setup guides for three approaches to activity approval.

## Pattern 1: Root user via Claude Code

No setup needed. Root users bypass all policies and can always approve or reject any activity.

**Workflow:**

1. List pending approvals:
```json
{
  "organizationId": "<ORG_ID>",
  "filterByStatus": ["ACTIVITY_STATUS_CONSENSUS_NEEDED"]
}
```

2. For each activity, get details to review what's being requested:
```json
{
  "organizationId": "<ORG_ID>",
  "activityId": "<ACTIVITY_ID>"
}
```

3. Approve (using the `fingerprint`, not `activityId`):
```json
{
  "fingerprint": "<ACTIVITY_FINGERPRINT>"
}
```

**When to use:** Small team, low volume, maximum oversight.

## Pattern 2: Non-root admin via Claude Code

An admin user reviews and approves using their own non-root credentials.

### Setup

**Step 1:** Create the admin user with a tag. `userTags` takes tag **IDs**, not names — create the `admin` tag first with `create_user_tag` (or look it up with `list_user_tags`) to get its `userTagId`, e.g. `tag_admin123`:

```
POST /public/v1/submit/create_users
```

```json
{
  "users": [{
    "userName": "admin-reviewer",
    "apiKeys": [{
      "apiKeyName": "admin-key",
      "publicKey": "<ADMIN_PUBLIC_KEY>",
      "curveType": "API_KEY_CURVE_P256"
    }],
    "authenticators": [],
    "oauthProviders": [],
    "userTags": ["tag_admin123"]
  }]
}
```

**Step 2:** Create a policy that triggers consensus and includes **both the submitting agent and the admin** in the approval expression.

Example — agent transactions above 0.5 ETH require admin approval:

```
POST /public/v1/submit/create_policy
```

```json
{
  "policyName": "large-transfer-requires-admin",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent')) && approvers.filter(user, user.tags.contains('admin')).count() >= 1",
  "condition": "activity.action == 'SIGN' && wallet.id == '<WALLET_ID>' && eth.tx.value > 500000000000000000",
  "notes": "Large ETH transfers require an admin to co-approve the agent's submission"
}
```

When the agent submits a transfer above 0.5 ETH, its auto-vote satisfies the `agent` clause and the activity enters `CONSENSUS_NEEDED`. The admin reviews with Claude Code using their own credentials and approves (satisfying the `admin` clause) or rejects.

> **Why the `agent` clause?** Without it — i.e. a consensus of just `admin.count() >= 1` — the agent's auto-vote would contribute 0 to the admin count, consensus would evaluate to false at submit time, and the ALLOW would never fire. The request would be implicit-denied rather than entering `CONSENSUS_NEEDED`. See [`managing-policies` → The submitter-in-consensus rule](../../managing-policies/SKILL.md#the-submitter-in-consensus-rule).

**When to use:** Teams that want human review without exposing root credentials.

## Pattern 3: Automated agent approver

A dedicated agent that programmatically approves or rejects other agents' activities.

### Setup

**Step 1:** Create the approver user. `userTags` takes tag **IDs** — create the `approver` tag first with `create_user_tag` (or look it up with `list_user_tags`) to get its `userTagId`, e.g. `tag_approver456`:

```json
{
  "users": [{
    "userName": "approver-agent",
    "apiKeys": [{
      "apiKeyName": "approver-key",
      "publicKey": "<APPROVER_PUBLIC_KEY>",
      "curveType": "API_KEY_CURVE_P256"
    }],
    "authenticators": [],
    "oauthProviders": [],
    "userTags": ["tag_approver456"]
  }]
}
```

**Step 2:** Create a narrow ALLOW for the approver — it should only be able to approve/reject, nothing else:

```json
{
  "policyName": "approver-can-vote",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('approver'))",
  "condition": "activity.type in ['ACTIVITY_TYPE_APPROVE_ACTIVITY', 'ACTIVITY_TYPE_REJECT_ACTIVITY']"
}
```

**Step 3:** Create a policy on the worker agent that requires the approver agent's consensus. The worker's submitting tag (`agent`) must appear in consensus alongside the approver requirement — otherwise the request is implicit-denied at submit time instead of entering `CONSENSUS_NEEDED` (see [`managing-policies` → The submitter-in-consensus rule](../../managing-policies/SKILL.md#the-submitter-in-consensus-rule)):

```json
{
  "policyName": "worker-needs-approval",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent')) && approvers.filter(user, user.tags.contains('approver')).count() >= 1",
  "condition": "activity.action == 'SIGN' && wallet.id == '<WORKER_WALLET_ID>'"
}
```

### Approver agent workflow

The approver agent runs a polling loop:

1. **Poll** for pending activities:
```json
{
  "organizationId": "<ORG_ID>",
  "filterByStatus": ["ACTIVITY_STATUS_CONSENSUS_NEEDED"]
}
```

2. **Evaluate** each pending activity against predefined criteria:
   - Is the activity type expected? (signing, not user creation)
   - Is the amount within acceptable range?
   - Is the destination in the approved list?
   - Is the activity from a known agent user?

3. **Approve** if criteria pass:
```json
{
  "fingerprint": "<ACTIVITY_FINGERPRINT>"
}
```

4. **Reject** if criteria fail, or **escalate** to a human if uncertain.

### Security for agent approvers

- The approver agent must NOT be able to sign transactions — its only permission is voting
- Define approval criteria as concrete, programmatic rules (not judgment calls)
- Log all approval/rejection decisions with reasons
- Monitor the approver for anomalies (approving everything, approving unusual types)
- For high-value operations, require BOTH agent and human approval (see combining patterns below)

**When to use:** High-volume operations where human review of every transaction is impractical.

## Combining patterns: agent + human

Require both automated and human approval. The first clause represents the submitting agent (so the activity can enter `CONSENSUS_NEEDED` — see [the submitter-in-consensus rule](../../managing-policies/SKILL.md#the-submitter-in-consensus-rule)):

```json
{
  "policyName": "high-value-dual-approval",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent')) && approvers.filter(user, user.tags.contains('admin')).count() >= 1 && approvers.filter(user, user.tags.contains('approver')).count() >= 1",
  "condition": "activity.action == 'SIGN' && wallet.id == '<WALLET_ID>' && eth.tx.value > 1000000000000000000"
}
```

For ETH transfers above 1 ETH: the approver agent provides fast automated risk checks, the human admin provides judgment. Both must approve before the transaction proceeds.

## Tiered approval example

Different thresholds for different amounts. In every tier the first consensus clause names the submitting agent so the activity can enter `CONSENSUS_NEEDED` (see [the submitter-in-consensus rule](../../managing-policies/SKILL.md#the-submitter-in-consensus-rule)):

**Low value (< 0.1 ETH):** Approver agent auto-approves

```json
{
  "policyName": "low-value-approver-auto",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent')) && approvers.filter(user, user.tags.contains('approver')).count() >= 1",
  "condition": "activity.action == 'SIGN' && wallet.id == '<WALLET_ID>' && eth.tx.value <= 100000000000000000"
}
```

**Medium value (0.1 - 1 ETH):** Approver agent + human admin

```json
{
  "policyName": "medium-value-dual-approval",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent')) && approvers.filter(user, user.tags.contains('admin')).count() >= 1 && approvers.filter(user, user.tags.contains('approver')).count() >= 1",
  "condition": "activity.action == 'SIGN' && wallet.id == '<WALLET_ID>' && eth.tx.value > 100000000000000000 && eth.tx.value <= 1000000000000000000"
}
```

**High value (> 1 ETH):** Two humans required

```json
{
  "policyName": "high-value-two-admins",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent')) && approvers.filter(user, user.tags.contains('admin')).count() >= 2",
  "condition": "activity.action == 'SIGN' && wallet.id == '<WALLET_ID>' && eth.tx.value > 1000000000000000000"
}
```
