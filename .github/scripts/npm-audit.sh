#!/usr/bin/env bash
# Usage: npm-audit.sh <workdir> <out-advisories-file>
# Runs npm audit and writes sorted advisory URLs to <out-advisories-file>.
# Exits non-zero on execution/parsing errors; allows exit 1 (vulns found).
set -euo pipefail

WORKDIR="$1"
OUT_FILE="$2"
AUDIT_JSON="$(mktemp)"

cd "$WORKDIR"
npm audit --omit=dev --audit-level=high --json > "$AUDIT_JSON" 2>&1 || true

if [ ! -s "$AUDIT_JSON" ]; then
  echo "::error::npm audit produced no output in $WORKDIR — possible registry or network failure"
  exit 1
fi

if jq -e '.error' "$AUDIT_JSON" > /dev/null 2>&1; then
  echo "::error::npm audit reported an execution error in $WORKDIR:"
  jq -r '.error' "$AUDIT_JSON"
  exit 1
fi

jq -r '[.vulnerabilities // {} | to_entries[].value.via[]? | select(type == "object") | .url // empty] | sort | unique | .[]' \
  "$AUDIT_JSON" > "$OUT_FILE"

echo "Advisories found in $WORKDIR:"
cat "$OUT_FILE"
