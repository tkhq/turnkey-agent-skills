#!/usr/bin/env bash
# Read-only capability check. Does not load credentials or call Turnkey.
set -euo pipefail
cli=${1:?Usage: check-cli.sh /absolute/path/to/tk}
"$cli" --help >/dev/null
while IFS= read -r command; do
  read -r -a words <<< "$command"
  help=$("$cli" "${words[@]}" --help)
  case "$command" in
    'user create'|'user update'|'user tag create'|'user tag update'|'policy create'|'policy create-batch'|'policy update'|'wallet create'|'wallet update'|'wallet account create'|'sign payload'|'sign transaction'|'api-key register')
      grep -F -- '--input-json' <<< "$help" >/dev/null
      grep -F -- '--input-file' <<< "$help" >/dev/null ;;
    'login'|'profile set'|'profile show'|'profile use'|'profile delete') grep -F -- '--profile-name' <<< "$help" >/dev/null ;;
    'profile create') grep -F -- '--api-key-file' <<< "$help" >/dev/null ;;
    'api-key generate') grep -F -- '--output' <<< "$help" >/dev/null ;;
    'user get'|'user delete'|'user tag delete'|'policy get'|'policy delete'|'wallet get'|'activity get'|'activity approve'|'activity reject') grep -F -- '--id' <<< "$help" >/dev/null ;;
    'policy evaluations') grep -F -- '--activity-id' <<< "$help" >/dev/null ;;
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
profile set
profile list
profile show
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
user tag delete
user tag create
user tag update
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
COMMANDS
printf '%s\n' 'Required local CLI commands are available. Live workflow behavior is not verified.'
