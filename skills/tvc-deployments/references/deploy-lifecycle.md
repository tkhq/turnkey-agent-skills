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

## 5. Confirm live (set live only if switching versions)

The **first** deployment of an app auto-targets once approval quorum is reached, there is no separate "go live" step for it. So check status first; only call `set-live-deploy` when you are switching traffic to a new deployment while an older one is already live.

Poll status (there is no `--wait`):

```bash
tvc deploy get-status --deploy-id <DEPLOY_ID> --message-format json   # reason: deployment_runtime_status
```

Right after approval this may return `replicas: null`, or even a 404 `not_found` ("app status not found"), both mean "no state yet, not ready", keep polling. Once it returns state, read `isTargeted`:

- **`isTargeted == true`** → this deployment is receiving traffic. It is live once `replicas.ready == replicas.desired`. First deployments land here with no set-live call.
- **`isTargeted == false`** → it is not receiving traffic (an older deployment is still live). Switch traffic to it:

  ```bash
  tvc app set-live-deploy --deploy-id <DEPLOY_ID> --message-format json   # reason: live_deployment_set
  ```

  then poll `get-status` again until `isTargeted == true` && `replicas.ready == replicas.desired`.

Do **not** call `set-live-deploy` on a deployment that is already targeted, it fails with `api_error` (HTTP 400) "already set as the live deployment". Gating on `isTargeted == false` avoids that.

A reasonable loop: poll every 5s, give up after a timeout (e.g. 5 min), report the last status. For the app-wide view use `tvc app status --app-id <APP_ID> --message-format json` (`reason: app_status`); its `targetedDeploymentId` should equal your deployment id. Note `tvc deploy status --deploy-id <ID>` (`reason: deployment_status`) returns config-level info (manifest id, QOS version, debug-mode, marked-for-deletion) but **not** replica readiness, use `get-status` for liveness.

## 6. Verify the app is serving

Once the deployment is live, ask the CLI for the app's hostname instead of assuming it:

```bash
tvc app list --message-format json
```

`app list` has no `--app-id` filter (its only filter is `-n/--name`, a substring match), and `app status` does **not** return the domain, so select your app out of the list by `id`. Each entry in the `apps_listed` line carries a `publicDomain` field:

```json
{
  "reason": "apps_listed",
  "apps": [
    {
      "id": "<APP_ID>",
      "name": "Little App",
      "quorumPublicKey": "04cdff...",
      "liveDeploymentId": "<DEPLOY_ID>",
      "egressEnabled": false,
      "debugModeDeploymentsEnabled": false,
      "publicDomain": "app-<APP_ID>.turnkey.cloud"
    }
  ]
}
```

**Read `publicDomain`; do not construct it.** The key is omitted from the JSON whenever its value is the empty string, and empty is the only "absent" signal the API has (the wire type is a non-optional string, so there is no null and no way to tell unset from empty). Treat a missing key as "no domain available right now" rather than an error.

What empty *means* is not firmly established: the CLI documents it as "the app has no public domain configured," but it has not been confirmed whether it can also be empty transiently while a new app's domain is still being provisioned. If you get an empty value on an app you expect to have a domain, poll `app list` again before concluding it has none. As a last resort the hosted domain currently follows an `app-<APP_ID>.turnkey.cloud` convention, but prefer the returned value.

If the app exposes an HTTP health endpoint, check it:

```bash
DOMAIN=$(tvc app list --message-format json \
  | jq -r --arg id "<APP_ID>" '.apps[] | select(.id == $id) | .publicDomain // empty')
curl "https://$DOMAIN/health"
```

**Do not assert on the response body.** TVC judges liveness by the HTTP status, so a `200` is what matters; the body is app-defined. Treat a non-200 as unhealthy and read the body only for human diagnosis.

The probe is configured on the deployment:

| Field | Values | Default | Also settable via |
|---|---|---|---|
| `healthCheckType` | `TVC_HEALTH_CHECK_TYPE_HTTP`, `TVC_HEALTH_CHECK_TYPE_GRPC` | `..._HTTP` | config file only, no flag or env var |
| `healthCheckPort` | any `u16`, must be the port your app listens on | `3000` | `--health-check-port`, `TVC_HEALTH_CHECK_PORT` |

There is no health-check *path* field, so `/health` is a platform convention rather than something you choose. A deployment whose `healthCheckPort` does not match the port the pivot actually binds will never pass its probe, which looks identical to an app that failed to start.

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
