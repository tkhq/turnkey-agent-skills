---
name: your-skill-name
description: "Does X using Turnkey's Y API. Covers A, B, and C. Use when asked to 'do X', 'perform Y', or 'set up Z'."
license: Apache-2.0
compatibility: "Requires turnkey CLI (brew install tkhq/tap/turnkey). Set up API keys first."
metadata:
  version: "1.0.0"
  tags: ["your-tags-here"]
---

# Your Skill Name

## Quick Start

One sentence: the simplest way to accomplish this skill's task.

## Prerequisites

```bash
brew install tkhq/tap/turnkey
```

## Environment Variables

```env
ORGANIZATION_ID=   # required, your Turnkey organization UUID
```

## Instructions

### Step 1: Set up CLI authentication

```bash
# Generate API keys (if not already done)
turnkey generate api-key --organization $ORGANIZATION_ID --key-name default

# Verify CLI is working
turnkey version
```

### Step 2: Perform the action

Brief command pattern here (10-15 lines max). Delegate full examples to references.

For complete examples, see [references/examples.md](references/examples.md).

## Rules

- Rule 1: A mandatory guardrail specific to this skill
- Rule 2: Another guardrail

## Related Skills

- `creating-wallets-api` for wallet setup
- `signing-transactions-api` for transaction signing
