# Infrastructure Update for Skills Rewrite

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 56 test failures and update documentation to reflect the new flat, API-first skill structure.

**Architecture:** The skills were rewritten from SDK-centric TypeScript examples under `skills/{category}/{turnkey-name}/` to API-first JSON-based skills under `skills/{name}/`. Tests and docs still assume the old structure. We update tests to accommodate the new code-block style, fix broken cross-references, and rewrite docs.

**Tech Stack:** TypeScript, Vitest, gray-matter, npm

---

### Task 1: Fix broken `checking-balances` cross-references (2 test failures)

**Files:**
- Modify: `skills/managing-wallets/SKILL.md` (Related Skills section)
- Modify: `skills/signing-transactions/SKILL.md` (Related Skills section)

- [ ] **Step 1: Remove `checking-balances` from managing-wallets**

In `skills/managing-wallets/SKILL.md`, replace the Related Skills section:

```markdown
## Related Skills

- `signing-transactions` — sign and broadcast transactions
- `checking-balances` — check wallet balances before transacting
- `managing-private-keys` — standalone private keys (one key, one address)
- `managing-policies` — policies that affect wallet operations
```

with:

```markdown
## Related Skills

- `signing-transactions` — sign and broadcast transactions
- `managing-private-keys` — standalone private keys (one key, one address)
- `managing-policies` — policies that affect wallet operations
```

- [ ] **Step 2: Remove `checking-balances` from signing-transactions**

In `skills/signing-transactions/SKILL.md`, replace the Related Skills section:

```markdown
## Related Skills

- `managing-wallets` — create a wallet and derive addresses before signing
- `checking-balances` — check balances before sending
- `managing-policies` — review or update policies that affect signing
```

with:

```markdown
## Related Skills

- `managing-wallets` — create a wallet and derive addresses before signing
- `managing-policies` — review or update policies that affect signing
```

- [ ] **Step 3: Run skill-structure tests to verify**

Run: `npx vitest run tests/skill-structure.test.ts`
Expected: All tests pass (0 failures in this file)

- [ ] **Step 4: Commit**

```bash
git add skills/managing-wallets/SKILL.md skills/signing-transactions/SKILL.md
git commit -m "fix: remove broken checking-balances cross-references"
```

---

### Task 2: Update `code-blocks.test.ts` to accept any code block language (24 test failures)

**Files:**
- Modify: `tests/code-blocks.test.ts`

The new skills use `json` and unlabeled code blocks instead of TypeScript. The test requires at least one `typescript`/`ts` block per file. We change the minimum-block check to accept any fenced code block language (json, env, bash, typescript, ts, or unlabeled), while keeping TypeScript syntax validation for TS blocks that do exist.

- [ ] **Step 1: Add a function to extract all code blocks regardless of language**

In `tests/code-blocks.test.ts`, after the existing `extractTypeScriptBlocks` function (after line 49), add:

```typescript
/** Returns true if the markdown contains at least one fenced code block of any language. */
function hasAnyCodeBlock(markdown: string): boolean {
  return /```(?:\w*)\n[\s\S]*?```/.test(markdown);
}
```

- [ ] **Step 2: Change the minimum-block check to use `hasAnyCodeBlock`**

In `tests/code-blocks.test.ts`, replace the block at lines 104-111:

```typescript
  describe(name, () => {
    if (blocks.length === 0) {
      it("has at least one TypeScript code block", () => {
        // Every skill should demonstrate usage with code
        expect(blocks.length).toBeGreaterThan(0);
      });
      return;
    }
```

with:

```typescript
  describe(name, () => {
    it("has at least one code block", () => {
      expect(
        hasAnyCodeBlock(content),
        "Every skill/reference file should include at least one code example",
      ).toBe(true);
    });

    if (blocks.length === 0) {
      return;
    }
```

This still validates:
- Every skill/reference has at least one code example (any language)
- Any TypeScript blocks that exist are syntax-checked

- [ ] **Step 3: Run code-blocks tests**

Run: `npx vitest run tests/code-blocks.test.ts`
Expected: All 24 "has at least one TypeScript code block" failures are gone. Any existing TS blocks still get syntax-checked.

- [ ] **Step 4: Commit**

```bash
git add tests/code-blocks.test.ts
git commit -m "fix: accept any code block language in code-blocks test

New API-first skills use JSON examples, not TypeScript. The test
now checks for at least one code block of any language while still
syntax-checking any TypeScript blocks that exist."
```

---

### Task 3: Update `reference-compiles.test.ts` to skip partial TS snippets in `.md` references (30 test failures)

**Files:**
- Modify: `tests/reference-compiles.test.ts`

The old reference files were self-contained `.ts` files that compiled. The new references are `.md` files with partial TypeScript snippets (they reference variables from surrounding prose like `client`, `psbt`, `signWith`). These are illustrative, not compilable.

We skip compilation for `.md` reference files. If self-contained `.ts` reference files are added in the future, they'll still be type-checked.

- [ ] **Step 1: Filter reference files to only `.ts` files**

In `tests/reference-compiles.test.ts`, change line 53:

```typescript
const referenceFiles = findReferenceFiles(SKILLS_ROOT);
```

to:

```typescript
const referenceFiles = findReferenceFiles(SKILLS_ROOT).filter(
  (f) => f.endsWith(".ts"),
);
```

This means:
- `.ts` reference files (old format, self-contained): still type-checked
- `.md` reference files (new format, partial snippets): skipped for compilation, still syntax-checked by code-blocks.test.ts

- [ ] **Step 2: Run reference-compiles tests**

Run: `npx vitest run tests/reference-compiles.test.ts`
Expected: 0 failures (no `.ts` reference files exist in new skills, so no tests to run — the test file passes vacuously)

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: 0 failures. All 56 failures resolved across tasks 1-3.

- [ ] **Step 4: Commit**

```bash
git add tests/reference-compiles.test.ts
git commit -m "fix: skip type-checking for .md reference files

New reference files are .md with partial TypeScript snippets that
reference variables from surrounding prose. Only self-contained .ts
reference files are type-checked. Syntax checking for TS blocks in
.md files is still handled by code-blocks.test.ts."
```

---

### Task 4: Update `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Rewrite CLAUDE.md**

Replace the entire contents of `CLAUDE.md` with:

```markdown
# turnkey-agent-skills — Reusable AI Agent Skills

Skill definitions for AI agent wallet operations. Works with Claude Code and other AI agent platforms.

## Tech Stack
- TypeScript
- Vitest (testing)
- gray-matter (SKILL.md parsing)

## Structure
skills/           # 9 flat skill directories (API-first)
  getting-started/
  managing-agent/
  managing-policies/
  managing-private-keys/
  managing-users/
  managing-wallets/
  monitoring-activities/
  provisioning-agent/
  signing-transactions/
legacy-skills/    # archived SDK-based skills
examples/         # runnable TypeScript SDK demos
tests/

## Skills (API-first)
- getting-started — verify credentials, create first wallet
- managing-agent — debug denied transactions, rotate keys, update policies
- managing-policies — access control, spending limits, allowlists
- managing-private-keys — standalone key management, import/export
- managing-users — user creation, API key rotation, tags
- managing-wallets — create wallets, derive addresses, add chains
- monitoring-activities — activity status, approvals, audit
- provisioning-agent — create scoped agent with constrained credentials
- signing-transactions — sign and broadcast on any chain (EVM, Solana, Bitcoin)

## Key Commands
- npm run check
- npm run test
- npm run test:watch
- npm run typecheck

## Dependencies
- @solana/web3.js
- @turnkey/api-key-stamper
- @turnkey/ethers
- @turnkey/http
- @turnkey/solana
- @turnkey/viem
- @types/node
- ethers
- gray-matter
- tsx
- typescript
- viem
- vitest

## Notes
- Each skill is a SKILL.md with YAML frontmatter + markdown instructions + JSON/code examples
- Skills teach API-first patterns (direct HTTP/JSON) with SDK examples in signing references
- `examples/` has runnable SDK demos (wallet-management, ethereum, solana)
- Requires TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars
- `.env.example` shows required configuration
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for new flat skill structure"
```

---

### Task 5: Update `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite README.md**

Replace the entire contents of `README.md` with:

```markdown
# Turnkey Agent Skills

A collection of AI agent skills for [Turnkey](https://turnkey.com) — the wallet infrastructure platform that manages cryptographic keys in hardware-backed secure enclaves.

These skills enable AI agents to autonomously create wallets, derive addresses, sign transactions, and manage users and policies across multiple blockchains. Compatible with **Claude Code** and other AI agent platforms.

## What is Turnkey?

Turnkey stores private keys in secure enclaves (AWS Nitro, etc.) — keys are **never exposed** to application code. Every API request is cryptographically "stamped" (signed with your API key pair) before being sent, ensuring only authorized callers can trigger operations on your keys.

## Environment Variables

All skills require these three variables:

` ` `env
TURNKEY_API_PUBLIC_KEY=<your-api-public-key>
TURNKEY_API_PRIVATE_KEY=<your-api-private-key>
TURNKEY_ORGANIZATION_ID=<your-organization-id>
` ` `

Get these from the [Turnkey console](https://app.turnkey.com) under **Settings → API Keys**. When you create an API key, you receive a P-256 public/private key pair. The organization ID is visible in the URL and settings page.

## Loading Skills

Each skill is a `SKILL.md` file — a structured prompt that teaches an AI agent how to perform a Turnkey operation. The root [`SKILL.md`](SKILL.md) is the master index: it lists every skill, explains when to use each one, and defines the load order for multi-step tasks.

### Claude Code

Install as a plugin so all skills are automatically discovered:
` ` `
/plugin marketplace add turnkey/turnkey-agent-skills
/plugin install turnkey@turnkey-skills
` ` `

Or reference skills directly in your prompt:
` ` `
Please read SKILL.md and help me sign an Ethereum transaction.
Please read skills/managing-wallets/SKILL.md and create a wallet for me.
` ` `

Point your agent at the root `SKILL.md` when you're not sure which skill you need — it will route to the right one.

### Other Platforms

Paste the contents of a `SKILL.md` into your assistant's system prompt, or upload it as a knowledge file. For multi-skill tasks, include the root `SKILL.md` as context so the assistant knows the full skill set.

## Skills

### Primitives

| Skill | Path | Description |
|-------|------|-------------|
| Signing Transactions | `skills/signing-transactions/` | Sign and broadcast on any chain (EVM, Solana, Bitcoin) |
| Managing Wallets | `skills/managing-wallets/` | Create wallets, derive addresses, add chains, import/export |
| Managing Private Keys | `skills/managing-private-keys/` | Standalone key management, key tags, import/export |
| Managing Users | `skills/managing-users/` | User creation, API key rotation, user tags |
| Managing Policies | `skills/managing-policies/` | Access control, spending limits, allowlists, multi-sig |
| Monitoring Activities | `skills/monitoring-activities/` | Activity status, consensus approvals, audit |

### Workflows

| Skill | Path | Description |
|-------|------|-------------|
| Getting Started | `skills/getting-started/` | Verify credentials, create first wallet |
| Provisioning Agent | `skills/provisioning-agent/` | Give an agent a scoped wallet with constrained credentials |
| Managing Agent | `skills/managing-agent/` | Debug denied transactions, rotate keys, update policies |

## Running Examples

The `examples/` directory contains runnable TypeScript demos that use the Turnkey SDK packages:

` ` `bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your API_PUBLIC_KEY, API_PRIVATE_KEY, ORGANIZATION_ID

# Run an example (requires tsx)
npx tsx examples/wallet-management.ts
npx tsx examples/ethereum-ethers.ts
npx tsx examples/ethereum-viem.ts
npx tsx examples/solana-signing.ts
npx tsx examples/bitcoin-signing.ts
` ` `

## Running Evals

Each skill includes test cases in `skills/<skill-name>/evals/evals.json`. The automated eval runner discovers all evals, sends them through an LLM, grades the output against assertions, and prints a summary.

` ` `bash
# Run all evals with Claude (default provider)
npm run evals

# Run evals for a specific skill
npm run evals -- --skill managing-wallets

# Run a single eval
npm run evals -- --skill signing-transactions --eval 1

# Also run a baseline without skill context for comparison
npm run evals -- --without-skill

# Use OpenAI instead of Claude (requires OPENAI_API_KEY)
npm run evals -- --provider openai --model gpt-4o

# Other options
npm run evals -- --concurrency 2    # limit parallel runs (default: 4)
npm run evals -- --dry-run           # print prompts without executing
npm run evals -- --verbose           # print full LLM responses
` ` `

## Adding New Skills

1. Create a directory under `skills/` with a kebab-case name matching the skill name.

2. Create `SKILL.md` with required frontmatter:
   ` ` `yaml
   ---
   name: your-skill-name
   description: 'Single-line description of what this skill does.'
   compatibility: "Runtime requirements and required env vars."
   metadata:
     version: "1.0.0"
     tags: ["turnkey", "your-tag-here"]
   ---
   ` ` `

3. Include required sections: at least one content section (Instructions, Examples, Phases, Steps, etc.), Troubleshooting, Related Skills, and Rules.

4. Add reference examples in `references/` as `.md` files with JSON or TypeScript code blocks.

5. Add evals in `evals/evals.json`.

6. Validate:
   ` ` `bash
   npm test        # structure, syntax, type-checking, evals
   npm run check   # typecheck + tests
   ` ` `

## Project Structure

` ` `
turnkey-agent-skills/
├── README.md
├── SKILL.md                              # Root skill index
├── skills/
│   ├── getting-started/
│   │   ├── SKILL.md
│   │   ├── references/
│   │   └── evals/
│   ├── managing-agent/
│   ├── managing-policies/
│   ├── managing-private-keys/
│   ├── managing-users/
│   ├── managing-wallets/
│   ├── monitoring-activities/
│   ├── provisioning-agent/
│   └── signing-transactions/
│       ├── SKILL.md
│       ├── references/                   # Chain-specific examples (EVM, Solana, Bitcoin)
│       └── evals/
├── examples/                             # Runnable TypeScript SDK demos
│   ├── wallet-management.ts
│   ├── ethereum-ethers.ts
│   ├── ethereum-viem.ts
│   ├── solana-signing.ts
│   └── bitcoin-signing.ts
├── legacy-skills/                        # Archived SDK-based skills
└── tests/
    ├── skill-structure.test.ts           # Layer 1: frontmatter + sections
    ├── code-blocks.test.ts               # Layer 2: syntax checking
    ├── reference-compiles.test.ts        # Layer 3: type-checking (.ts refs)
    └── evals.test.ts                     # Layer 4: assertion grading
` ` `
```

**Important:** The triple backticks above are shown with spaces (` ` `) to avoid breaking the plan's own markdown. When writing the actual file, use normal triple backticks (no spaces).

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for new flat API-first skill structure"
```

---

### Task 6: Update `.claude-plugin/plugin.json`

**Files:**
- Modify: `.claude-plugin/plugin.json`

- [ ] **Step 1: Update description**

Replace the contents of `.claude-plugin/plugin.json` with:

```json
{
  "name": "turnkey",
  "version": "1.0.0",
  "description": "AI agent skills for Turnkey wallet infrastructure: wallets, signing, users, policies, and agent provisioning across 13+ blockchains.",
  "skills": "./skills/"
}
```

- [ ] **Step 2: Commit**

```bash
git add .claude-plugin/plugin.json
git commit -m "docs: update plugin description for new skill scope"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: 0 failures, all tests pass.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No type errors.

- [ ] **Step 3: Verify no regressions**

Run: `npm run check`
Expected: Clean pass.
