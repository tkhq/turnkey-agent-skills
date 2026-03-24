# Activity API Examples

All examples show HTTP requests to the Turnkey API. Replace placeholder values (e.g., `<ORGANIZATION_ID>`, `<ACTIVITY_ID>`) with your actual identifiers.

---

## List Activities with Status Filter

### List all activities needing consensus approval

```
POST https://api.turnkey.com/public/v1/query/list_activities
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "filterByStatus": ["ACTIVITY_STATUS_CONSENSUS_NEEDED"]
}
```

### List completed and failed activities

```
POST https://api.turnkey.com/public/v1/query/list_activities
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "filterByStatus": ["ACTIVITY_STATUS_COMPLETED", "ACTIVITY_STATUS_FAILED"]
}
```

### List activities by type with pagination

```
POST https://api.turnkey.com/public/v1/query/list_activities
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "filterByType": ["ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2"],
  "paginationOptions": {
    "limit": "20"
  }
}
```

---

## Get Activity Details and Extract Result

### Get a specific activity by ID

```
POST https://api.turnkey.com/public/v1/query/get_activity
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "activityId": "<ACTIVITY_ID>"
}
```

The response includes the full activity object. Key fields to inspect:

- `activity.status` - Current lifecycle status
- `activity.type` - What kind of action was submitted
- `activity.intent` - The original parameters of the request
- `activity.result` - The output (e.g., signed payload, wallet address), available when status is `COMPLETED`
- `activity.fingerprint` - Unique identifier used for consensus approval/rejection
- `activity.votes` - List of approval/rejection votes from authorized users
- `activity.canApprove` - Whether the current user can approve this activity
- `activity.canReject` - Whether the current user can reject this activity

---

## Consensus Approval Workflow

When a policy requires multi-party approval, follow this sequence:

### 1. List pending activities that need approval

```
POST https://api.turnkey.com/public/v1/query/list_activities
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "filterByStatus": ["ACTIVITY_STATUS_CONSENSUS_NEEDED"]
}
```

### 2. Inspect the activity to understand what is being approved

```
POST https://api.turnkey.com/public/v1/query/get_activity
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "activityId": "<ACTIVITY_ID>"
}
```

Review the `activity.type` and `activity.intent` fields to understand the action. Check `activity.canApprove` to confirm the current user is authorized to approve.

### 3. Approve the activity using its fingerprint

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

### 4. Verify the activity completed after approval

```
POST https://api.turnkey.com/public/v1/query/get_activity
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "activityId": "<ACTIVITY_ID>"
}
```

If the consensus threshold has been met, `activity.status` will be `ACTIVITY_STATUS_COMPLETED`. If more approvals are still needed, it remains `ACTIVITY_STATUS_CONSENSUS_NEEDED`.

---

## Rejection Workflow

### Reject an activity that should not proceed

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

The activity status changes to `ACTIVITY_STATUS_REJECTED`. This is permanent and cannot be undone.

---

## Polling Pattern for Async Activities

When an activity is processing asynchronously, poll for completion:

### Option A: Re-submit the original request (idempotent)

If you still have the original request parameters, simply re-submit them. Turnkey recognizes the identical fingerprint and returns the existing activity with its current status, without creating a duplicate.

### Option B: Poll with get_activity

```
POST https://api.turnkey.com/public/v1/query/get_activity
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "activityId": "<ACTIVITY_ID>"
}
```

Check the `activity.status` field:
- `ACTIVITY_STATUS_PENDING` or `ACTIVITY_STATUS_CREATED` - Still processing. Wait and retry.
- `ACTIVITY_STATUS_COMPLETED` - Done. Extract the result from `activity.result`.
- `ACTIVITY_STATUS_FAILED` - Error occurred. Inspect the activity for details.
- `ACTIVITY_STATUS_CONSENSUS_NEEDED` - Waiting for approvals. Use the consensus workflow above.

Recommended polling interval: start at 1 second, increase with exponential backoff up to 10 seconds.

---

## App Proofs Retrieval for Audit

### List app proofs for a specific activity

```
POST https://api.turnkey.com/public/v1/query/list_app_proofs
```

```json
{
  "organizationId": "<ORGANIZATION_ID>",
  "activityId": "<ACTIVITY_ID>"
}
```

App proofs provide cryptographic evidence that an operation was executed within Turnkey's secure enclave (Borg). Each proof can be verified against a corresponding boot proof to confirm the enclave's integrity at the time of execution.

Requirements:
- The activity must have been created with `generateAppProofs: true` in the original request
- Without this flag, no proofs will be available

Use cases:
- Compliance reporting: prove that key operations happened inside a verified enclave
- Audit trails: cryptographic evidence of who did what and when
- Dispute resolution: verifiable proof of execution
