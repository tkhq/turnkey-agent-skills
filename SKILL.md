---
name: turnkey-agent-skills
description: "Use when working with Turnkey wallet infrastructure — creating wallets, signing blockchain transactions, managing users and policies, provisioning agents, or monitoring activities. Supports Ethereum/EVM, Solana, Bitcoin, and 10+ other chains. Keys stay in hardware-backed secure enclaves."
license: Apache-2.0
compatibility: "Requires the unreleased unified tk CLI with shared auth/resource commands; verify local capabilities before use."
metadata:
  author: turnkey
  tags: "turnkey wallet signing blockchain ethereum solana bitcoin crypto policy agent"
---

# Turnkey Skills

Use `tk` for credentials, signed requests, and the core agent lifecycle. Skills own workflow decisions, resource scope, and existing user authorization; the CLI owns key handling, request stamping, and submission.

## CLI readiness

This conversion targets the **local, unreleased unified CLI** built from the Rust SDK repository. No published minimum version is claimed. The older experimental `tk` binary and released `tvc`/`turnkey` binaries do not provide this surface. Before executing a workflow, check `tk --help` plus its required subcommand help. A matching version string alone is insufficient during development.

Build the integrated rust-sdk checkout with `cargo build -p tvc --bin tk`; use its `target/debug/tk` directly or place that binary on PATH. Do not replace the user's installed binary implicitly. The local verification script is `scripts/check-cli.sh /absolute/path/to/tk`; it checks capabilities without making API requests.

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
tk profile list
```

For an existing credential file in StoredApiKey JSON format (`public_key`, `private_key`, `curve: "p256"`), login verifies identity before saving/selecting a new named profile:

```sh
tk --profile admin --organization-id "$ORG_ID" login --api-key-file "$ADMIN_KEY_FILE"
```

Generate replacement/agent credentials locally into an explicit, private destination outside the repository:

```sh
tk --message-format json api-key generate --output "$AGENT_KEY_FILE" > generated-key.json
```

The generation result contains public information and the output path; the secret lives only in the key file. Register only the public key with `tk user create` or `tk api-key register`. Do not recreate SDK stamping or inline cryptographic key-generation scripts. If a secrets manager is the requested destination, arrange a supported secure handoff explicitly; the current generate command writes a local file.

For unattended use, the full `TURNKEY_ORGANIZATION_ID`, `TURNKEY_API_PUBLIC_KEY`, and `TURNKEY_API_PRIVATE_KEY` bundle is supported; `TURNKEY_API_BASE_URL` is optional. Explicit `--profile NAME` selects that saved identity instead of an environment bundle. Partial/conflicting bundles must be corrected rather than mixing credential halves. `auth logout` clears selection without revoking remote credentials; `profile delete` removes the local profile entry, not the API key.

## Calling the API

Use dedicated commands with exactly one of `--input-json JSON` or `--input-file PATH`; `--input-file -` reads stdin. Inputs are the generated operation's **parameters object**, not an activity envelope. Use files for policy expressions and structured batches. UUIDs and unsupported fields are checked locally; policy authorization remains server-evaluated.

```sh
tk --profile admin --message-format json policy create --input-file policy.json
tk --profile admin --message-format json user create --input-file users.json
tk --profile agent --message-format json sign payload --input-file payload.json
```

`tk request --path /public/v1/... --body-file request.json` is the escape hatch. Unlike dedicated commands, its body is the **complete request**: query organization ID or versioned submit envelope. `--body` accepts literal bytes and `--stamp-only` signs without submission. Copy neither stale activity versions nor SDK setup from reference documents. There is no automatic envelope generation for arbitrary requests.

## Machine results and pending work

Use `--message-format json`; consume complete JSON records and check `schemaVersion: 1`. Successful records use `reason: "command_result"`; failures use `reason: "command_error"` and a nonzero exit. `data` preserves the API response shape. A mutation includes activity metadata at `.activity` and the complete activity at `.data.activity`. Created resource IDs live under `.data.activity.result`, for example `.createWalletResult.walletId` or `.createUsersResult.userIds`.

**Exit zero does not mean a mutation completed.** Inspect `.status` and the actual `.activity.status` before using result IDs. Pending/consensus/authenticator requirements need follow-up; inspection commands can successfully return a failed/rejected activity. Record each activity ID immediately and keep the original result file.

```sh
tk --profile admin --message-format json activity get "$ACTIVITY_ID"
tk --profile admin --message-format json activity wait "$ACTIVITY_ID" --timeout 60
```

No submit command has an automatic `--wait` flag. Waiting resumes by activity ID; it never repeats resource creation. After an uncertain submission/transport failure, inspect activity history and reconcile the intended operation before retrying. Do not change timestamps to force a duplicate as a recovery strategy.

## Reference boundaries

Retained API reference JSON is useful for fields and policy semantics, but is not a second execution path for the converted core skills. Use the CLI mappings; SDK setup, key-generation helpers, and old envelope instructions are superseded here. Import/export bundle cryptography and general chain construction/broadcast examples remain future work. Existing user authorization persists; do not re-ask solely because an old reference says to confirm every call.
