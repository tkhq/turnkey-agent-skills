# Turnkey Agent Skills

A collection of AI agent skills for [Turnkey](https://turnkey.com) — the wallet infrastructure platform that manages cryptographic keys in hardware-backed secure enclaves.

These skills enable AI agents to autonomously create wallets, derive addresses, sign transactions, and authenticate users across multiple blockchains. Compatible with **Claude Code**, **OpenClaw**, and **OpenAI** assistants.

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
Please read skills/core/turnkey-wallet-management/SKILL.md and create a wallet for me.
```

Point your agent at the root `SKILL.md` when you're not sure which skill you need — it will route to the right one.

### Codex

Install all skills from GitHub:
```
npx add-skill turnkey/turnkey-agent-skills
```

Then invoke skills by name:
```
$turnkey-wallet-management
$turnkey-ethereum-evm
```

### OpenClaw

Install from ClawHub (when published):
```
clawhub install turnkey
```

Or copy skill directories manually:
```bash
cp -r skills/ ~/.openclaw/workspace/skills/
```

Each `SKILL.md` is automatically indexed by the OpenClaw gateway.

### OpenAI Assistants

Paste the contents of a `SKILL.md` into your assistant's system prompt, or upload it as a knowledge file in the Assistants API. For multi-skill tasks, include the root `SKILL.md` as context so the assistant knows the full skill set.

### Skill load order

For multi-step tasks, skills should be loaded in a specific order. The root [`SKILL.md`](SKILL.md) documents this in detail, but the summary is:

- **Signing** — wallet management → transaction signing → chain-specific skill (e.g. `turnkey-ethereum-evm`)
- **Wallet only** — just `turnkey-wallet-management`
- **Authentication** — just `turnkey-otp-auth` (it depends on wallet management internally)

Agents that load the root `SKILL.md` first will follow this order automatically.

## Skills

### Core

| Skill | Path | Description |
|-------|------|-------------|
| Wallet Management | `skills/core/turnkey-wallet-management/` | Create wallets, derive addresses, manage accounts |
| Transaction Signing | `skills/core/turnkey-transaction-signing/` | Stamping overview; directs to chain-specific skills |

### Signing

| Skill | Path | Description |
|-------|------|-------------|
| Ethereum / EVM | `skills/signing/turnkey-ethereum-evm/` | EVM signing with ethers.js or viem — pick based on your stack |
| Solana | `skills/signing/turnkey-solana-signing/` | Solana signing with `@turnkey/solana` |
| Bitcoin | `skills/signing/turnkey-bitcoin-signing/` | Bitcoin signing with bitcoinjs-lib (P2WPKH + P2TR) |

### Auth

| Skill | Path | Description |
|-------|------|-------------|
| OTP Authentication | `skills/auth/turnkey-otp-auth/` | Email OTP login with sub-organization management |

### Meta

| Skill | Path | Description |
|-------|------|-------------|
| Skill Making | `skills/meta/turnkey-skill-making/` | Guide for creating new skills — conventions, validation, evals |

## Running Examples

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
