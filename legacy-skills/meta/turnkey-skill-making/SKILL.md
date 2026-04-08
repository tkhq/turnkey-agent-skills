---
name: turnkey-skill-making
description: 'Guide for creating new Turnkey agent skills. Use when adding a new chain, signing method, or capability to the skill set. Covers the full lifecycle: SKILL.md authoring, reference examples, evals, and validation.'
compatibility: "Requires Node.js, npm, and familiarity with the turnkey-agent-skills repo structure."
depends_on: []
metadata:
  version: "1.0.0"
  tags: ["turnkey", "skill-authoring", "meta", "template", "contributing"]
  sdk_versions:
    "@turnkey/sdk-server": "^5.1.0"
---

# Turnkey Skill Making

## Overview

Use this skill when you need to:
- Add a new chain-specific signing skill (e.g., Cosmos, Aptos, TON)
- Add a new core capability (e.g., policy management, sub-organizations)
- Understand the conventions and validation rules for this repo

Every skill is a directory containing a `SKILL.md` file with YAML frontmatter and structured markdown. Skills may also include reference examples and evals. The test suite automatically validates all skills — if `npm test` passes, your skill is correctly structured.

## Prerequisites

```bash
npm install   # install dependencies (needed for type-checking and tests)
```

You should be familiar with at least one existing skill. Good starting points:
- `skills/core/turnkey-wallet-management/SKILL.md` — simplest core skill
- `skills/signing/turnkey-solana-signing/SKILL.md` — clean signing skill

## Environment Variables

Skills in this repo share these three variables:

```env
TURNKEY_API_PUBLIC_KEY=    # Turnkey API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # Turnkey API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Turnkey organization UUID
```

Signing skills also use `SIGN_WITH` (the address or key to sign with). Your new skill should use these same env var names for consistency.

## Instructions

### Step 1: Choose a directory

| Category | Path | Use for |
|----------|------|---------|
| Core | `skills/core/<name>/` | Foundational capabilities (wallets, signing model) |
| Signing | `skills/signing/<name>/` | Chain-specific transaction signing |
| Meta | `skills/meta/<name>/` | Tooling and skill-authoring guides |

The directory name **must match** the `name` field in your SKILL.md frontmatter exactly.

### Step 2: Write the SKILL.md frontmatter

Every SKILL.md starts with YAML frontmatter between `---` markers. All fields below are required:

```yaml
---
name: turnkey-your-skill-name
description: 'Single-line description of what this skill does and when to use it.'
compatibility: "Requires Node.js. Install @turnkey/sdk-server. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars."
depends_on:
  - turnkey-wallet-management
metadata:
  version: "1.0.0"
  tags: ["turnkey", "your-tag-here"]
  sdk_versions:
    "@turnkey/sdk-server": "^5.1.0"
---
```

**Rules enforced by the test suite:**

- `name` must be **kebab-case** (lowercase letters, digits, hyphens; starts with a letter)
- `name` must match the parent directory name exactly
- `description` must be a **single line** (no newlines) — multi-line descriptions break some indexers
- `depends_on` entries must reference existing skill names (validated against all discovered skills)
- `depends_on` must not include the skill itself
- `metadata.sdk_versions` keys must start with `@turnkey/` and have non-empty version strings

### Step 3: Write the markdown body

Your SKILL.md must contain these sections (enforced by tests):

```markdown
## Overview
What this skill does and when an agent should use it.

## Prerequisites
npm install commands and required packages.

## Environment Variables
Which env vars are needed, with inline comments.

## Instructions (or ## Examples, or ## Option A / ## Option B)
The main content — step-by-step guide or examples.

## Troubleshooting
Common errors and how to fix them.

## Related Skills
Links to other skills using backtick-quoted paths.
```

At least one of `## Instructions`, `## Examples`, or `## Option A`/`## Option B` must be present.

**Code blocks in SKILL.md** can be partial snippets (e.g., showing just client initialization). These are **syntax-checked only** — they don't need to compile on their own. This lets you show focused examples without repeating imports in every block.

**Related Skills format** — use backtick-quoted relative paths:

```markdown
## Related Skills

- `skills/core/turnkey-wallet-management/SKILL.md` — create a wallet first
- `skills/core/turnkey-transaction-signing/SKILL.md` — raw payload signing
```

The test suite verifies every referenced path exists on disk.

### Step 4: Write reference files

Reference files go in a `references/` subdirectory. These are the examples that agents use to generate code, so they must be **high quality**.

**Key rules:**

1. Every TypeScript code block must be **fully self-contained** — all imports, client initialization, and logic in one block
2. Every code block is **semantically type-checked** against the project's tsconfig (not just syntax — full type resolution)
3. Use `@turnkey/sdk-server` as the primary client initialization pattern:

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

4. Use `process.env.VAR!` (non-null assertion) in reference examples for conciseness — the wallet-management skill has a production note about validating env vars at startup
5. One reference file per library or approach (e.g., `ethers-examples.md` and `viem-examples.md` are separate files)
6. Name files descriptively: `<library>-examples.md` or `<method>-examples.md`

**If a reference code block fails the type-checker**, the most common causes are:
- Missing import
- Using an API that changed in a newer SDK version
- Referencing a variable defined in prose but not in the code block

### Step 5: Write evals

Create `evals/evals.json` in your skill directory. The `skill_name` must match your SKILL.md `name` field exactly.

```json
{
  "skill_name": "turnkey-your-skill-name",
  "evals": [
    {
      "id": 1,
      "prompt": "Task description the agent will receive",
      "expected_output": "What the agent should produce (guides the grader)",
      "files": [
        "skills/signing/turnkey-your-skill-name/references/your-examples.md"
      ],
      "assertions": [
        { "type": "imports", "value": "@turnkey/sdk-server" },
        { "type": "env_var", "value": "TURNKEY_API_PUBLIC_KEY" },
        { "type": "compiles" }
      ]
    }
  ]
}
```

**Assertion types:**

| Type | Field(s) | Checks for |
|------|----------|------------|
| `imports` | `value` | `from "pkg"` or `require("pkg")` |
| `calls` | `value` | Function call: `functionName(` |
| `env_var` | `value` | `process.env.VAR_NAME` |
| `contains` | `value` | Substring present |
| `not_contains` | `value` | Substring absent |
| `order` | `before`, `after` | First match of `before` precedes first match of `after` |
| `regex` | `pattern`, `flags?` | Regex match |
| `compiles` | (none) | Full TypeScript type-checking |

**Eval design guidelines:**

- **Always include `compiles`** — this is the most important assertion; it catches real bugs
- **Include at least one "wrong library" eval** — test that the agent uses the correct SDK even when the user mentions the wrong one (e.g., "use my Ethereum signer to send BTC" should still use bitcoinjs-lib)
- **Include a cross-skill eval** if your skill depends on wallet-management — test that the agent can create a wallet AND perform your skill's operation in one flow
- **File paths must resolve** — the test suite checks that every path in `files` exists on disk
- **IDs must be unique** within a single evals.json

### Step 6: Validate

Run these commands to verify your skill:

```bash
# Full validation — structure, syntax, type-checking, evals
npm test

# TypeScript type-checking only
npm run typecheck

# Generate eval solutions for your skill
npm run evals -- --skill turnkey-your-skill-name

# Combined check (typecheck + tests)
npm run check
```

**What each test layer catches:**

| Layer | What it checks | Common failures |
|-------|---------------|-----------------|
| Structure (Layer 1) | Frontmatter fields, required sections, cross-references, evals.json schema | Missing section, typo in assertion type, broken Related Skills path |
| Syntax (Layer 2) | TypeScript syntax in all code blocks | Unclosed brackets, missing semicolons in SKILL.md snippets |
| Compilation (Layer 3) | Full type-checking of reference file code blocks | Missing import, wrong SDK API, undefined variable |
| Evals (Layer 4) | Assertion grading of generated solutions | Only runs if solutions exist in `evals-workspace/` |

All four layers must pass before shipping.

## Troubleshooting

**"name does not match directory"**
The `name` field in frontmatter must exactly match the directory name. Rename one or the other.

**"depends_on entry does not match any skill"**
Check spelling. Run `grep -r "^name:" skills/` to see all valid skill names.

**"Missing required section"**
Add the missing `## SectionName` header. Required: Overview, Prerequisites, Environment Variables, Troubleshooting, Related Skills.

**"Broken reference in Related Skills"**
The backtick-quoted path doesn't point to an existing file. Check the path and fix it.

**Reference code block fails compilation**
The code block is missing an import or uses an undefined variable. Reference blocks must be fully self-contained — add all imports and variable declarations.

**"Unknown assertion type" in evals.json**
Check spelling. Valid types: `imports`, `calls`, `env_var`, `contains`, `not_contains`, `order`, `regex`, `compiles`. Common mistake: `import` instead of `imports`.

**evals.json skill_name doesn't match SKILL.md**
The `skill_name` field in evals.json must exactly match the `name` field in your SKILL.md frontmatter.

## Related Skills

- `skills/core/turnkey-wallet-management/SKILL.md` — good example of a core skill with rules, step-by-step instructions, and a troubleshooting section
- `skills/core/turnkey-transaction-signing/SKILL.md` — example of a routing/decision skill that directs agents to chain-specific skills
- `skills/signing/turnkey-ethereum-evm/SKILL.md` — example of an Option A/B skill (ethers vs viem) with two reference files
- `skills/signing/turnkey-solana-signing/SKILL.md` — clean, focused signing skill
- `skills/signing/turnkey-bitcoin-signing/SKILL.md` — most complex skill; good example of cross-skill evals and multiple signing approaches
