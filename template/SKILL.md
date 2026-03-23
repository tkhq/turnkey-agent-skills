---
name: your-skill-name
description: "Does X using Turnkey's Y API. Covers A, B, and C. Use when asked to 'do X', 'perform Y', or 'set up Z'."
license: Apache-2.0
compatibility: "Requires Node.js. Install @turnkey/sdk-server. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars."
metadata:
  version: "1.0.0"
  tags: ["your-tags-here"]
---

# Your Skill Name

## Quick Start

One sentence: the simplest way to accomplish this skill's task.

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

### Step 1: Initialize the Turnkey client

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();
```

### Step 2: Perform the action

Brief code pattern here (10-15 lines max). Delegate full examples to references.

For complete examples, see [references/examples.md](references/examples.md).

## Rules

- Rule 1: A mandatory guardrail specific to this skill
- Rule 2: Another guardrail

## Related Skills

- `creating-wallets` for wallet setup
- `signing-ethereum` for EVM transaction signing
