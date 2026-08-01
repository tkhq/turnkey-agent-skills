# TVC CLI error reference

Every runtime error in JSON mode is a single NDJSON line:

```json
{ "reason": "command-error", "code": "<code>", "httpStatus": 404, "message": "<full error chain>" }
```

- `reason` is `command-error` for all runtime errors (and `missing-required-input` for that one special case). It identifies the *shape*; it is not the classification.
- `code` is the stable classification, **branch on this**, never on `message` text.
- `httpStatus` is present only when the failure came from an HTTP response.
- `message` is the full error chain including the server's response body (not just the top layer). Show it to humans; do not parse it programmatically.

Exit codes: `0` success, `1` runtime error, `2` usage error.

## Code taxonomy

| `code` | Trigger | Recovery |
|---|---|---|
| `missing_required_input` | A required value was absent in non-interactive mode. `reason` is `missing-required-input`. | The message names the missing flag. Supply it or its `TVC_*` env var. |
| `usage_error` | Bad flags/args or unknown subcommand (clap parse failure). Exit code 2. | Fix the command. Re-check subcommand and flag names against the skill; do not invent flags. |
| `unauthorized` | HTTP 401/403 from the API. | Verify `TVC_ORG_ID` / `TVC_API_KEY_PUBLIC` / `TVC_API_KEY_PRIVATE` (or your `tvc login` profile), and that the key is permitted for the action. |
| `not_found` | HTTP 404, or an OK response with an empty resource. | Confirm the `--app-id` / `--deploy-id`. Remember there is no `deploy list` to discover IDs; you must have saved them. |
| `approval_required` | The activity needs more approvals (consensus) before it can proceed. | Collect additional operator approvals via `deploy approve`, then continue. |
| `network_error` | Connect / timeout / DNS; the request never reached the server. | Check `TVC_API_BASE_URL` and connectivity. Safe to retry with backoff. |
| `api_error` | Any other non-2xx HTTP status, or a failed/unexpected activity. | Read `message` for the server's explanation. Not automatically retryable. |
| `command_error` | Fallback for anything not classified above. | Read `message`. |
| `invalid_input` | Defined in the taxonomy but **not currently emitted** by the classifier. | You will not see this today; do not branch on it expecting semantic-validation failures. |

## Handling patterns

- **Retryable:** `network_error` (backoff + retry). `api_error` may be transient (5xx) or permanent (4xx-ish), inspect before retrying.
- **Not retryable without a change:** `usage_error`, `missing_required_input`, `unauthorized`, `not_found`, `invalid_input`.
- **Needs a human/side action:** `approval_required` (get more approvals).
- **Never loop blindly on the same command.** If a retry would send the identical request, only retry `network_error`.

## Gotchas

- JSON mode forces non-interactive, so a command that would prompt instead fails with `missing_required_input`. Provide every required value up front.
- `deploy approve` in JSON mode fails fast (as `missing_required_input` on `--dangerous-skip-interactive`) unless that flag is passed.
- A 404-style "not found" can also mean "exists but has no state yet" (e.g. `deploy get-status` before replicas appear returns `replicas: null` rather than erroring, but a truly unknown ID errors as `not_found`). Distinguish by whether you hold a valid ID.
