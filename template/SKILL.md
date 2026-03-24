---
name: your-skill-name
description: "Does X using Turnkey's Y API. Covers A, B, and C. Use when asked to 'do X', 'perform Y', or 'set up Z'."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). See managing-users-api for authentication setup."
metadata:
  version: "1.0.0"
  tags: ["your-tags-here"]
---

# Your Skill Name

## Quick Start

One sentence: the simplest way to accomplish this skill's task.

## Prerequisites

Requires API credentials configured via the managing-users-api skill. All requests must be signed with your P-256 key pair using Turnkey's X-Stamp authentication.

## Instructions

### Step 1: Perform the action

```
POST /public/v1/submit/your_endpoint
```

```json
{
  "your": "parameters"
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
