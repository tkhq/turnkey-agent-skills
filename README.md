# Turnkey Agent Skills

A collection of AI agent skills for [Turnkey](https://turnkey.com) — the wallet infrastructure platform that manages cryptographic keys in hardware-backed secure enclaves.

These skills enable AI agents to autonomously create wallets, derive addresses, sign transactions, and manage users and policies across multiple blockchains. Compatible with **Claude Code** and other AI agent platforms.

## What is Turnkey?

Turnkey stores private keys in secure enclaves (AWS Nitro, etc.) — keys are **never exposed** to application code. Every API request is cryptographically "stamped" (signed with your API key pair) before being sent, ensuring only authorized callers can trigger operations on your keys.

## Environment Variables

All skills require these three variables:

```env
TURNKEY_API_PUBLIC_KEY=<your-api-public-key>
TURNKEY_API_PRIVATE_KEY=<your-api-private-key>
TURNKEY_ORGANIZATION_ID=<your-organization-id>
```

Get these from the [Turnkey console](https://app.turnkey.com) under **Settings → API Keys**. When you create an API key, you receive a P-256 public/private key pair. The organization ID is visible in the URL and settings page.

## Loading Skills

Each skill is a `SKILL.md` file — a structured prompt that teaches an AI agent how to perform a Turnkey operation. The root [`SKILL.md`](SKILL.md) is the master index: it lists every skill, explains when to use each one, and defines the load order for multi-step tasks.

### Claude Code

Install as a plugin so all skills are automatically discovered:
```
/plugin marketplace add turnkey/turnkey-agent-skills
/plugin install turnkey@turnkey-skills
```

Or reference skills directly in your prompt:
```
Please read SKILL.md and help me sign an Ethereum transaction.
Please read skills/managing-wallets/SKILL.md and create a wallet for me.
```

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

```bash
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
```

## Running Evals

Each skill includes test cases in `skills/<skill-name>/evals/evals.json`. The automated eval runner discovers all evals, sends them through an LLM, grades the output against assertions, and prints a summary.

```bash
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
```

## Adding New Skills

1. Create a directory under `skills/` with a kebab-case name matching the skill name.

2. Create `SKILL.md` with required frontmatter:
   ```yaml
   ---
   name: your-skill-name
   description: 'Single-line description of what this skill does.'
   compatibility: "Runtime requirements and required env vars."
   metadata:
     version: "1.0.0"
     tags: ["turnkey", "your-tag-here"]
   ---
   ```

3. Include required sections: at least one content section (Instructions, Examples, Phases, Steps, etc.), Troubleshooting, Related Skills, and Rules.

4. Add reference examples in `references/` as `.md` files with JSON or TypeScript code blocks.

5. Add evals in `evals/evals.json`.

6. Validate:
   ```bash
   npm test        # structure, syntax, type-checking, evals
   npm run check   # typecheck + tests
   ```

## Project Structure

```
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
```
