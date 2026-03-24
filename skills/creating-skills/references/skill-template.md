# Skill Template (Annotated)

Copy `template/SKILL.md` and modify it. This document explains each section.

## Frontmatter

```yaml
---
name: your-skill-name          # kebab-case, max 64 chars, MUST match directory name
description: "..."              # See "Writing the Description" below
license: Apache-2.0
compatibility: "Requires turnkey CLI (brew install tkhq/tap/turnkey). Set up API keys first."
metadata:
  version: "1.0.0"
  tags: ["relevant", "tags"]   # Used for search and categorization
---
```

## Writing the Description

The description is the most critical field. It controls when the skill gets loaded. Structure it as:

**[What it does] + [What it covers] + [When to use it with trigger phrases]**

### Good descriptions (from existing skills):

**creating-wallets-api:**
"Creates HD wallets and derives blockchain addresses for Ethereum, Solana, Bitcoin, Cosmos, and other chains using Turnkey's secure enclave infrastructure. Use when asked to 'create a wallet', 'set up a wallet', 'get a blockchain address', 'derive an address', 'check if I have a wallet', or 'list my wallets'."

**signing-transactions-api:**
"Signs and broadcasts blockchain transactions using Turnkey. Supports Ethereum/EVM (viem, ethers), Bitcoin (P2WPKH, P2TR), Solana, Cosmos (CosmJS), Uniswap, Sui, TON, TRON, x402 payments, and sponsored/gasless transactions via paymaster. Use when asked to 'send ETH', 'send BTC', 'send SOL', 'sign a transaction', 'transfer tokens', 'sign a message', or 'broadcast a transaction'."

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
One sentence. The simplest path. Example: "Use the Turnkey CLI to create an HD wallet and derive addresses."

### Prerequisites
Just the npm install command. Nothing else.

### Environment Variables
Standard env block. Every skill uses the same three base variables. Add `SIGN_WITH` for signing skills.

### Instructions
Step-by-step with brief code/command patterns (10-15 lines per block). The first step is always CLI setup and authentication:

```bash
# Install the CLI
brew install tkhq/tap/turnkey

# Generate API keys
turnkey generate api-key --organization $ORGANIZATION_ID --key-name default
```

Subsequent steps show the key CLI command pattern, then link to references for full examples.

### Rules
Mandatory guardrails specific to THIS feature. Examples:
- "Always check for existing wallets with turnkey wallets list before creating new ones" (creating-wallets-api)
- "Always verify the chain and address format before signing" (signing-transactions-api)
- "DENY always takes precedence over ALLOW" (managing-policies-api)

### Related Skills
Cross-references to skills that are commonly used together.

## Reference Files

Put in `references/*.md`. Each file should have:
- A clear heading per example
- Complete, self-contained examples (full CLI commands and API calls)
- Multiple examples covering different use cases

Keep references one level deep. SKILL.md links to `references/foo.md`, never `references/sub/foo.md`.
