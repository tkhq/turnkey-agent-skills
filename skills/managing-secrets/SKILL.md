---
name: managing-secrets
description: "Manage Turnkey Secrets through the tk CLI: list metadata, encrypt file or stdin imports, export to protected files, and recover pending approvals without exposing plaintext to the agent."
license: Apache-2.0
metadata:
  author: turnkey
  tags: "turnkey secrets encrypted-import export consensus"
---

# Managing Secrets

## Rules

Use the root [CLI convention](../../SKILL.md) and verify `tk secret --help` before starting. Secrets require the newer CLI Secrets surface; a build supporting wallets alone is insufficient. Import endpoint availability depends on the deployed API and organization. Report an unavailable endpoint as a capability gap; do not bypass it with a raw plaintext request.

Keep secret contents outside the agent transcript. Accept an existing file path or a producer that pipes directly into the CLI. Do not read the source with a file tool, paste it into chat, interpolate it into command arguments, enable shell tracing, or print decrypted output to verify success. The CLI owns encryption and decryption. Generic `tk request` and `--input-json` are not substitutes for this workflow.

Use an explicit profile for every remote command. Before export, establish the intended secret ID, recipient destination, and existing user authorization. Authorization to list metadata is not authorization to export plaintext. Preserve authorization already given for that exact operation; do not ask again solely because this skill was loaded.

## Instructions

### List and identify

```sh
tk --profile admin --message-format json whoami
tk --profile admin --message-format json secret list --limit 50
```

Listing returns metadata at `.data.items` and pagination at `.data.nextCursor`, not secret values. Follow supported pagination with `--cursor`; do not assume the first page is complete. Names are unique within an organization, so retain the organization context when identifying a secret. Use the returned secret UUID for export and verify the selected organization.

### Import from a protected source

Choose an existing file outside the repository whose contents the agent must not inspect:

```sh
tk --profile admin --message-format json secret import --name service-token --input-file "$SECRET_INPUT_FILE"
```

Optional `--static-properties-file PATH` accepts a JSON object with string keys and string values. These properties are policy-visible metadata, not encrypted secret contents; never put tokens, passwords, or other secret values in them.

To receive bytes from an already authorized producer, pass `--input-file -` and connect the producer's stdout directly to the CLI's stdin. Do not construct an `echo` command containing the secret. Import preserves file bytes; avoid introducing a newline or text encoding conversion. The CLI encrypts the content for the enclave before submitting it.

If initialization requires approval, retain its activity ID and the input file. After the initializer completes, reuse it without submitting another initializer:

```sh
tk --profile admin --message-format json secret import --name service-token --input-file "$SECRET_INPUT_FILE" --init-activity-id "$INIT_ACTIVITY_ID"
```

Use the same identity and organization. This recovery flag is for the initialization activity, not a final import activity. For a pending final import, use `activity get` or `activity wait` instead of repeating the command.

Record activity IDs and inspect status before claiming completion. A completed import returns `.data.secretIds`; an initialization receipt is not the imported secret. If a submission is uncertain, reconcile activity history before any retry; repeating import can create another secret. Retain the input securely until completion is established, then follow the user's source-retention preference.

### Export and resume

Choose new output and state-file paths in a private directory outside the repository. The state file contains the recipient decryption material while pending; treat it as a credential, not a review artifact or log attachment.

```sh
tk --profile agent --message-format json secret export "$SECRET_ID" --output "$SECRET_OUTPUT_FILE" --state-file "$SECRET_STATE_FILE" --timeout 60
```

The output is written to an explicit protected file, never stdout. Existing output files are not overwritten. Keep the state file through pending approval, timeout, or an uncertain response. An exit status or activity receipt alone does not prove plaintext was recovered.

Inspect the activity and, when authorized, approve with the intended approver profile using the [activity workflow](../monitoring-activities/SKILL.md). Resume using the same identity, organization, and API endpoint as the original export:

```sh
tk --profile agent --message-format json secret resume --state-file "$SECRET_STATE_FILE" --timeout 60
```

Resume uses the saved operation and decryption material; it does not submit a replacement export. `activity wait` can inspect status but cannot decrypt the result by itself. If the state file is lost, do not claim that the old export can be decrypted from the activity ID alone. Never upload the state file to diagnose a failure.

After successful recovery, report the destination and completion metadata. Do not read or print the recovered secret. Pass the file directly to the user's authorized consumer. Plaintext output retention belongs to that task; do not silently delete it or copy it elsewhere.

### Scope access

Use a non-root identity for autonomous secret access; root quorum members bypass policy restrictions. Keep export access scoped to the requested secret and approved principals. Consult [managing policies](../managing-policies/SKILL.md) for policy submission, but verify Secrets-specific expression fields against supported API semantics before writing a condition. Wallet conditions do not scope secrets. Never compensate for an unverified expression with a blanket export ALLOW.

Validate allowed and denied access with synthetic values in an authorized test organization before relying on a new policy. Local command tests do not establish live policy behavior. Approval of an activity does not authorize unrelated exports or provider-token rotation.

## Troubleshooting

- Pending or timed out export: retain state, inspect the activity, and resume the original export after required approval.
- Unknown submission: use saved state to reconcile; do not change timestamps or start a new export to force a result.
- Profile mismatch: restore the original identity and endpoint, rather than editing the state file.
- Existing output or unsafe destination: preserve both files; choose a supported recovery path without overwriting user data.
- Denied operation: inspect activity/policy evaluations with the appropriate identity; do not switch to root to bypass the requested scope.

This skill covers list/import/export and export recovery. Secret update/delete, automatic provider-token rotation, environment injection, and wallet/private-key import/export are separate capabilities; do not invent corresponding commands.

## Related Skills

- [Managing policies](../managing-policies/SKILL.md): scoped access and consensus.
- [Managing users](../managing-users/SKILL.md): non-root identities and credentials.
- [Monitoring activities](../monitoring-activities/SKILL.md): inspect and approve the existing activity.
