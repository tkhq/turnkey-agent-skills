# TVC config files (scaffold, then edit)

`app create`, `deploy create`, and the local-quorum-key flow all read a JSON config file. The reliable pattern is **scaffold with `init`, then fill the sentinels**, rather than hand-authoring JSON. The `init` commands prefill real context (operator pubkey, last app ID, current QOS version) and drop `<FILL_IN_*>` sentinels where you must decide a value. `init` never overwrites an existing file.

Always treat the scaffolded file as the source of truth for the current schema, fields evolve, and the CLI's scaffold is authoritative for the version you have installed.

## App config

```bash
tvc app init --output app.json     # reason: app_config_created
# open app.json, replace every <FILL_IN_*> sentinel (operator set / quorum params)
tvc app create --config-file app.json --message-format json
```

- `--config-file` / `-c` is required for `app create` (env `TVC_APP_CONFIG`).
- `--output` / `-o` is required for `app init` (env `TVC_APP_CONFIG_OUT`).

## Deploy config

```bash
tvc deploy init --output deploy.json         # reason: deployment_config_created
# open deploy.json, set the pivot image + digest, ports, and args
tvc deploy create --config-file deploy.json --app-id <APP_ID> --message-format json
```

Almost every deploy field also has a CLI flag / env var; flags override the file. The one exception is `healthCheckType`, which can only be set in the config file. The knobs:

| Flag | Env | Meaning |
|---|---|---|
| `--app-id` | `TVC_APP_ID` | The app this deployment belongs to |
| `--pivot-image-url` | `TVC_PIVOT_IMAGE_URL` | OCI image URL for the enclave pivot |
| `--expected-pivot-digest` | `TVC_EXPECTED_PIVOT_DIGEST` | Expected digest of the pivot binary (integrity pin) |
| `--pivot-path` | `TVC_PIVOT_PATH` | Path to the pivot binary inside the image |
| `--pivot-args` | `TVC_PIVOT_ARGS` | Args passed to the pivot (repeatable) |
| `--qos-version` | `TVC_QOS_VERSION` | QOS version to run |
| `--health-check-port` | `TVC_HEALTH_CHECK_PORT` | Port the health check probes |
| *(none)* | *(none)* | `healthCheckType` is config-file only: `TVC_HEALTH_CHECK_TYPE_HTTP` (default) or `TVC_HEALTH_CHECK_TYPE_GRPC`. There is no flag and no env var, so it must be set in `deploy.json`. |
| `--public-ingress-port` | `TVC_PUBLIC_INGRESS_PORT` | Public ingress port |
| `--pivot-pull-secret` | `TVC_PIVOT_PULL_SECRET` | Pull secret for a private image |
| `--dangerous-deploy-debug-mode` | `TVC_DANGEROUS_DEPLOY_DEBUG_MODE` | Debug-mode deploy (logs tailable; never for prod) |

Seed a new deployment's config from an existing one:

```bash
tvc deploy init --output deploy.json --from-deployment <OLD_DEPLOY_ID>
```

## Computing the expected pivot digest

`--expected-pivot-digest` pins the pivot binary's integrity. Today there is no CLI helper to compute it (the audit tracks exposing `validate-container-image`), so it is derived out of band from the built image (e.g. `docker create` + `docker cp` the pivot path, then `sha256sum`). Get the `linux/amd64` image digest with `docker buildx imagetools inspect`. A wrong digest is only caught at deploy time, double-check it.

## Local quorum key files (self-provisioned operator)

```bash
tvc keys init-local-quorum-key -o quorum_key.json       # required: -o / TVC_QUORUM_KEY_CONFIG_OUT
# edit quorum_key.json
tvc keys generate-local-quorum-key \
  --config-file quorum_key.json \
  --quorum-key-metadata-out quorum_key_metadata.json    # both required
```

`quorum_key_metadata.json` and any re-encrypted share files contain sensitive shares. Keep them out of source control and out of the working tree you might commit. Prefer writing them to a path outside the repo.
