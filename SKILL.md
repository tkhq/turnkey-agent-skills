---
name: turnkey-agent-skills
description: "Use when working with Turnkey wallet infrastructure — creating wallets, signing blockchain transactions, managing users and policies, provisioning agents, or monitoring activities. Supports Ethereum/EVM, Solana, Bitcoin, and 10+ other chains. Keys stay in hardware-backed secure enclaves."
license: Apache-2.0
compatibility: "Requires tk 0.8.0 or later with shared auth/resource commands; verify local capabilities before use."
metadata:
  author: turnkey
  tags: "turnkey wallet signing blockchain ethereum solana bitcoin crypto policy agent"
---

# Turnkey Skills

Use `tk` for credentials, signed requests, and the core agent lifecycle. Skills own workflow decisions, resource scope, and existing user authorization; the CLI owns key handling, request stamping, and submission.

## CLI readiness

Requires **tk 0.8.0 or later**. Validated against `tkhq/tk@861a6f6f61c99cc98e5009d0fa576cff147dd8bb` (0.8.0). CLI foundations tkhq/tk#24/#25 and Secrets tkhq/tk#26 are merged. Run the capability check before use.

Build the matching `tk` checkout with `cargo build -p turnkey_tk --bin tk`; use its `target/debug/tk` directly or place that binary on PATH. Do not replace the user's installed binary implicitly. For a full repository checkout (not the installed plugin), the local verification script is `scripts/check-cli.sh /absolute/path/to/tk`; it checks capabilities without making API requests.

Seven core entrypoints are CLI-backed: getting-started, managing-users, managing-policies, managing-wallets (excluding import/export), monitoring-activities, provisioning-agent, and managing-agent. The signing skill's broader chain construction and broadcast library is not yet fully converted. See [conversion coverage](references/cli-coverage.md).

## Skills

| Skill | Use |
|---|---|
| [Getting started](skills/getting-started/SKILL.md) | Verify identity and create a first wallet |
| [Provisioning agent](skills/provisioning-agent/SKILL.md) | Create a non-root agent with scoped access |
| [Managing agent](skills/managing-agent/SKILL.md) | Diagnose denial, update access, rotate/revoke credentials |
| [Managing users](skills/managing-users/SKILL.md) | Users, tags, and registered API keys |
| [Managing policies](skills/managing-policies/SKILL.md) | Policy CRUD, consensus, and evaluations |
| [Managing wallets](skills/managing-wallets/SKILL.md) | Wallets and derived accounts |
| [Monitoring activities](skills/monitoring-activities/SKILL.md) | Inspect, approve/reject, and resume pending work |
| [Signing transactions](skills/signing-transactions/SKILL.md) | Serialized signing plus explicitly retained chain SDK workflows |

## Authentication and key generation

Use existing saved profiles or complete environment credentials. Never place private keys in command arguments or echo credential files.

```sh
tk --profile admin auth status
tk --profile admin whoami
tk --profile admin profile list
```

For an existing credential file in StoredApiKey JSON format (`public_key`, `private_key`, `curve: "p256"`), create the profile, then verify identity without changing the active default:

```sh
tk --profile admin --message-format json --organization-id "$ORG_ID" profile create --profile-name admin --api-key-file "$ADMIN_KEY_FILE"
```

`profile create` saves a profile and copies its credential into protected local storage without contacting Turnkey. Then verify it with `tk --profile admin --message-format json whoami`; `--profile` selects the identity for API commands. Profiles live in `~/.config/turnkey/tk.config.toml`; isolate tests with HOME, not removed `--config`/`TK_CONFIG` overrides. `profile show|use|delete` take `--profile-name NAME`. Deletion also removes its stored credential unless shared, but does not revoke the remote API key.

Generate agent credentials directly in protected profile storage, without an extra plaintext source file:

```sh
tk --profile admin --message-format json --organization-id "$ORG_ID" profile create --profile-name agent > generated-key.json
```

Register only `.data.publicKey` from the result using an admin profile. Never read the stored private key. For credentials on another machine, use `session request` on that machine, `session provision` under the authorized admin identity, then `session activate` on the agent machine; this flow creates expiring credentials without transferring a private key. Inspect each command's help before use. When importing an existing credential with `--api-key-file`, delete the source securely after profile creation succeeds, unless the user's retention requirements forbid it.

For unattended use, the full `TURNKEY_ORGANIZATION_ID`, `TURNKEY_API_PUBLIC_KEY`, and `TURNKEY_API_PRIVATE_KEY` bundle is supported; `TURNKEY_API_BASE_URL` is optional. Explicit `--profile NAME` selects that saved identity instead of an environment bundle. Partial/conflicting bundles must be corrected rather than mixing credential halves. `auth logout` clears selection without revoking remote credentials; `profile delete` removes the local profile entry, not the API key.

## Calling the API

Use dedicated commands with exactly one of `--input-json JSON` or `--input-file PATH`; `--input-file -` reads stdin. Inputs are the generated operation's **parameters object**, not an activity envelope. Use files for policy expressions and structured batches. UUIDs and unsupported fields are checked locally; policy authorization remains server-evaluated.

```sh
tk --profile admin --message-format json policy create --input-file policy.json
tk --profile admin --message-format json user create --input-file users.json
tk --profile agent --message-format json sign payload --input-file payload.json
```

`tk --profile admin request --path /public/v1/... --body-file request.json` is the escape hatch. Unlike dedicated commands, its body is the **complete request**: query organization ID or versioned submit envelope. `--body` accepts literal bytes and `--stamp-only` signs without submission. Copy neither stale activity versions nor SDK setup from reference documents. There is no automatic envelope generation for arbitrary requests.

## Machine results and pending work

Use `--message-format json`; it disables interactive prompts and emits newline-delimited JSON on stdout. Dispatch on `reason` first. Successful core API records use `reason: "command_result"` and `schemaVersion: 1`. Errors use `reason: "command_error"` or `"missing_required_input"`, a stable `code`, and a nonzero exit (1 for runtime failure, 2 for usage errors); error records have no `schemaVersion`. Preserve stdout even on failure. `data` preserves the API response shape. A mutation includes activity metadata at `.activity` and the complete activity at `.data.activity`. Created resource IDs live under `.data.activity.result`, for example `.createWalletResult.walletId` or `.createUsersResult.userIds`.

Recovery errors can include `.details.activity` with the last observed activity ID/status. `wait_timeout` means the bounded wait expired; `submission_unknown` and `network_uncertain` require reconciliation with `tk --profile admin activity list`; never automatically retry a mutation. Only `network_error` is safe to retry. Do not expect the success record's `.activity` or `.data` fields on errors, and do not parse prose messages for activity IDs.

**Exit zero does not mean a mutation completed.** Inspect `.status` and the actual `.activity.status` before using result IDs. Pending/consensus/authenticator requirements need follow-up; inspection commands can successfully return a failed/rejected activity. Record each activity ID immediately and keep the original result file.

```sh
tk --profile admin --message-format json activity get --id "$ACTIVITY_ID"
tk --profile admin --message-format json activity wait --id "$ACTIVITY_ID" --timeout 60
```

No submit command has an automatic `--wait` flag. Waiting resumes by activity ID; it never repeats resource creation. After an uncertain submission/transport failure, inspect activity history and reconcile the intended operation before retrying. Do not change timestamps to force a duplicate as a recovery strategy.

## Reference boundaries

Retained API reference JSON is useful for fields and policy semantics, but is not a second execution path for the converted core skills. Use the CLI mappings; SDK setup, key-generation helpers, and old envelope instructions are superseded here. Import/export bundle cryptography and general chain construction/broadcast examples remain future work. Existing user authorization persists; do not re-ask solely because an old reference says to confirm every call.
