# Turnkey Agent Skills

A collection of AI agent skills for [Turnkey](https://turnkey.com) — the wallet infrastructure platform that manages cryptographic keys in hardware-backed secure enclaves.

These skills enable AI agents to autonomously create wallets, derive addresses, and sign transactions across multiple blockchains. Compatible with **Claude Code**, **OpenClaw**, and **OpenAI** assistants.

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

**Claude Code** — reference any `SKILL.md` directly in your prompt:
```
Please read skills/core/turnkey-wallet-management/SKILL.md and create a wallet for me.
```

**OpenClaw** — copy skill directories into `~/.openclaw/workspace/skills/` and refresh the gateway. Each `SKILL.md` is automatically indexed.

**OpenAI** — paste the contents of a `SKILL.md` into your assistant's system prompt, or upload it as a knowledge file in the Assistants API.

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

## Running Examples

```bash
# Install dependencies
npm install @turnkey/http @turnkey/api-key-stamper @turnkey/ethers @turnkey/viem @turnkey/solana ethers viem @solana/web3.js

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your API_PUBLIC_KEY, API_PRIVATE_KEY, ORGANIZATION_ID

# Run an example (requires ts-node or tsx)
npx tsx examples/wallet-management.ts
npx tsx examples/ethereum-ethers.ts   # or ethereum-viem.ts
npx tsx examples/ethereum-viem.ts
npx tsx examples/solana-signing.ts
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

1. Create `skills/<category>/<skill-name>/SKILL.md`
2. Start with the standard frontmatter:
   ```yaml
   ---
   name: my-skill-name
   version: "1.0.0"
   description: One-sentence description for skill discovery
   tags: ["turnkey", "relevant-tag", "another-tag"]
   compatibility: "Runtime requirements and required env vars"
   ---
   ```
3. Include these sections: **Overview**, **Prerequisites**, **Environment Variables**, **Instructions**, **Code Examples**, **Error Handling**, **Related Skills**
4. Add a runnable example to `examples/<skill-name>.ts`
5. If the skill involves signing, add a reference in `skills/core/turnkey-transaction-signing/SKILL.md`
6. Update this README's skill table

## Project Structure

```
turnkey-agent-skills/
├── README.md
├── skills/
│   ├── core/
│   │   ├── turnkey-wallet-management/
│   │   │   └── SKILL.md          # Create wallets, derive addresses
│   │   └── turnkey-transaction-signing/
│   │       └── SKILL.md          # Stamping overview + chain routing
│   └── signing/
│       ├── turnkey-ethereum-evm/
│       │   └── SKILL.md          # EVM signing (ethers.js + viem)
│       ├── turnkey-solana-signing/
│       │   └── SKILL.md          # @turnkey/solana integration
│       └── turnkey-bitcoin-signing/
│           └── SKILL.md          # Bitcoin signing (P2WPKH + P2TR)
└── examples/
    ├── wallet-management.ts      # Bootstrap: create wallet, get addresses
    ├── ethereum-ethers.ts        # Send ETH on Sepolia via ethers.js
    ├── ethereum-viem.ts          # Send ETH on Sepolia via viem
    └── solana-signing.ts         # Send SOL on devnet
```
