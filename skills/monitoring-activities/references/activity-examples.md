# Activity Examples

> **CLI migration:** This is retained API parameter/semantic reference material. Execute supported core operations through the commands in the parent SKILL.md and root CLI convention. SDK authentication, stamping, inline key-generation scripts, and old envelope/retry instructions below are superseded. Import/export crypto and unvalidated request bridges remain explicit gaps; this reference alone does not establish CLI completion. Existing user authorization takes precedence over blanket per-call confirmation wording in legacy examples.


Complete request/response examples for activity monitoring and consensus operations.

**Base URL:** `https://api.turnkey.com`

## Get activity details

```
POST /public/v1/query/get_activity
```

```json
{
  "organizationId": "<ORG_ID>",
  "activityId": "act-12345"
}
```

**Response:**

```json
{
  "activity": {
    "id": "act-12345",
    "organizationId": "<ORG_ID>",
    "status": "ACTIVITY_STATUS_CONSENSUS_NEEDED",
    "type": "ACTIVITY_TYPE_SIGN_TRANSACTION_V2",
    "fingerprint": "fp-abcdef123456",
    "intent": {
      "signTransactionIntentV2": {
        "signWith": "0x1234...abcd",
        "unsignedTransaction": "0x02f870...",
        "type": "TRANSACTION_TYPE_ETHEREUM"
      }
    },
    "votes": [
      {
        "userId": "usr-agent-001",
        "selection": "VOTE_SELECTION_APPROVED",
        "createdAt": { "seconds": "1700000000", "nanos": "0" }
      }
    ],
    "canApprove": true,
    "canReject": true,
    "createdAt": { "seconds": "1700000000", "nanos": "0" },
    "updatedAt": { "seconds": "1700000000", "nanos": "0" }
  }
}
```

Key fields:
- `fingerprint` — use this for approve/reject (not `id`)
- `intent` — the original action details
- `votes` — who has already voted and how
- `canApprove` / `canReject` — whether further voting is possible

## List all pending approvals

```
POST /public/v1/query/list_activities
```

```json
{
  "organizationId": "<ORG_ID>",
  "filterByStatus": ["ACTIVITY_STATUS_CONSENSUS_NEEDED"]
}
```

**Response:**

```json
{
  "activities": [
    {
      "id": "act-12345",
      "organizationId": "<ORG_ID>",
      "status": "ACTIVITY_STATUS_CONSENSUS_NEEDED",
      "type": "ACTIVITY_TYPE_SIGN_TRANSACTION_V2",
      "fingerprint": "fp-abcdef123456",
      "createdAt": { "seconds": "1700000000", "nanos": "0" }
    }
  ]
}
```

## List recent failed activities

```json
{
  "organizationId": "<ORG_ID>",
  "filterByStatus": ["ACTIVITY_STATUS_FAILED"],
  "paginationOptions": {
    "limit": "20"
  }
}
```

## List signing activities only

```json
{
  "organizationId": "<ORG_ID>",
  "filterByType": [
    "ACTIVITY_TYPE_SIGN_TRANSACTION_V2",
    "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2",
    "ACTIVITY_TYPE_ETH_SEND_TRANSACTION",
    "ACTIVITY_TYPE_SOL_SEND_TRANSACTION"
  ]
}
```

## Approve a pending activity

Use the `fingerprint` from the activity, not the `activityId`.

```
POST /public/v1/submit/approve_activity
```

```json
{
  "fingerprint": "fp-abcdef123456"
}
```

**Response:**

```json
{
  "activity": {
    "id": "act-approve-001",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_APPROVE_ACTIVITY",
    "result": {
      "approveActivityResult": {}
    }
  }
}
```

After enough approvals meet the consensus threshold, the original activity proceeds to `COMPLETED`.

## Reject a pending activity

Rejection is permanent. The activity can never be approved after rejection.

```
POST /public/v1/submit/reject_activity
```

```json
{
  "fingerprint": "fp-abcdef123456"
}
```

**Response:**

```json
{
  "activity": {
    "id": "act-reject-001",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_REJECT_ACTIVITY",
    "result": {
      "rejectActivityResult": {}
    }
  }
}
```

The original activity's status changes to `ACTIVITY_STATUS_REJECTED`.

## List app proofs (audit)

```
POST /public/v1/query/list_app_proofs
```

```json
{
  "organizationId": "<ORG_ID>",
  "activityId": "act-12345"
}
```

**Response:**

```json
{
  "appProofs": [
    {
      "proof": "eyJ0eXAi...",
      "createdAt": { "seconds": "1700000000", "nanos": "0" }
    }
  ]
}
```

App proofs are cryptographic evidence that the operation executed within Turnkey's secure enclave. Only available if the activity was created with `generateAppProofs: true`.

## Pagination

For large result sets, use cursor-based pagination:

```json
{
  "organizationId": "<ORG_ID>",
  "filterByStatus": ["ACTIVITY_STATUS_COMPLETED"],
  "paginationOptions": {
    "limit": "50",
    "after": "<LAST_ACTIVITY_ID>"
  }
}
```

Use `after` to get the next page, `before` to get the previous page. Limit range: 1-100, default 10.
