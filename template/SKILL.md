---
# REQUIRED: kebab-case, max 64 chars, must match directory name
name: your-skill-name
# REQUIRED: third person, max 1024 chars
# Structure: [What it does] + [When to use it] + [Trigger phrases]
description: "Describe what this skill does using Turnkey's APIs. Use when asked to 'trigger phrase 1', 'trigger phrase 2', or 'trigger phrase 3'."
# OPTIONAL
license: Apache-2.0
compatibility: "Requires Node.js. Install @turnkey/sdk-server. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars."
metadata:
  version: "1.0.0"
  tags: ["your-tags-here"]
---

# Your Skill Name

## Quick Start

One paragraph: the simplest way to accomplish this skill's task.

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

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
```

### Step 2: Perform the action

Brief code pattern here. Delegate full examples to references.

For complete examples, see [references/examples.md](references/examples.md).

## Rules

- Rule 1: A mandatory guardrail specific to this skill
- Rule 2: Another guardrail

## Related Skills

- `creating-wallets` for wallet setup
- `signing-ethereum` for EVM transaction signing
