# TVC deploy lifecycle (command-by-command)

The full path from an empty directory to a live deployment, using only commands that exist today. Every command below is real; flags marked required are required.

Set auth once (all three, or use a `tvc login` profile):

```bash
export TVC_ORG_ID=<org-uuid>
export TVC_API_KEY_PUBLIC=<hex>
export TVC_API_KEY_PRIVATE=<hex>
# export TVC_API_BASE_URL=https://api.turnkey.com   # optional; this is the default
```

Add `--message-format json` to every command (also forces non-interactive). Parse stdout as NDJSON.

## 1. Create an operator

An operator is an approver identity with a quorum key. You need at least one to approve deployments.

```bash
tvc operator create --message-format json
```

Outcome `reason: operator_created`. Save the `operatorId`, there is no `operator list` to recover it later.

Useful flags (all optional, with env fallbacks): `--name` (`TVC_OPERATOR_NAME`), `--wallet-name` (`TVC_OPERATOR_WALLET_NAME`), `--wallet-id` (`TVC_OPERATOR_WALLET_ID`), `--account-path` (`TVC_OPERATOR_ACCOUNT_PATH`).

## 2. Create the app

Scaffold a config, fill the sentinels, then create.

```bash
tvc app init --output app.json            # reason: app_config_created
# edit app.json — replace <FILL_IN_*> sentinels (operator set / quorum params)
tvc app create --config-file app.json --message-format json   # reason: app_created
```

`app create` output carries `appId`, `manifestSetId`, and `manifestSetOperatorIds`. Save the `appId`.

- `--config-file` / `-c` is **required** for `app create` (env `TVC_APP_CONFIG`).
- `--no-operator-reuse` forces a fresh operator set instead of reusing an existing one.

## 3. Create a deployment

```bash
tvc deploy init --output deploy.json      # reason: deployment_config_created
# edit deploy.json — pivot image URL, expected pivot digest, ports, args
tvc deploy create --config-file deploy.json --app-id <APP_ID> --message-format json   # reason: deployment_created
```

`deploy create` output carries `deploymentId`, `appId`, and `pinnedImageUrl`. Save the `deploymentId`.

- Everything in the config file can also be passed as a flag / env var: `--qos-version`, `--pivot-image-url`, `--expected-pivot-digest`, `--pivot-path`, `--pivot-args`, `--health-check-port`, `--public-ingress-port`, `--app-id`. Flags override the file.
- `tvc deploy init --from-deployment <OLD_DEPLOY_ID>` seeds `deploy.json` from an existing deployment (use when shipping a new version).
- `--dangerous-deploy-debug-mode` produces a debug-mode deployment whose logs you can tail with `deploy debug-logs`. Never use debug mode for production.

## 4. Approve the manifest

In JSON/non-interactive mode this **requires** `--dangerous-skip-interactive` (there is no machine-readable manifest review yet, so the approval is blind, only approve deployments whose inputs you control).

```bash
tvc deploy approve \
  --deploy-id <DEPLOY_ID> \
  --operator-id <OPERATOR_ID> \
  --dangerous-skip-interactive \
  --message-format json
```

- Success: `reason: manifest_approval_posted`.
- If quorum is now met, you may also see `manifest_approval_quorum_reached`.
- If more approvals are still needed, a follow-up call classifies as `code: approval_required`, collect the remaining operator approvals.
- You can approve by manifest file instead of deploy id: `--manifest <PATH>` (mutually exclusive with `--deploy-id`).
- `--dry-run` validates without posting; `--approval-out <PATH>` / `-o` writes the approval artifact.

## 5. Set the deployment live

```bash
tvc app set-live-deploy --deploy-id <DEPLOY_ID> --message-format json
```

Outcome `reason: live_deployment_set`, with `activityId` and `activityStatus` (e.g. `ACTIVITY_STATUS_COMPLETED`). This targets traffic at the deployment.

## 6. Confirm it is live (manual poll)

There is no `--wait`. Poll:

```bash
tvc deploy get-status --deploy-id <DEPLOY_ID> --message-format json   # reason: deployment_runtime_status
```

Liveness criteria:
- `isTargeted == true` (this is the live/targeted deployment), and
- `replicas.ready == replicas.desired`.

`replicas` is `null` when the deployment is not yet present in app status, treat that as "not ready yet," keep polling. A reasonable loop: poll every 5s, give up after a timeout (e.g. 5 min), and report the last status.

For the app-wide view use `tvc app status --app-id <APP_ID> --message-format json` (`reason: app_status`). Note `tvc deploy status --deploy-id <ID>` (`reason: deployment_status`) returns config-level info (manifest id, QOS version, debug-mode, marked-for-deletion) but **not** replica readiness, use `get-status` for liveness.

## Provisioning variant (local/self-hosted operator key)

The hosted path above lets Turnkey hold the operator quorum key. For the self-provisioned variant, these commands are the building blocks (not needed for the minimal hosted happy path):

- `tvc keys init-local-quorum-key -o quorum_key.json` → edit → `tvc keys generate-local-quorum-key -c quorum_key.json --quorum-key-metadata-out meta.json`
- `tvc deploy provisioning-details --deploy-id <ID> --provision-bundle-out bundle.json`
- `tvc keys re-encrypt-local-share --quorum-key-metadata meta.json --provision-bundle bundle.json --re-encrypted-out share.json`
- `tvc deploy post-share --re-encrypted-share share.json --share-operator-id <OPERATOR_ID>`
- `tvc deploy provision --deploy-id <ID> --operator-id <OPERATOR_ID>`

`quorum_key_metadata` and share files contain sensitive material, keep them out of source control.

## Quick reference: outcome reasons you will see

`operator_created`, `app_config_created`, `app_created`, `deployment_config_created`, `deployment_created`, `manifest_approval_posted` / `manifest_approval_generated` / `manifest_approval_dry_run` / `manifest_approval_quorum_reached`, `live_deployment_set`, `deployment_runtime_status`, `deployment_status`, `app_status`, `apps_listed`, `debug_logs_fetched` (+ streamed `debug_log_line`), `deployment_deleted`, `deployment_restored`, `app_deleted`, `version`.
