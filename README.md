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
Please read skills/core/wallet-management/SKILL.md and create a wallet for me.
```

**OpenClaw** — copy skill directories into `~/.openclaw/workspace/skills/` and refresh the gateway. Each `SKILL.md` is automatically indexed.

**OpenAI** — paste the contents of a `SKILL.md` into your assistant's system prompt, or upload it as a knowledge file in the Assistants API.

## Skills

### Core

| Skill | Path | Description |
|-------|------|-------------|
| Wallet Management | `skills/core/wallet-management/` | Create wallets, derive addresses, manage accounts |
| Transaction Signing | `skills/core/transaction-signing/` | Stamping overview; directs to chain-specific skills |

### Signing

| Skill | Path | Description |
|-------|------|-------------|
| Ethereum / EVM | `skills/signing/ethereum-evm/` | EVM signing with ethers.js or viem — pick based on your stack |
| Solana | `skills/signing/solana-signing/` | Solana signing with `@turnkey/solana` |

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

Each skill includes test cases in `skills/<category>/<skill-name>/evals/evals.json`. To run them, spawn two agents per eval — one with the skill loaded, one without — then grade the outputs against the assertions.

**With-skill run** (give the agent skill context):
```
Read skills/<category>/<skill-name>/SKILL.md and any files in its references/ directory.
Task: <eval prompt>
Write your solution to: evals-workspace/iteration-1/<eval-name>/with_skill/outputs/solution.ts
```

**Without-skill run** (baseline, no skill context):
```
Task: <eval prompt>
Write your solution to: evals-workspace/iteration-1/<eval-name>/without_skill/outputs/solution.ts
Do not read any files in this repository.
```

**Grading** — compare each output against the assertions in `evals.json`. Key things to check:
- Correct `TURNKEY_`-prefixed env var names
- `signRawPayload` uses the flat shape (`signWith`, `payload`, `encoding`, `hashFunction` at the top level alongside `organizationId`) — no `parameters: { ... }` wrapper; response fields `r`, `s`, `v` are directly on the response object
- Wallet management checks for existing wallet before creating (`getWallets` before `createWallet`)
- Correct packages imported for the target chain

Eval run outputs are gitignored (`evals-workspace/`). Only `evals/evals.json` is committed.

## Adding New Skills

1. Create `skills/<category>/<skill-name>/SKILL.md`
2. Start with the standard frontmatter:
   ```yaml
   ---
   name: skill_identifier
   version: "1.0.0"
   description: One-sentence description for skill discovery
   tags: ["turnkey", "relevant-tag", "another-tag"]
   compatibility: "Runtime requirements and required env vars"
   ---
   ```
3. Include these sections: **Overview**, **Prerequisites**, **Environment Variables**, **Instructions**, **Code Examples**, **Error Handling**, **Related Skills**
4. Add a runnable example to `examples/<skill-name>.ts`
5. If the skill involves signing, add a reference in `skills/core/transaction-signing/SKILL.md`
6. Update this README's skill table

## Project Structure

```
turnkey-agent-skills/
├── README.md
├── skills/
│   ├── core/
│   │   ├── wallet-management/
│   │   │   └── SKILL.md          # Create wallets, derive addresses
│   │   └── transaction-signing/
│   │       └── SKILL.md          # Stamping overview + chain routing
│   └── signing/
│       ├── ethereum-evm/
│       │   └── SKILL.md          # EVM signing (ethers.js + viem)
│       └── solana-signing/
│           └── SKILL.md          # @turnkey/solana integration
└── examples/
    ├── wallet-management.ts      # Bootstrap: create wallet, get addresses
    ├── ethereum-ethers.ts        # Send ETH on Sepolia via ethers.js
    ├── ethereum-viem.ts          # Send ETH on Sepolia via viem
    └── solana-signing.ts         # Send SOL on devnet
```
