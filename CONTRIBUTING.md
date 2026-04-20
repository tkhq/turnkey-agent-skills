# Contributing

This guide covers how to add new skills, run the eval harness, and validate your changes. If you're just trying to *use* the skills, see the [README](README.md).

## Running Evals

Each skill includes test cases in `skills/<skill-name>/evals/evals.json`. The automated eval runner discovers all evals, sends them through an LLM (with and without skill context), grades the output against assertions, and prints a summary.

```bash
# Run all evals with Claude (default provider)
npm run evals

# Run evals for a specific skill
npm run evals -- --skill signing-transactions

# Run a single eval
npm run evals -- --skill managing-wallets --eval 1

# Also run a baseline without skill context for comparison
npm run evals -- --without-skill

# Use OpenAI instead of Claude (requires OPENAI_API_KEY)
npm run evals -- --provider openai --model gpt-4o

# Use a custom command as the LLM provider
npm run evals -- --provider custom --command "llm prompt -m claude-3.5-sonnet"

# Other options
npm run evals -- --concurrency 2    # limit parallel runs (default: 4)
npm run evals -- --dry-run           # print prompts without executing
npm run evals -- --verbose           # print full LLM responses
```

The runner extracts the largest TypeScript code block from each response, runs the assertions from `evals.json` against it, and writes results to `evals-workspace/report.json`. Generated solutions are saved to `evals-workspace/<skill-name>/eval-<id>/solution.ts`.

After running evals, `npm test` will grade any solutions in `evals-workspace/` against their assertions.

Eval outputs are gitignored (`evals-workspace/`). Only `evals/evals.json` definitions are committed.

## Adding a New Skill

Skills live directly under `skills/` in a flat layout — no category subdirectories. Follow these steps:

1. **Choose a name.** Use a short, verb-based kebab-case name that reads as an action (e.g. `managing-wallets`, `signing-transactions`, `monitoring-activities`). The directory name and the `name` field in the frontmatter must match exactly.

2. **Create the directory:** `skills/<your-skill-name>/`.

3. **Create `SKILL.md`** with the required frontmatter:

   ```yaml
   ---
   name: your-skill-name
   description: "Single-line description of what this skill does and when to use it."
   license: Apache-2.0
   compatibility: "Runtime requirements and required env vars."
   metadata:
     version: "1.0.0"
     author: turnkey
     tags: "space separated tags"
   ---
   ```

   The `name` must match the directory name exactly.

4. **Include these required sections:** Overview, Prerequisites, Environment Variables, Instructions (or Examples), Troubleshooting, Related Skills.

5. **Add reference examples** in `references/`. Each TypeScript code block must be fully self-contained (all imports and setup) — these are type-checked by the test suite (`tests/reference-compiles.test.ts`).

6. **Add evals** in `evals/evals.json`. Include `compiles` assertions to catch real type errors. Look at an existing skill's `evals.json` (for example `skills/managing-wallets/evals/evals.json`) for the assertion reference.

7. **Validate:**
   ```bash
   npm test        # structure, syntax, type-checking, evals
   npm run check   # typecheck + tests
   ```

8. **Register the skill in the root [`SKILL.md`](SKILL.md)** under the appropriate section (Workflows or Primitives) so it's discoverable.

## Project Structure

```
turnkey-agent-skills/
├── README.md
├── CONTRIBUTING.md
├── SKILL.md                              # Root skill index
├── skills/
│   ├── getting-started/                  # Onboarding workflow
│   ├── provisioning-agent/               # Create a scoped agent
│   ├── managing-agent/                   # Debug / rotate / revoke an agent
│   ├── managing-wallets/                 # HD wallets, addresses, chains
│   ├── managing-private-keys/            # Standalone keys, key tags
│   ├── signing-transactions/             # Sign & broadcast on any chain
│   ├── managing-users/                   # Users, API keys, user tags
│   ├── managing-policies/                # Access control, spending limits
│   └── monitoring-activities/            # Activity status, approvals, audit
├── examples/                             # Runnable SDK demos (tsx)
│   ├── wallet-management.ts
│   ├── ethereum-ethers.ts
│   ├── ethereum-viem.ts
│   ├── solana-signing.ts
│   └── bitcoin-signing.ts
├── scripts/
│   └── run-evals.ts                      # Eval runner entry point
└── tests/
    ├── skill-structure.test.ts           # Layer 1: frontmatter + sections
    ├── code-blocks.test.ts               # Layer 2: syntax checking
    ├── reference-compiles.test.ts        # Layer 3: full type-checking
    ├── evals.test.ts                     # Layer 4: assertion grading
    ├── plugin-dir.test.ts                # Plugin packaging checks
    ├── grader.ts                         # Assertion runner
    └── helpers.ts                        # Shared test utilities
```

Each skill directory contains:

```
skills/<skill-name>/
├── SKILL.md                              # Frontmatter + instructions
├── references/                           # Self-contained code examples
└── evals/
    └── evals.json                        # Test cases + assertions
```
