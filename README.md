# Turnkey Agent Skills

Agent skills that teach AI assistants how to use [Turnkey](https://turnkey.com) for wallet management, transaction signing, authentication, and access control. Skills are structured markdown files that AI assistants load contextually to provide accurate, up-to-date guidance for Turnkey development. Built following the [Agent Skills open standard](https://agentskills.io/specification).

For more on Turnkey, see the [Turnkey documentation](https://docs.turnkey.com).

## Prerequisites

- **Node.js >= 18** (for SDK skills and eval tooling)
- **Turnkey account** with API credentials from the [Turnkey Dashboard](https://app.turnkey.com)
- **Turnkey CLI** (optional, for CLI/API skills): `brew install tkhq/tap/turnkey`

## Quick Start

### Claude Code

```bash
git clone https://github.com/tkhq/turnkey-agent-skills.git
cd turnkey-agent-skills
npm install  # installs eval/validation tooling
```

Then start Claude Code from the repo directory. Skills are automatically discovered from the `skills/` folder.

### Adding to an existing project

Copy the skill folders you need into your project's `.claude/skills/` directory:

```bash
cp -r turnkey-agent-skills/skills/creating-wallets-sdk your-project/.claude/skills/
```

## Skills

Skills are organized into three categories based on how they interact with Turnkey.

### SDK Skills (TypeScript, `@turnkey/sdk-server`)

Use these when building applications with the Turnkey TypeScript SDK.

| Skill | Description |
|-------|-------------|
| `authenticating-users-sdk` | Email OTP, SMS, OAuth, passkeys, and WebAuthn authentication for React apps |
| `creating-wallets-sdk` | HD wallet creation, multi-chain address derivation, import/export |
| `signing-transactions-sdk` | Transaction signing across 12+ chains (EVM, Solana, Bitcoin, Cosmos, Sui, TON, TRON) |
| `managing-policies-sdk` | Policy engine for spending limits, address allowlists, and multi-sig approval |

### CLI/API Skills (`turnkey` CLI)

Use these when working with the Turnkey CLI or calling the HTTP API directly.

| Skill | Description |
|-------|-------------|
| `managing-credentials-api` | API key generation, user provisioning, sub-organization setup |
| `creating-wallets-api` | Wallet creation and address derivation via CLI commands |
| `signing-transactions-api` | Transaction signing and broadcasting via CLI |
| `managing-policies-api` | Policy CRUD and governance via CLI |

### Workflow Skills (multi-step orchestration)

Use these for end-to-end guides that compose multiple primitive skills.

| Skill | Description |
|-------|-------------|
| `setup-account-workflow` | Bootstrap a Turnkey org from zero: CLI install, API keys, wallets, first signature |
| `embedded-wallets-workflow` | Build a React app with user auth, wallets, signing, and policies (sub-org model) |
| `server-wallets-workflow` | Build a Node.js backend with server wallets, signing, and policies (parent org model) |
| `wallet-governance-workflow` | Add governance, policies, scoped users, and root quorum hardening for production |

### Meta

| Skill | Description |
|-------|-------------|
| `creating-skills` | For contributors: create, evaluate, and improve Turnkey agent skills |

### Choosing between SDK and CLI skills

- **SDK skills** (`-sdk` suffix) use `@turnkey/sdk-server` in TypeScript. Best for application development.
- **CLI/API skills** (`-api` suffix) use the `turnkey` CLI tool. Best for bootstrapping, scripting, and ad-hoc operations.
- **Workflow skills** (`-workflow` suffix) compose multiple primitive skills into step-by-step guides for common end-to-end scenarios.

## Environment Setup

All skills require Turnkey API credentials. Get them from the [Turnkey Dashboard](https://app.turnkey.com) under **Settings > API Keys**.

```bash
cp .env.example .env
# Edit .env with your credentials
```

```env
TURNKEY_API_PUBLIC_KEY=    # API key public component (hex)
TURNKEY_API_PRIVATE_KEY=   # API key private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Organization UUID
SIGN_WITH=                 # Address or public key of the wallet account to sign with
```

SDK skills read these via `process.env.TURNKEY_API_PUBLIC_KEY`, etc. CLI skills use shell variables (`$ORGANIZATION_ID`).

## Creating Your Own Skills

Use the `creating-skills` skill to build new skills with eval-driven development:

```
Create a new skill for Cosmos chain signing
```

Or follow the manual workflow:

1. Copy `template/` to `skills/your-skill-name/`
2. Edit `SKILL.md` with frontmatter and instructions
3. Add code examples in `references/`
4. Write evals in `evals/evals.json` and `evals/triggers.json`
5. Validate: `npm run validate -- skills/your-skill-name`

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

## Running Evals

```bash
# Validate all skills
npm run validate

# Test trigger accuracy for a skill
npm run eval -- --skill creating-wallets-sdk

# Run improvement loop
npm run eval:loop -- --skill creating-wallets-sdk

# Generate HTML report
npm run report -- --skill creating-wallets-sdk
```

## Project Structure

```
turnkey-agent-skills/
  skills/
    authenticating-users-sdk/     # Auth flows (OTP, OAuth, passkeys) via SDK
    creating-wallets-sdk/         # Wallet creation via SDK
    signing-transactions-sdk/     # Transaction signing via SDK (12+ chains)
    managing-policies-sdk/        # Policy management via SDK
    creating-wallets-api/         # Wallet creation via CLI
    signing-transactions-api/     # Transaction signing via CLI
    managing-policies-api/        # Policy management via CLI
    managing-credentials-api/     # API keys, users, sub-orgs via CLI
    setup-account-workflow/       # Organization bootstrapping
    embedded-wallets-workflow/    # React embedded wallet guide
    server-wallets-workflow/      # Node.js server wallet guide
    wallet-governance-workflow/      # Governance, policies, and access control
    creating-skills/              # Meta skill for contributors
  template/                       # Skeleton for new skills
```

Each skill contains:
- `SKILL.md` - Main instructions with YAML frontmatter (loaded when skill triggers)
- `references/` - Detailed code examples (loaded on demand)
- `evals/` - Trigger tests and functional evaluations

## License

[Apache 2.0](LICENSE)
