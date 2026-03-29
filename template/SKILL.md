---
name: your-skill-name
description: "Does X using the Turnkey HTTP API. Covers A, B, and C. Use when asked to 'do X', 'perform Y', or 'set up Z'. Do NOT use for X2 (use other-skill) or Y2 (use another-skill)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). Start with getting-started-workflow for credential setup."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["your-tags-here"]
---

# Your Skill Name

## Quick Start

One sentence: the simplest way to accomplish this skill's task.

## Prerequisites

Requires Turnkey API credentials and an `organizationId`. Start with `getting-started-workflow` if the caller still needs credential setup.

All requests must include an `X-Stamp` header. See [references/stamping-basics.md](references/stamping-basics.md) for the signing format.

## Making Requests

Use direct HTTPS requests to `https://api.turnkey.com`.

- Query endpoints use `POST /public/v1/query/...` and include `organizationId` in the JSON body.
- Submit endpoints use `POST /public/v1/submit/...` and return an activity object.
- For submit examples below, the full envelope is `{"type":"ACTIVITY_TYPE_...","timestampMs":"<ms>","organizationId":"<ORG_ID>","parameters":{...}}`.

## Instructions

### Step 1: Perform the action

```
POST /public/v1/submit/your_endpoint
```

```json
{
  "type": "ACTIVITY_TYPE_YOUR_ACTION",
  "timestampMs": "<current-time-ms>",
  "organizationId": "<ORGANIZATION_ID>",
  "parameters": {
    "your": "parameters"
  }
}
```

Brief API call pattern here (10-15 lines max). Delegate full examples to references.

For complete examples, see [references/examples.md](references/examples.md).

## Rules

- Rule 1: A mandatory guardrail specific to this skill
- Rule 2: Another guardrail

## Related Skills

- `managing-wallets-api` for wallet setup
- `signing-transactions-api` for transaction signing
