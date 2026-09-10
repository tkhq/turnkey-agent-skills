---
name: monitoring-activities
description: "Monitors, approves, and rejects Turnkey activities (the result type for every submit endpoint): check status, list and filter activities, approve/reject for consensus workflows, and verify app proofs for audit. Includes patterns for root, admin, and automated agent approvers."
license: Apache-2.0
compatibility: "Requires the unreleased unified tk CLI with shared auth/resource commands; verify local capabilities before use."
metadata:
  author: turnkey
  tags: "activity monitoring consensus approval audit app-proofs multi-sig"
---

# Monitoring Activities

## Rules

Read the root [result contract](../../SKILL.md#machine-results-and-pending-work). Activity completion differs from transaction inclusion; this skill monitors Turnkey operations.

## Activity lifecycle

Created/pending means processing; consensus-needed/authenticators-needed requires additional authorization. Completed exposes operation result IDs. Failed/rejected must be inspected before recovery. Inspection can exit successfully while reporting a failed activity, so check the resource status too.

## Instructions

```sh
tk --profile admin --message-format json activity list --limit 50
tk --profile admin --message-format json activity get "$ACTIVITY_ID"
tk --profile admin --message-format json activity wait "$ACTIVITY_ID" --timeout 60
tk --profile approver --message-format json activity approve "$ACTIVITY_ID"
tk --profile approver --message-format json activity reject "$ACTIVITY_ID"
```

The CLI accepts the **activity ID** for approve/reject and resolves the fingerprint itself. Raw API references use fingerprints; do not pass those in place of the CLI ID. Review the original intent and parameters under the already-authorized workflow before approving/rejecting. Rejection is permanent; unclear targets require clarification, while an explicit existing authorization need not be repeated.

List accepts `--limit` and `--cursor` (the API after cursor), not `--all`, status filters, or type filters. Filter returned records locally or use a complete supported query body with `tk request` when necessary. Continue pages explicitly. Wait is bounded and resumes an existing activity; timeout returns a nonzero exit with `code: "wait_timeout"` and the last observed identity at `.details.activity`. Save the error record and resume by that ID; timeout is not permission to repeat the original mutation.

Keep automated approver permissions narrow and separate from worker signing authority where the workflow requires independent review. Consensus must include the submitter and required reviewers; see [policy consensus guidance](../managing-policies/SKILL.md#the-submitter-in-consensus-rule).

## App proofs

`list_app_proofs` is a `tk request` query bridge; pass a complete query body with `organizationId` and the supported activity filter. Retrieval does not establish cryptographic verification. Proofs depend on the original operation requesting their generation; current dedicated mutation commands do not expose a generate-proofs flag. See [activity API reference](references/activity-examples.md) for the query fields.

## Troubleshooting

- Unknown submission outcome: preserve the response/error and inspect activity history; never force a new timestamp blindly.
- Consensus remains pending: inspect votes and policy evaluations under the appropriate identity.
- Approve/reject changes a decision activity: inspect the original target again to establish its resulting state.

## Related Skills

- [Managing policies](../managing-policies/SKILL.md): evaluation and consensus.
- [Approver patterns](references/approver-patterns.md): retained role/policy patterns; CLI execution uses this entrypoint.
- [Managing agent](../managing-agent/SKILL.md): operational recovery.
