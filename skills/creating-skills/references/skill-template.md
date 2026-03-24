# Skill Template (Annotated)

Copy `template/SKILL.md` and modify it. This document explains each section.

## Frontmatter

```yaml
---
name: your-skill-name          # kebab-case, max 64 chars, MUST match directory name
description: "..."              # See "Writing the Description" below
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). See managing-users-api for authentication setup."
metadata:
  version: "1.0.0"
  tags: ["relevant", "tags"]   # Used for search and categorization
---
```

## Writing the Description

The description is the most critical field. It controls when the skill gets loaded. Structure it as:

**[What it does] + [What it covers] + [When to use it with trigger phrases]**

### Good descriptions (from existing skills):

**managing-wallets-api:**
"Creates HD wallets and derives blockchain addresses for Ethereum, Solana, Bitcoin, Cosmos, and other chains using the Turnkey API. Use when asked to 'create a wallet via the API', 'list wallets', 'get a blockchain address', 'derive an address', or 'list my wallets'."

**signing-transactions-api:**
"Signs and broadcasts blockchain transactions using the Turnkey HTTP API. Supports Ethereum, Bitcoin, Solana, Cosmos, Sui, TON, TRON, and sponsored/gasless transactions. Use when asked to 'sign a transaction via the API', 'sign a raw payload', 'sign a Bitcoin transaction', or 'broadcast a transaction'."

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
One sentence. The simplest path. Example: "Use the Turnkey API to create an HD wallet and derive addresses."

### Prerequisites
Reference managing-users-api for authentication. Note any additional requirements.

### Instructions
Step-by-step with brief API call patterns (10-15 lines per block). Show the HTTP endpoint and JSON body:

```
POST /public/v1/submit/create_wallet
```

```json
{
  "walletName": "my-wallet",
  "accounts": [...]
}
```

Subsequent steps show the key API call pattern, then link to references for full examples.

### Rules
Mandatory guardrails specific to THIS feature. Examples:
- "Always check for existing wallets with POST /public/v1/query/list_wallets before creating new ones" (managing-wallets-api)
- "Always verify the chain and address format before signing" (signing-transactions-api)
- "DENY always takes precedence over ALLOW" (managing-policies-api)

### Related Skills
Cross-references to skills that are commonly used together.

## Reference Files

Put in `references/*.md`. Each file should have:
- A clear heading per example
- Complete, self-contained API examples (HTTP endpoint + JSON body)
- Multiple examples covering different use cases

Keep references one level deep. SKILL.md links to `references/foo.md`, never `references/sub/foo.md`.
