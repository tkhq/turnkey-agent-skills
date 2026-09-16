#!/usr/bin/env bash
# Read-only capability check. Does not load credentials or call Turnkey.
set -euo pipefail
cli=${1:?Usage: check-cli.sh /absolute/path/to/tk}
"$cli" --help >/dev/null
while IFS= read -r command; do
  read -r -a words <<< "$command"
  help=$("$cli" "${words[@]}" --help)
  grep -F -- '--message-format' <<< "$help" >/dev/null
  case "$command" in
    'user create'|'user update'|'user tag create'|'user tag update'|'policy create'|'policy create-batch'|'policy update'|'wallet create'|'wallet update'|'wallet account create'|'sign payload'|'sign transaction'|'api-key register')
      grep -F -- '--input-json' <<< "$help" >/dev/null
      grep -F -- '--input-file' <<< "$help" >/dev/null ;;
    'secret list') grep -F -- '--limit' <<< "$help" >/dev/null; grep -F -- '--cursor' <<< "$help" >/dev/null ;;
    'secret import') grep -F -- '<NAME>' <<< "$help" >/dev/null; grep -F -- '--from-file' <<< "$help" >/dev/null; grep -F -- '--property' <<< "$help" >/dev/null ;;
    'secret export') grep -F -- '--name' <<< "$help" >/dev/null; grep -F -- '--id' <<< "$help" >/dev/null; grep -F -- '--out' <<< "$help" >/dev/null; grep -F -- '--context' <<< "$help" >/dev/null ;;
    'login') grep -F -- '--profile-name' <<< "$help" >/dev/null ;;
    'profile create') grep -F -- '--profile-name' <<< "$help" >/dev/null; grep -F -- '--api-key-file' <<< "$help" >/dev/null ;;
    'profile set') grep -F -- '<NAME>' <<< "$help" >/dev/null; grep -F -- '--api-key-file' <<< "$help" >/dev/null ;;
    'user create') grep -F -- '--input-json' <<< "$help" >/dev/null; grep -F -- '--user-name' <<< "$help" >/dev/null; grep -F -- '--tag-name' <<< "$help" >/dev/null; grep -F -- '--public-key' <<< "$help" >/dev/null; grep -F -- '--anchor-key' <<< "$help" >/dev/null ;;
    'user tag create') grep -F -- '--input-json' <<< "$help" >/dev/null; grep -F -- '--name' <<< "$help" >/dev/null ;;
    'policy create') grep -F -- '--input-json' <<< "$help" >/dev/null; grep -F -- '--effect' <<< "$help" >/dev/null; grep -F -- '--condition' <<< "$help" >/dev/null; grep -F -- '--consensus' <<< "$help" >/dev/null ;;
    'secret env') grep -F -- '--name-prefix' <<< "$help" >/dev/null; grep -F -- '--property' <<< "$help" >/dev/null ;;
    'session request') grep -F -- '--profile-name' <<< "$help" >/dev/null; grep -F -- '--replace' <<< "$help" >/dev/null ;;
    'session provision') grep -F -- '--user-id' <<< "$help" >/dev/null; grep -F -- '--public-key' <<< "$help" >/dev/null; grep -F -- '--expires-in' <<< "$help" >/dev/null ;;
    'session activate') grep -F -- '--profile-name' <<< "$help" >/dev/null ;;
    'session status') grep -F -- '--profile-name' <<< "$help" >/dev/null; grep -F -- '--warn-before' <<< "$help" >/dev/null ;;
    'profile use'|'profile show'|'profile delete') grep -F -- '<NAME>' <<< "$help" >/dev/null ;;
    'api-key generate') grep -F -- '--output' <<< "$help" >/dev/null ;;
    'activity wait') grep -F -- '--timeout' <<< "$help" >/dev/null ;;
    'wallet account list') grep -F -- '--wallet-id' <<< "$help" >/dev/null ;;
    'api-key delete') grep -F -- '--user-id' <<< "$help" >/dev/null ;;
    'request') grep -F -- '--body-file' <<< "$help" >/dev/null ;;
  esac
done <<'COMMANDS'
auth status
auth whoami
auth logout
login
profile create
profile list
profile show
profile set
profile use
profile delete
api-key generate
api-key register
api-key list
api-key delete
user list
user get
user create
user update
user delete
user tag list
user tag create
user tag update
user tag delete
policy list
policy get
policy create
policy create-batch
policy update
policy delete
policy evaluations
wallet list
wallet get
wallet create
wallet update
wallet account list
wallet account create
sign payload
sign transaction
activity list
activity get
activity wait
activity approve
activity reject
request
secret list
secret import
secret export
secret env
session request
session provision
session activate
session status
COMMANDS
printf '%s\n' 'Required local CLI commands are available. Live workflow behavior is not verified.'
