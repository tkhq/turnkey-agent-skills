# Skill Template (Annotated)

Use this as a starting point when creating a new skill. Copy and modify.

```markdown
---
# REQUIRED: kebab-case, max 64 chars, must match directory name
name: your-skill-name

# REQUIRED: third person, max 1024 chars
# Structure: [What it does] + [When to use it] + [Trigger phrases]
description: "Does X using Turnkey's Y API. Covers A, B, and C. Use when asked to 'do X', 'perform Y', or 'set up Z'."

# OPTIONAL but recommended
license: Apache-2.0
compatibility: "Requires Node.js. Install @turnkey/sdk-server. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars."
metadata:
  version: "1.0.0"
  tags: ["relevant", "tags"]
---

# Your Skill Name

## Quick Start

One paragraph describing the simplest way to use this skill.

## Prerequisites

```bash
npm install @turnkey/sdk-server
```

## Environment Variables

```env
TURNKEY_API_PUBLIC_KEY=    # required
TURNKEY_API_PRIVATE_KEY=   # required
TURNKEY_ORGANIZATION_ID=   # required
```

## Instructions

### Step 1: Set up the Turnkey client

Brief code snippet showing client initialization.

### Step 2: Perform the action

Brief code pattern (not full example, that goes in references/).

For complete examples, see [references/examples.md](references/examples.md).

## Rules

- Rule 1: A mandatory guardrail (e.g., "Always check X before doing Y")
- Rule 2: Another guardrail

## Related Skills

- `signing-ethereum` for EVM transaction signing
- `creating-wallets` for wallet setup
```
