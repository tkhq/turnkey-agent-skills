---
name: managing-secrets
description: "Manage Turnkey Secrets through the tk CLI: list metadata, encrypt file or stdin imports, export to protected files, and finish approval-gated exports without exposing plaintext to the agent."
license: Apache-2.0
metadata:
  author: turnkey
  tags: "turnkey secrets encrypted-import export consensus"
---

# Managing Secrets

## Rules

Use the root [CLI convention](../../SKILL.md) and verify `tk secret --help` before starting. Secrets require tk 0.2.0 or later; run `scripts/check-cli.sh /absolute/path/to/tk`. Import and export only work against an API endpoint whose enclave quorum key the CLI knows (production, preprod, or dev); any other `--api-base-url` fails locally with `invalid_input` before a request is sent. Endpoint availability also depends on the deployed API and organization. Report an unavailable endpoint as a capability gap; do not bypass it with a raw plaintext request.

Keep secret contents outside the agent transcript. Accept an existing file path or a producer that pipes directly into the CLI. Do not read the source with a file tool, paste it into chat, interpolate it into command arguments, enable shell tracing, or print decrypted output to verify success. The CLI owns encryption and decryption. Generic `tk request` and `--input-json` are not substitutes for this workflow.

Use an explicit profile for every remote command. Before export, establish the intended secret, recipient destination, and existing user authorization. Authorization to list metadata is not authorization to export plaintext. Preserve authorization already given for that exact operation; do not ask again solely because this skill was loaded.

## Instructions

### List and identify

```sh
tk --profile admin --message-format json whoami
tk --profile admin --message-format json secret list --limit 50
```

Listing returns metadata at `.data.secrets` and pagination at `.data.nextCursor`, not secret values. Each entry carries `secretId`, `name`, static properties, and creation time. Follow pagination with `--cursor SECRET_ID`; do not assume the first page is complete. Names are unique within an organization, so retain the organization context when identifying a secret. Export accepts `--name`; use `--id` with the UUID when a name is ambiguous or was renamed.

### Import from a protected source

Values are UTF-8 text of at most 1 MiB; one trailing newline is stripped. Choose an existing file outside the repository whose contents the agent must not inspect:

```sh
tk --profile admin --message-format json secret import service-token --from-file "$SECRET_INPUT_FILE"
```

To receive bytes from an already authorized producer, omit `--from-file` and connect the producer's stdout directly to the CLI's stdin. Do not construct an `echo` command containing the secret. Without `--from-file` or piped stdin, JSON mode fails with `missing_required_input` rather than prompting.

Optional `--property KEY=VALUE` flags, repeatable, bind policy-visible static properties to the secret forever. They appear in `tk secret list`. Never put tokens, passwords, or other secret values in them. Duplicate keys are rejected locally.

The CLI encrypts the content to the enclave, submits the initialization and import activities itself, and returns one record. A completed import returns `.data.secretId`, `.data.name`, and `.data.activity.{id,status}`. If the activity is pending, retain its ID and inspect it with `activity get` or `activity wait`; do not repeat the import, which can create another secret. If a submission is uncertain, reconcile activity history before any retry. Retain the input securely until completion is established, then follow the user's source-retention preference.

### Export to a protected file

Without `--out`, export prints the value to stdout and, in JSON mode, embeds it at `.data.value`. Agents must always pass `--out` with a new path in a private directory outside the repository:

```sh
tk --profile agent --message-format json secret export --name service-token --out "$SECRET_OUTPUT_FILE"
```

The file is created with mode 0600 and never overwrites an existing path; an existing path fails with `invalid_input` before submission. A completed record reports `.data.secretId`, `.data.out`, and the activity identity without ciphertext or plaintext. Optional `--context KEY=VALUE` flags attach policy-visible context to this request only.

An export denied by policy fails with `unauthorized` and HTTP 403 and writes no local state. A missing name or ID fails with `not_found`.

### Finish a pending export

If the export requires approval, the command exits zero with `.status: "pending"`, `.data.activity.id`, and `.data.nextStep`. Nothing is written yet. The value is encrypted to a single-use recipient key held only by the submitting credential; the CLI stores it under `~/.config/turnkey/tk/secrets/pending/` and removes it after delivery or when the activity ends. Treat that directory as credential material: never read, copy, upload, or edit it.

Inspect the activity and, when authorized, approve with the intended approver profile using the [activity workflow](../monitoring-activities/SKILL.md). Then rerun the same export command with the same profile, organization, endpoint, and `--out` path:

```sh
tk --profile agent --message-format json secret export --name service-token --out "$SECRET_OUTPUT_FILE"
```

While approval is outstanding, rerunning returns `pending` again and does not submit a replacement export. There is no `secret resume`, `--state-file`, or `--timeout`. `activity wait` can watch status but cannot decrypt the result. Another profile on the same machine cannot finish this export; it starts its own.

A rejected or failed activity makes the rerun fail with `api_error`, `.details.activity.id`, and cleared local state; a further rerun starts a new export, which needs its own approval. The only stranded case is a crash between the API accepting the activity and the key reaching disk: reject that activity and start a new export. A pending export is abandoned by rejecting its activity or leaving it to expire; the local key is swept after 8 hours.

After successful recovery, verify that the output file still exists using filesystem metadata only, then report the destination and completion metadata. A completed receipt can describe a prior write even if the file was later moved or removed; do not claim a missing file is available. Do not read or print the recovered secret. Pass the file directly to the user's authorized consumer. Plaintext output retention belongs to that task; do not silently delete it or copy it elsewhere.

### Rotate a value

Secrets are immutable and names are unique. Rotate by creating the new credential at its provider, deleting the old secret, and importing the new value under the same name from a protected source:

```sh
tk --profile admin --message-format json secret delete --name service-token
tk --profile admin --message-format json secret import service-token --property consensus=unilateral --from-file "$NEW_SECRET_INPUT_FILE"
```

Wait for a pending deletion to complete before importing; the name is taken until then. Revoke the old credential at the provider only after the consumer reads the new one.

### Scope access

Use a non-root identity for autonomous secret access; root quorum members bypass policy restrictions. For a metadata-scoped export policy, assign a nonsecret scope at import, such as `--property scope=demo-agent`. The following policy permits only the named agent to export secrets carrying that scope:

```json
{
  "policyName": "Agent export for demo scope",
  "effect": "EFFECT_ALLOW",
  "condition": "activity.resource == 'SECRET' && activity.action == 'EXPORT' && secret.static_properties['scope'] == 'demo-agent'",
  "consensus": "approvers.any(user, user.id == 'REPLACE_WITH_AGENT_USER_UUID')",
  "notes": "Export only secrets imported with the approved demo-agent scope."
}
```

Replace the principal and scope with the approved values, save the parameters to a file, and submit through `tk --profile admin --message-format json policy create --input-file policy.json`. This condition grants access to **every secret with that property**, including later imports. For access intended for one secret, use a unique approved scope and ensure it is not reused. Do not describe a shared tag as single-secret access.

For additional human approval, require both the submitting agent and the intended human in consensus; see the submitter-in-consensus rule in [managing policies](../managing-policies/SKILL.md). A missing applicable ALLOW denies a non-root caller; matching DENY overrides ALLOW. Wallet conditions do not scope secrets. Never remove the metadata condition merely to make a denied export succeed.

Validate allowed and denied access with synthetic values in an authorized test organization before relying on a new policy. Local command tests do not establish live policy behavior. Approval of an activity does not authorize unrelated exports or provider-token rotation.

## Troubleshooting

- Pending export: inspect the activity, obtain the required approval, and rerun the identical export command under the original profile.
- Unknown submission or lost response: no local state is written until the API answers, so rerun the command; check `activity list` first if a duplicate approval request would matter.
- Profile mismatch: pending state belongs to the credential that started it; restore the original identity and endpoint rather than exporting from another profile.
- Existing output path: choose a new path; the CLI refuses to overwrite and preserves the existing file.
- `invalid_input` naming the API base URL: the endpoint has no trusted enclave quorum key; do not switch to `tk request` to send plaintext.
- Denied operation: inspect activity/policy evaluations with the appropriate identity; do not switch to root to bypass the requested scope.

This skill covers list/import/export and pending-export completion. Secret update/delete, automatic provider-token rotation, environment injection, and wallet/private-key import/export are separate capabilities; do not invent corresponding commands.

## Related Skills

- [Managing policies](../managing-policies/SKILL.md): scoped access and consensus.
- [Managing users](../managing-users/SKILL.md): non-root identities and credentials.
- [Monitoring activities](../monitoring-activities/SKILL.md): inspect and approve the existing activity.
