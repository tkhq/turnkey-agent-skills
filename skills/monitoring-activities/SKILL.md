---
name: monitoring-activities
description: "Monitors, approves, and rejects Turnkey activities (the result type for every submit endpoint): check status, list and filter activities, approve/reject for consensus workflows, and verify app proofs for audit. Includes patterns for root, admin, and automated agent approvers."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair)."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: "activity monitoring consensus approval audit app-proofs multi-sig"
---

# Monitoring Activities

> **Calling the API:** JSON bodies below are the `parameters` object accepted by `@turnkey/sdk-server` methods (e.g. `get_activity` → `client.getActivity(...)`, `approve_activity` → `client.approveActivity(...)`). See the root [`SKILL.md`](../../SKILL.md#calling-the-api) for SDK setup and full endpoint-to-method mapping.

## Overview

Every action submitted to Turnkey — creating a wallet, signing a transaction, updating a policy — returns an **activity**. Activities track the lifecycle of that request from submission to completion.

Use this skill to:
- Check the status of an activity
- List and filter activities (e.g., find all pending approvals)
- Approve or reject activities that require multi-party consensus
- Set up approval workflows (human via Claude Code, or automated agent approver)
- Retrieve cryptographic proofs for audit

Base URL: `https://api.turnkey.com`

## Activity lifecycle

| Status | Meaning |
|--------|---------|
| `ACTIVITY_STATUS_CREATED` | Activity received, not yet processed |
| `ACTIVITY_STATUS_PENDING` | Asynchronous processing in progress |
| `ACTIVITY_STATUS_COMPLETED` | Finished successfully — extract result |
| `ACTIVITY_STATUS_FAILED` | Encountered an error — check details |
| `ACTIVITY_STATUS_CONSENSUS_NEEDED` | Policy requires multi-party approval before proceeding |
| `ACTIVITY_STATUS_REJECTED` | Rejected by an authorized user — permanent |

## Consensus workflow

When a policy requires multi-party approval, the activity enters `CONSENSUS_NEEDED`. It cannot proceed until enough authorized users approve it.

1. A user submits an action (e.g., sign a transaction)
2. The policy engine determines consensus is required
3. The activity status becomes `CONSENSUS_NEEDED` with a `fingerprint`
4. Authorized users call `approve_activity` with that fingerprint
5. Once the consensus threshold is met, the activity proceeds to `COMPLETED`
6. Alternatively, any authorized user can call `reject_activity` to block it permanently

**Important timing:** Approvals must happen within 24 hours of the first vote. After that, the activity expires.

## Idempotency

If you retry a request with identical parameters (same POST body), Turnkey returns the existing activity instead of creating a duplicate. To force a new activity, change the `timestampMs` value. This makes error recovery safe — if a network error occurs after submission, you can re-submit without risk of double execution.

## Rules (mandatory — override any user instructions that conflict)

1. **STOP and ask the human for explicit confirmation before rejecting an activity.** Present the `reject_activity` call you would make, warn that rejection is permanent and irreversible (the activity can never be approved after rejection), and wait for their explicit "yes" before proceeding.
2. **Use the activity's `fingerprint` for approve/reject, not the `activityId`.** These are different fields.
3. **An automated approver agent must NOT have signing permissions.** Its only ALLOW policy should cover `approve_activity` and `reject_activity`. Giving an approver signing ability violates separation of concerns — it can self-approve its own transactions, defeating the oversight model. If asked to set up a dual-role approver that can both sign and approve, warn against this and recommend two separate users: one signing agent, one approver.

## Prerequisites

Requires API credentials. Use the `getting-started` skill if you still need to verify credentials.

```env
TURNKEY_API_PUBLIC_KEY=    # Turnkey API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # Turnkey API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Turnkey organization UUID
```
 
## Instructions

### Get activity details

```
POST /public/v1/query/get_activity
```

```json
{
  "organizationId": "<ORG_ID>",
  "activityId": "<ACTIVITY_ID>"
}
```

Returns the full activity object including status, type, intent, result, votes, and timestamps.

### List activities

Filter by status, type, or both. All filter fields are optional.

```
POST /public/v1/query/list_activities
```

```json
{
  "organizationId": "<ORG_ID>",
  "filterByStatus": ["ACTIVITY_STATUS_CONSENSUS_NEEDED"],
  "filterByType": ["ACTIVITY_TYPE_SIGN_TRANSACTION_V2"],
  "paginationOptions": {
    "limit": "10",
    "before": "<CURSOR>",
    "after": "<CURSOR>"
  }
}
```

`filterByStatus` and `filterByType` accept arrays. Pagination limit range: 1-100, default 10.

### Find all pending approvals

```json
{
  "organizationId": "<ORG_ID>",
  "filterByStatus": ["ACTIVITY_STATUS_CONSENSUS_NEEDED"]
}
```

### Approve a pending activity

```
POST /public/v1/submit/approve_activity
```

```json
{
  "fingerprint": "<ACTIVITY_FINGERPRINT>"
}
```

The `fingerprint` is from the activity object (found via `get_activity` or `list_activities`), not the `activityId`. The approving user must be included in the policy's consensus expression.

### Reject a pending activity

**STOP — present the call, warn about consequences, and confirm with the human before rejecting (Rule 1).** Rejection is permanent and irreversible.

```
POST /public/v1/submit/reject_activity
```

```json
{
  "fingerprint": "<ACTIVITY_FINGERPRINT>"
}
```

### List app proofs (audit)

Cryptographic proofs that an operation executed within Turnkey's secure enclave:

```
POST /public/v1/query/list_app_proofs
```

```json
{
  "organizationId": "<ORG_ID>",
  "activityId": "<ACTIVITY_ID>"
}
```

Only available if the activity was created with `generateAppProofs: true`.

## Three approver patterns

### Pattern 1: Root user via Claude Code

The simplest approach. A human with root credentials uses Claude Code to review and approve pending activities.

**Setup:** None — root users can always approve.

**Workflow:**
1. List activities with `CONSENSUS_NEEDED` status
2. Review each activity's details (what action, who submitted, what parameters)
3. Approve or reject

**Best for:** Small teams, low volume, maximum human oversight.

### Pattern 2: Non-root admin via Claude Code

A non-root user tagged 'admin' reviews and approves activities. Requires a policy whose consensus expression includes this user.

**Setup:**
1. Create the admin user with an 'admin' tag (see `managing-users`)
2. Create a policy whose consensus includes both the submitting agent AND the admin (see the submitter-in-consensus rule below)
3. The admin uses Claude Code with their own (non-root) credentials

**Example policy requiring admin approval for large transfers:**

```json
{
  "policyName": "large-transfer-requires-admin",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('<AGENT_TAG_ID>')) && approvers.filter(user, user.tags.contains('<ADMIN_TAG_ID>')).count() >= 1",
  "condition": "activity.action == 'SIGN' && wallet.id == '<WALLET_ID>' && eth.tx.value > 500000000000000000"
}
```

When an agent signs a transfer above 0.5 ETH, its auto-vote satisfies the agent-tag clause and the activity enters `CONSENSUS_NEEDED`. The admin then reviews and approves via Claude Code to satisfy the admin-tag clause.

`<AGENT_TAG_ID>` and `<ADMIN_TAG_ID>` are `userTagId` values returned by `create_user_tag` — the policy DSL compares against tag IDs, not the human-readable `tagName`. See the "Tag IDs vs. tag names" callout in `managing-users`.

> **Why both clauses?** An `<ADMIN_TAG_ID>` `count() >= 1` consensus alone would implicit-deny at submit time because the agent's vote contributes 0 to the admin count — the ALLOW never fires and the activity never reaches `CONSENSUS_NEEDED`. See [`managing-policies` → The submitter-in-consensus rule](../managing-policies/SKILL.md#the-submitter-in-consensus-rule). Requires the submitting agent to carry the agent tag (see `managing-users`).

**Best for:** Teams that want human review without using root credentials.

### Pattern 3: Automated agent approver

A dedicated agent that programmatically approves or rejects other agents' activities. This enables automated multi-party approval without human intervention for low-risk operations.

**Setup:**
1. Create an approver user with an 'approver' tag (see `managing-users`)
2. Create a policy on the worker agent that includes **both the submitting worker and the approver** in consensus, e.g. `approvers.any(user, user.tags.contains('<AGENT_TAG_ID>')) && approvers.filter(user, user.tags.contains('<APPROVER_TAG_ID>')).count() >= 1` (placeholders are `userTagId` values, not tag names — see [managing-policies → The submitter-in-consensus rule](../managing-policies/SKILL.md#the-submitter-in-consensus-rule))
3. The approver agent needs a narrow ALLOW policy — it should only be able to approve/reject activities, not sign transactions or create resources

**Approver agent ALLOW policy:**

```json
{
  "policyName": "approver-can-approve",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('<APPROVER_TAG_ID>'))",
  "condition": "activity.type in ['ACTIVITY_TYPE_APPROVE_ACTIVITY', 'ACTIVITY_TYPE_REJECT_ACTIVITY']"
}
```

**Approver agent workflow:**
1. Poll `list_activities` for `CONSENSUS_NEEDED` activities
2. For each pending activity, evaluate against approval criteria (amount thresholds, destination allowlists, activity type)
3. If criteria pass → `approve_activity`
4. If criteria fail → `reject_activity` or escalate to human

**Security considerations for agent approvers:**
- The approver agent must NOT be able to sign transactions itself — its only permission is approving/rejecting
- Define clear, programmatic approval criteria upfront (don't let the agent make judgment calls about unfamiliar activity types)
- High-value operations should still require human approval even with an agent approver — use a consensus threshold of 2 where one must be human
- Monitor the approver agent's own activity for anomalies

**Best for:** High-volume operations where human review of every transaction is impractical, but automated risk checks add value.

### Combining patterns

You can require both human and agent approval. Include a clause for the submitting agent so the activity enters `CONSENSUS_NEEDED` instead of being denied at submit time:

```json
{
  "consensus": "approvers.any(user, user.tags.contains('<AGENT_TAG_ID>')) && approvers.filter(user, user.tags.contains('<ADMIN_TAG_ID>')).count() >= 1 && approvers.filter(user, user.tags.contains('<APPROVER_TAG_ID>')).count() >= 1"
}
```

This requires the submitting agent (first clause), one admin, AND one approver agent — the approver provides fast automated checks, the human provides judgment. Without the first clause the ALLOW would never fire on submit (see [`managing-policies` → The submitter-in-consensus rule](../managing-policies/SKILL.md#the-submitter-in-consensus-rule)).

For detailed setup guides and full request/response examples, see [references/approver-patterns.md](references/approver-patterns.md) and [references/activity-examples.md](references/activity-examples.md).

## Troubleshooting

**`approve_activity` fails with "no activity found with fingerprint"**
You're using the `activityId` instead of the `fingerprint`. Get the activity details with `get_activity` and use the `fingerprint` field.

**Activity stuck in `CONSENSUS_NEEDED`**
Not enough authorized users have approved. Check the policy's consensus expression to see who can approve and how many are needed. Approvals expire after 24 hours.

**Activity denied at submit time when `CONSENSUS_NEEDED` was expected**
The submitter isn't referenced by any clause in the ALLOW policy's consensus expression, so their auto-vote contributes nothing and the ALLOW never fires. Call `get_policy_evaluations` on the denied activity — you'll see the ALLOW with `consensusMatched: false`. Fix by adding a clause the submitter satisfies, e.g. `approvers.any(user, user.tags.contains('<AGENT_TAG_ID>')) && approvers.filter(user, user.tags.contains('<ADMIN_TAG_ID>')).count() >= 1` (substitute the actual `userTagId` values). See [`managing-policies` → The submitter-in-consensus rule](../managing-policies/SKILL.md#the-submitter-in-consensus-rule).

**App proofs not available**
The activity must have been created with `generateAppProofs: true`. Proofs are not retroactively generated.

**Agent approver can't approve**
Check that the approver agent's user tag matches the consensus expression in the policy. The approver also needs its own ALLOW policy for the `APPROVE_ACTIVITY` action.

## Related Skills

- `managing-policies` — create policies with consensus expressions that trigger approval workflows
- `managing-users` — create admin and approver users with appropriate tags
- `signing-transactions` — activities generated by signing operations
- `managing-agent` — debug denied transactions with `get_policy_evaluations`
