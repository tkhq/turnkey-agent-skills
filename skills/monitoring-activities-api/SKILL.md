---
name: monitoring-activities-api
description: "Monitors, approves, and audits Turnkey activities. Activities are the universal result type returned by every submit endpoint across all Turnkey skills. Covers checking activity status, listing activities with filters, consensus approval/rejection workflows, and cryptographic app proofs for audit trails. Use when asked to 'check activity status', 'list activities', 'approve a pending activity', 'reject an activity', 'consensus workflow', 'audit trail for an activity', 'why is my transaction pending', 'poll for activity completion', 'list app proofs', or 'verify an activity was executed in the enclave'. Do NOT use for creating policies (use managing-policies-api), signing transactions (use signing-transactions-api), creating wallets (use managing-wallets-api), managing users (use managing-users-api)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). See managing-users-api for authentication setup."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["activity", "api", "monitoring", "consensus", "approval", "audit", "status", "app-proofs"]
---

## Quick Start

Use the Turnkey API to monitor activity status, approve or reject activities requiring consensus, and retrieve cryptographic proofs for audit. Every submit endpoint in Turnkey returns an activity object. This skill teaches how to track and manage those results.

## Prerequisites

Requires API keys configured (see managing-users-api skill).

## Key Concept: Activities Are Universal

Every action submitted to Turnkey (creating a wallet, signing a transaction, updating a policy) returns an **activity**. An activity tracks the lifecycle of that request from submission to completion. This skill covers how to monitor, approve, and audit activities regardless of which skill created them.

## Activity Lifecycle

| Status | Meaning |
|--------|---------|
| `ACTIVITY_STATUS_CREATED` | Activity has been received |
| `ACTIVITY_STATUS_PENDING` | Activity is being processed |
| `ACTIVITY_STATUS_COMPLETED` | Activity finished successfully |
| `ACTIVITY_STATUS_FAILED` | Activity encountered an error |
| `ACTIVITY_STATUS_CONSENSUS_NEEDED` | A policy requires multi-party approval before this activity can proceed |
| `ACTIVITY_STATUS_REJECTED` | Activity was rejected by an authorized user |

## Consensus Workflow

When a policy requires multi-party approval, the original activity enters `ACTIVITY_STATUS_CONSENSUS_NEEDED`. The activity cannot proceed until enough authorized users approve it (as defined by the policy's consensus expression). Any authorized user can also reject the activity outright.

The workflow:
1. A user submits an action (e.g., sign a transaction). The policy engine determines consensus is required.
2. The activity status becomes `CONSENSUS_NEEDED`. The activity's `fingerprint` is used to reference it.
3. Other authorized users call `approve_activity` with that fingerprint.
4. Once the consensus threshold is met, the original activity proceeds and its status moves to `COMPLETED`.
5. Alternatively, any authorized user can call `reject_activity` to block it permanently.

## Idempotency

If you retry a request with identical parameters, Turnkey returns the existing activity (same fingerprint) instead of creating a duplicate. This is critical for error recovery: if a network error occurs after submission, you can safely re-submit without risk of duplicate execution.

## Instructions

### Step 1: Get activity details

```
POST https://api.turnkey.com/public/v1/query/get_activity
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "activityId": "<ACTIVITY_ID>"
}
```

Returns the full activity object including status, type, intent, result, votes, and timestamps.

### Step 2: List activities

```
POST https://api.turnkey.com/public/v1/query/list_activities
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "filterByStatus": ["ACTIVITY_STATUS_CONSENSUS_NEEDED"],
  "filterByType": ["ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2"],
  "paginationOptions": {
    "limit": "10",
    "before": "<CURSOR>",
    "after": "<CURSOR>"
  }
}
```

All filter fields are optional. `filterByStatus` and `filterByType` accept arrays.

### Step 3: Approve a pending activity

```
POST https://api.turnkey.com/public/v1/submit/approve_activity
```

```json
{
  "type": "ACTIVITY_TYPE_APPROVE_ACTIVITY",
  "timestampMs": "<CURRENT_TIMESTAMP_MS>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "fingerprint": "<ACTIVITY_FINGERPRINT>"
  }
}
```

The `fingerprint` is the fingerprint of the original activity that needs approval, not a new fingerprint. You can find it in the activity object returned by `get_activity` or `list_activities`.

### Step 4: Reject a pending activity

```
POST https://api.turnkey.com/public/v1/submit/reject_activity
```

```json
{
  "type": "ACTIVITY_TYPE_REJECT_ACTIVITY",
  "timestampMs": "<CURRENT_TIMESTAMP_MS>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "fingerprint": "<ACTIVITY_FINGERPRINT>"
  }
}
```

Rejection is permanent. Once rejected, the activity cannot be approved.

### Step 5: List app proofs for audit

```
POST https://api.turnkey.com/public/v1/query/list_app_proofs
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "activityId": "<ACTIVITY_ID>"
}
```

Returns cryptographic proofs that the operation was executed within Turnkey's secure enclave. Used for audit and compliance verification. Activities must have been created with `generateAppProofs: true` to have proofs available.

For detailed examples of each workflow, see [references/activity-examples.md](references/activity-examples.md).

## Rules

- Always use the activity's `fingerprint` (not `activityId`) when approving or rejecting
- Check activity status before attempting approval. Only activities in `CONSENSUS_NEEDED` can be approved or rejected.
- Rejection is permanent. There is no way to undo a rejection.
- For polling, re-submit the original request (idempotent) or call `get_activity` with the activity ID
- App proofs are only available if `generateAppProofs` was set to `true` when the activity was created
- The `timestampMs` field must be a recent timestamp. Turnkey uses it to verify request liveness.

## Related Skills

- `managing-wallets-api` for wallet creation and management (returns activities)
- `signing-transactions-api` for signing transactions (returns activities)
- `managing-policies-api` for creating consensus policies that trigger approval workflows
- `managing-users-api` for user management and authentication setup
- `managing-organizations-api` for organization management
