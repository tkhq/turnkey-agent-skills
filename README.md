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

> **⚠️ Security warning — these are root credentials**
>
> A root API key has full access to your Turnkey organization: creating wallets, signing transactions, managing users and policies. It bypasses all policies. Before giving these credentials to an AI agent, consider your use case:
>
> - **Interactive assistant** (human approves each action): root credentials can be acceptable for organization administration and testing.
> - **Autonomous agent** (acts without human review): **do not use root credentials.** Create scoped credentials with policies that limit what the agent can do — see [`skills/provisioning-agent/`](skills/provisioning-agent/SKILL.md).
>
> LLMs can misinterpret instructions or execute unintended actions. Scoped credentials ensure mistakes are bounded.

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

Install from ClawHub (when published, forthcoming):
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

## Contributing

Adding a new skill, running the eval harness, or exploring the project structure? See [CONTRIBUTING.md](CONTRIBUTING.md).
