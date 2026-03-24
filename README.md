# Turnkey Agent Skills

Agent skills that teach AI assistants how to use [Turnkey](https://turnkey.com) for wallet management, transaction signing, authentication, and access control. Skills are structured markdown files that AI assistants load contextually to provide accurate, up-to-date guidance for Turnkey development. Built following the [Agent Skills open standard](https://agentskills.io/specification).

For more on Turnkey, see the [Turnkey documentation](https://docs.turnkey.com).

## Prerequisites

- **Node.js >= 18** (for eval tooling)
- **Turnkey account** with API credentials from the [Turnkey Dashboard](https://app.turnkey.com)
- **Turnkey CLI**: `brew install tkhq/tap/turnkey`

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
cp -r turnkey-agent-skills/skills/creating-wallets-api your-project/.claude/skills/
```

## Skills

### CLI/API Skills (`turnkey` CLI)

Use the Turnkey CLI or call the HTTP API directly.

| Skill | Description |
|-------|-------------|
| `managing-credentials-api` | API key generation, user provisioning, sub-organization setup |
| `creating-wallets-api` | Wallet creation and address derivation via CLI commands |
| `signing-transactions-api` | Transaction signing and broadcasting via CLI |
| `managing-policies-api` | Policy CRUD and governance via CLI |

### Workflow Skills (multi-step orchestration)

End-to-end guides that compose multiple primitive skills.

| Skill | Description |
|-------|-------------|
| `setup-account-workflow` | Bootstrap a Turnkey org from zero: CLI install, API keys, wallets, first signature |
| `wallet-governance-workflow` | Add governance, policies, scoped users, and root quorum hardening for production |

### Meta

| Skill | Description |
|-------|-------------|
| `creating-skills` | For contributors: create, evaluate, and improve Turnkey agent skills |

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

Skills use shell variables (`$ORGANIZATION_ID`) or read from `~/.config/turnkey/keys/`.

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
npm run eval -- --skill creating-wallets-api

# Run improvement loop
npm run eval:loop -- --skill creating-wallets-api

# Generate HTML report
npm run report -- --skill creating-wallets-api
```

## Project Structure

```
turnkey-agent-skills/
  skills/
    creating-wallets-api/         # Wallet creation via CLI
    signing-transactions-api/     # Transaction signing via CLI
    managing-policies-api/        # Policy management via CLI
    managing-credentials-api/     # API keys, users, sub-orgs via CLI
    setup-account-workflow/       # Organization bootstrapping
    wallet-governance-workflow/   # Governance, policies, and access control
    creating-skills/              # Meta skill for contributors
  template/                       # Skeleton for new skills
```

Each skill contains:
- `SKILL.md` - Main instructions with YAML frontmatter (loaded when skill triggers)
- `references/` - Detailed code examples (loaded on demand)
- `evals/` - Trigger tests and functional evaluations

## License

[Apache 2.0](LICENSE)
