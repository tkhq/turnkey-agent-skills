# Contributing

This guide covers how to add new skills, run the eval harness, and validate your changes. If you're just trying to *use* the skills, see the [README](README.md).

## Running Evals

Each skill includes test cases in `skills/<category>/<skill-name>/evals/evals.json`. The automated eval runner discovers all evals, sends them through an LLM (with and without skill context), grades the output against assertions, and prints a summary.

```bash
# Run all evals with Claude (default provider)
npm run evals

# Run evals for a specific skill
npm run evals -- --skill turnkey-ethereum-evm

# Run a single eval
npm run evals -- --skill turnkey-wallet-management --eval 1

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

## Adding New Skills

### Option A — Use the skill-making skill (recommended)

If you're using an AI agent (Claude Code, etc.), load the skill-making guide and let it handle the structure for you:

```
Please read skills/meta/turnkey-skill-making/SKILL.md and create a new skill for <your description>.
```

The skill-making guide covers the full lifecycle: directory layout, frontmatter rules, required sections, reference examples, evals, and validation. The test suite enforces all conventions automatically.

### Option B — Manual

1. **Choose a category and create the directory:**

   | Category | Path | Use for |
   |----------|------|---------|
   | Core | `skills/core/<name>/` | Foundational capabilities (wallets, signing model) |
   | Signing | `skills/signing/<name>/` | Chain-specific transaction signing |
   | Auth | `skills/auth/<name>/` | Authentication flows (OTP, OAuth, passkeys) |
   | Meta | `skills/meta/<name>/` | Tooling and skill-authoring guides |

2. **Create `SKILL.md`** with the required frontmatter:
   ```yaml
   ---
   name: turnkey-your-skill-name
   description: 'Single-line description of what this skill does and when to use it.'
   compatibility: "Runtime requirements and required env vars."
   depends_on:
     - turnkey-wallet-management
   metadata:
     version: "1.0.0"
     tags: ["turnkey", "your-tag-here"]
     sdk_versions:
       "@turnkey/sdk-server": "^5.1.0"
   ---
   ```
   The `name` field must match the directory name exactly.

3. **Include these required sections:** Overview, Prerequisites, Environment Variables, Instructions (or Examples, or Option A/Option B), Troubleshooting, Related Skills.

4. **Add reference examples** in `references/`. Each TypeScript code block must be fully self-contained (all imports and setup) — these are type-checked by the test suite.

5. **Add evals** in `evals/evals.json`. Include `compiles` assertions to catch real type errors. See `skills/meta/turnkey-skill-making/SKILL.md` for the full assertion reference.

6. **Validate:**
   ```bash
   npm test        # structure, syntax, type-checking, evals
   npm run check   # typecheck + tests
   ```

## Project Structure

```
turnkey-agent-skills/
├── README.md
├── CONTRIBUTING.md
├── SKILL.md                              # Root skill index
├── skills/
│   ├── core/
│   │   ├── turnkey-wallet-management/
│   │   │   ├── SKILL.md                  # Create wallets, derive addresses
│   │   │   ├── references/
│   │   │   └── evals/
│   │   └── turnkey-transaction-signing/
│   │       ├── SKILL.md                  # Stamping overview + chain routing
│   │       ├── references/
│   │       └── evals/
│   ├── signing/
│   │   ├── turnkey-ethereum-evm/
│   │   │   ├── SKILL.md                  # EVM signing (ethers.js + viem)
│   │   │   ├── references/
│   │   │   └── evals/
│   │   ├── turnkey-solana-signing/
│   │   │   ├── SKILL.md                  # @turnkey/solana integration
│   │   │   ├── references/
│   │   │   └── evals/
│   │   └── turnkey-bitcoin-signing/
│   │       ├── SKILL.md                  # Bitcoin signing (P2WPKH + P2TR)
│   │       ├── references/
│   │       └── evals/
│   ├── auth/
│   │   └── turnkey-otp-auth/
│   │       ├── SKILL.md                  # Email OTP login + sub-orgs
│   │       ├── references/
│   │       └── evals/
│   └── meta/
│       └── turnkey-skill-making/
│           ├── SKILL.md                  # Guide for creating new skills
│           └── references/
├── examples/
│   ├── wallet-management.ts
│   ├── ethereum-ethers.ts
│   ├── ethereum-viem.ts
│   ├── solana-signing.ts
│   └── bitcoin-signing.ts
└── tests/
    ├── skill-structure.test.ts           # Layer 1: frontmatter + sections
    ├── code-blocks.test.ts               # Layer 2: syntax checking
    ├── reference-compiles.test.ts        # Layer 3: full type-checking
    └── evals.test.ts                     # Layer 4: assertion grading
```
