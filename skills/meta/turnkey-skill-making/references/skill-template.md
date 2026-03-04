# Skill Template

Copy the sections below to scaffold a new skill. Replace all `<placeholders>` with actual values.

## SKILL.md template

````markdown
---
name: turnkey-<your-skill-name>
description: '<One-line description. Mention trigger phrases like "send X", "sign Y", etc.>'
compatibility: "Requires Node.js. Install @turnkey/sdk-server. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars."
depends_on:
  - turnkey-wallet-management
metadata:
  version: "1.0.0"
  tags: ["turnkey", "<your-chain>", "signing"]
  sdk_versions:
    "@turnkey/sdk-server": "^5.1.0"
---

# Turnkey <Your Skill Name>

## Overview

Use this skill to:
- <Primary use case>
- <Secondary use case>

## Prerequisites

```bash
npm install @turnkey/sdk-server <other-packages>
```

Before signing, create a wallet using `skills/core/turnkey-wallet-management/SKILL.md`.

## Environment Variables

```env
TURNKEY_API_PUBLIC_KEY=    # Turnkey API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # Turnkey API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Turnkey organization UUID
SIGN_WITH=                 # Address or public key to sign with
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

### Step 2: <Build the transaction>

```typescript
// Your chain-specific transaction building code
```

### Step 3: <Sign and broadcast>

```typescript
// Signing and broadcasting code
```

## Troubleshooting

**<Common error 1>**
<Explanation and fix.>

**<Common error 2>**
<Explanation and fix.>

## Related Skills

- `skills/core/turnkey-wallet-management/SKILL.md` — create a wallet and get your signing address
- `skills/core/turnkey-transaction-signing/SKILL.md` — raw payload signing for unsupported chains
````

## evals.json template

```json
{
  "skill_name": "turnkey-<your-skill-name>",
  "evals": [
    {
      "id": 1,
      "prompt": "<Task an agent would receive, e.g., 'Send 0.1 X to address Y on testnet'>",
      "expected_output": "<Describe the correct output: what imports, what API calls, what the code should do>",
      "files": [
        "skills/signing/turnkey-<your-skill-name>/references/<your>-examples.md"
      ],
      "assertions": [
        { "type": "imports", "value": "@turnkey/sdk-server" },
        { "type": "env_var", "value": "TURNKEY_API_PUBLIC_KEY" },
        { "type": "env_var", "value": "TURNKEY_ORGANIZATION_ID" },
        { "type": "env_var", "value": "SIGN_WITH" },
        { "type": "compiles" }
      ]
    },
    {
      "id": 2,
      "prompt": "<Wrong-library eval: user asks to use an inappropriate SDK for this chain>",
      "expected_output": "<Agent should use the correct library despite the user's suggestion>",
      "files": [
        "skills/signing/turnkey-<your-skill-name>/references/<your>-examples.md"
      ],
      "assertions": [
        { "type": "not_contains", "value": "from \"@turnkey/ethers\"" },
        { "type": "not_contains", "value": "from \"@turnkey/viem\"" },
        { "type": "imports", "value": "<correct-package>" }
      ]
    },
    {
      "id": 3,
      "prompt": "<Cross-skill eval: user has no wallet yet and needs to create one before signing>",
      "expected_output": "<Code should call getWallets, then createWallet if needed, then proceed to sign>",
      "files": [
        "skills/signing/turnkey-<your-skill-name>/references/<your>-examples.md"
      ],
      "assertions": [
        { "type": "calls", "value": "getWallets" },
        { "type": "calls", "value": "createWallet" },
        { "type": "order", "before": "getWallets", "after": "createWallet" },
        { "type": "compiles" }
      ]
    }
  ]
}
```

## Reference file template

````markdown
# <Library> Examples

Each example below is fully self-contained — it includes all imports and setup so you can use it directly.

## <Use case 1, e.g., "Send X on testnet">

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

// Your complete, self-contained example here
// Must compile against the project tsconfig
```

## <Use case 2>

```typescript
import { Turnkey } from "@turnkey/sdk-server";

// Another complete example
```
````
