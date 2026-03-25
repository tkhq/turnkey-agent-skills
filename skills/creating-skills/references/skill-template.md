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

## Naming Convention

- **Primitives**: `managing-{resource}-api` (e.g., `managing-wallets-api`, `managing-policies-api`) or `{action}-{resource}-api` (e.g., `signing-transactions-api`)
- **Workflows**: `{purpose}-workflow` (e.g., `getting-started-workflow`, `agentic-wallet-workflow`, `treasury-operations-workflow`)
- **Meta skills**: descriptive name (e.g., `creating-skills`)

## Writing the Description

The description is the most critical field. It controls when the skill gets loaded. Structure it as:

**[What it does] + [What it covers] + [Positive triggers] + [Negative triggers]**

### Good descriptions (from existing skills):

**managing-wallets-api:**
"Manages HD wallets and blockchain accounts via the Turnkey HTTP API. Covers wallet creation, querying, updating, deletion, account derivation, and import/export of mnemonics and account keys. Use when asked to 'create a wallet', 'list wallets', 'get wallet details', 'derive an address', or 'export wallet mnemonic'. Do NOT use for standalone private keys (use managing-private-keys-api), signing (use signing-transactions-api), or policies (use managing-policies-api)."

**signing-transactions-api:**
"Signs and broadcasts blockchain transactions using the Turnkey HTTP API. Supports Ethereum, Bitcoin, Solana, Cosmos, Sui, TON, TRON, and sponsored/gasless transactions. Use when asked to 'sign a transaction via the API', 'sign a raw payload', 'sign a Bitcoin transaction', or 'broadcast a transaction'."

**agentic-wallet-workflow:**
"Gives an AI agent scoped wallet access on Turnkey. Covers onboarding (sub-org, wallet, policies), day-2 management (rotate keys, change permissions, revoke access, debug denials), and monitoring. Use when asked to 'set up agent wallet', 'provision agent credentials', 'rotate agent key', or 'monitor agent activity'. Not for manual wallets, treasury, or standalone keys."

### What makes these good:
- Third person ("Manages...", "Signs...", "Gives...")
- Specific about what Turnkey features are involved
- Lists the concrete capabilities (not vague "helps with")
- Explicit positive trigger phrases ("Use when asked to...")
- Explicit negative triggers ("Do NOT use for...", "Not for...")
- Negative triggers redirect to the correct skill
- Under 1024 characters

### Bad descriptions:
- "Helps with wallets" (too vague, no trigger phrases)
- "I can create wallets for you" (first person, not third)
- "Wallet management skill for blockchain" (no trigger phrases, no specifics)
- Missing negative triggers (causes false activations on overlapping queries)

## SKILL.md Body Sections

### Quick Start
One sentence. The simplest path. Example: "Use the Turnkey API to create an HD wallet and derive addresses."

### Prerequisites
Reference managing-users-api for authentication. Note any additional requirements.

### Instructions

Use **descriptive headings** for each operation, not numbered steps. Examples:

Good (descriptive headings):
- "### Query Wallets"
- "### Create a Wallet"
- "### Derive a New Account"
- "### Export Wallet Mnemonic"

Bad (numbered steps):
- "### Step 1: Create Wallet"
- "### Step 2: Derive Address"

**Activity envelope note**: Include this note at the top of the Instructions section to explain the request body format:

```
Request bodies below show the `parameters` object for clarity. The full API envelope wraps these as: `{"type": "ACTIVITY_TYPE_...", "timestampMs": "<ms>", "organizationId": "<ORG_ID>", "parameters": { ... }}`. Query endpoints require `organizationId` in the request body.

Every submit endpoint returns an activity object: `{ activity: { id, status, type, result } }`. Check `activity.status` for completion. Possible statuses: `COMPLETED`, `FAILED`, `CONSENSUS_NEEDED` (requires multi-party approval), `PENDING`.
```

Show the HTTP endpoint and JSON body for each operation:

```
POST /public/v1/submit/create_wallet
```

```json
{
  "walletName": "my-wallet",
  "accounts": [...]
}
```

Subsequent sections show the key API call pattern, then link to references for full examples.

**Workflow-specific structure**: Workflows use phases instead of flat headings:
- "## Phase 1: Onboarding"
- "## Phase 2: Management"
- "## Phase 3: Monitoring"

### Rules
Mandatory guardrails specific to THIS feature. Examples:
- "Always check for existing wallets with POST /public/v1/query/list_wallets before creating new ones" (managing-wallets-api)
- "Always verify the chain and address format before signing" (signing-transactions-api)
- "DENY always takes precedence over ALLOW" (managing-policies-api)

### Related Skills
Cross-references to skills that are commonly used together. Use current skill names:
- `managing-wallets-api` (wallet creation and address derivation)
- `managing-private-keys-api` (standalone private key management)
- `signing-transactions-api` (transaction signing and broadcasting)
- `managing-policies-api` (access control and policy management)
- `monitoring-activities-api` (activity tracking and audit)
- `managing-users-api` (authentication and user provisioning)
- `managing-organizations-api` (organization and sub-org management)
- `getting-started-workflow` (first-time setup)
- `agentic-wallet-workflow` (agent wallet provisioning with personas)
- `treasury-operations-workflow` (treasury and fund management)

## Reference Files

Put in `references/*.md`. Each file should have:
- A clear heading per example
- Complete, self-contained API examples (HTTP endpoint + JSON body)
- Multiple examples covering different use cases

Keep references one level deep. SKILL.md links to `references/foo.md`, never `references/sub/foo.md`.

## Workflow-Specific Patterns

Workflows compose multiple primitive skills. Additional patterns for workflows:

- **Phases**: Use "Phase 1:", "Phase 2:", "Phase 3:" as section headers
- **Agent personas**: If the workflow involves different access levels, define personas (Worker, Observer, Admin) in a reference file. See `agentic-wallet-workflow/references/agent-personas.md` for the pattern.
- **Decision gates**: Present choices the user must make before proceeding (e.g., isolation model, persona selection)
