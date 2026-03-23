# Skill Template (Annotated)

Copy `template/SKILL.md` and modify it. This document explains each section.

## Frontmatter

```yaml
---
name: your-skill-name          # kebab-case, max 64 chars, MUST match directory name
description: "..."              # See "Writing the Description" below
license: Apache-2.0
compatibility: "Requires Node.js. Install @turnkey/sdk-server. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars."
metadata:
  version: "1.0.0"
  tags: ["relevant", "tags"]   # Used for search and categorization
---
```

## Writing the Description

The description is the most critical field. It controls when the skill gets loaded. Structure it as:

**[What it does] + [What it covers] + [When to use it with trigger phrases]**

### Good descriptions (from existing skills):

**creating-wallets:**
"Creates HD wallets and derives blockchain addresses for Ethereum, Solana, Bitcoin, Cosmos, and other chains using Turnkey's secure enclave infrastructure. Use when asked to 'create a wallet', 'set up a wallet', 'get a blockchain address', 'derive an address', 'check if I have a wallet', or 'list my wallets'."

**signing-ethereum:**
"Signs and broadcasts Ethereum and EVM-compatible chain transactions using Turnkey with ethers.js or viem. Covers ETH transfers, ERC-20 tokens, contract interactions, and message signing (EIP-191, EIP-712). Use when asked to 'send ETH', 'sign an EVM transaction', 'transfer tokens', 'call a smart contract', 'deploy a contract', 'sign a message', or 'sign typed data'."

### What makes these good:
- Third person ("Creates...", "Signs...")
- Specific about what Turnkey features are involved
- Lists the concrete capabilities (not vague "helps with")
- Explicit trigger phrases match what a user would actually type
- Under 1024 characters

### Bad descriptions:
- "Helps with wallets" (too vague, no trigger phrases)
- "I can create wallets for you" (first person, not third)
- "Wallet management skill for blockchain" (no trigger phrases, no specifics)

## SKILL.md Body Sections

### Quick Start
One sentence. The simplest path. Example: "Use `@turnkey/sdk-server` to create an HD wallet and derive addresses."

### Prerequisites
Just the npm install command. Nothing else.

### Environment Variables
Standard env block. Every skill uses the same three base variables. Add `SIGN_WITH` for signing skills.

### Instructions
Step-by-step with brief code patterns (10-15 lines per block). The first step is always Turnkey client initialization:

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

Subsequent steps show the key API call pattern, then link to references for full examples.

### Rules
Mandatory guardrails specific to THIS feature. Examples:
- "NEVER call createWallet without first calling getWallets" (creating-wallets)
- "Always pass the signing address explicitly to addSignature" (signing-solana)
- "DENY always takes precedence over ALLOW" (managing-policies)

### Related Skills
Cross-references to skills that are commonly used together.

## Reference Files

Put in `references/*.md`. Each file should have:
- A clear heading per example
- Complete, self-contained TypeScript (all imports, full init, full API call)
- Multiple examples covering different use cases

Keep references one level deep. SKILL.md links to `references/foo.md`, never `references/sub/foo.md`.
