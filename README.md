# Turnkey Agent Skills

Agent skills that teach AI assistants how to use [Turnkey](https://turnkey.com) for wallet management, transaction signing, authentication, and access control. Skills are structured markdown files that AI assistants load contextually to provide accurate, up-to-date guidance for Turnkey development. Built following the [Agent Skills open standard](https://agentskills.io/specification).

For more on Turnkey, see the [Turnkey documentation](https://docs.turnkey.com).

## Prerequisites

- **Node.js >= 18** (for eval tooling)
- **Turnkey account** with API credentials from the [Turnkey Dashboard](https://app.turnkey.com)
- **Turnkey API credentials** (P-256 key pair, see managing-users-api skill)

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
cp -r turnkey-agent-skills/skills/managing-wallets-api your-project/.claude/skills/
```

## Skills

### API Skills (Turnkey HTTP API)

Call the Turnkey HTTP API directly at `https://api.turnkey.com`.

| Skill | Description |
|-------|-------------|
| `managing-wallets-api` | HD wallet creation, account derivation, import/export via API |
| `managing-private-keys-api` | Standalone private key management, tags for policy targeting |
| `signing-transactions-api` | Transaction signing, sponsored broadcasts, balance/nonce queries |
| `managing-policies-api` | Policy CRUD, smart contract interfaces, policy evaluation debugging |
| `monitoring-activities-api` | Activity monitoring, consensus approval workflows, audit trails |
| `managing-users-api` | User lifecycle, API key management, user tags |
| `managing-organizations-api` | Sub-organization management, root quorum, org features |

### Workflow Skills (multi-step orchestration)

End-to-end guides that compose multiple primitive skills.

| Skill | Description |
|-------|-------------|
| `setup-account-workflow` | Bootstrap a Turnkey org from zero: API keys, wallets, first signature |
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

Skills reference these credentials in API request bodies.

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
npm run eval -- --skill managing-wallets-api

# Run improvement loop
npm run eval:loop -- --skill managing-wallets-api

# Generate HTML report
npm run report -- --skill managing-wallets-api
```

## Project Structure

```
turnkey-agent-skills/
  skills/
    managing-wallets-api/         # HD wallets and accounts (13 endpoints)
    managing-private-keys-api/    # Standalone keys and tags (11 endpoints)
    signing-transactions-api/     # Signing, broadcasting, queries (10 endpoints)
    managing-policies-api/        # Policies and smart contracts (12 endpoints)
    monitoring-activities-api/    # Activity lifecycle and consensus (5 endpoints)
    managing-users-api/           # Users, API keys, user tags (18 endpoints)
    managing-organizations-api/   # Orgs, sub-orgs, quorum (9 endpoints)
    setup-account-workflow/       # Organization bootstrapping
    wallet-governance-workflow/   # Governance and access control
    creating-skills/              # Meta skill for contributors
  docs/                           # API resource mapping and architecture
  template/                       # Skeleton for new skills
```

Each skill contains:
- `SKILL.md` - Main instructions with YAML frontmatter (loaded when skill triggers)
- `references/` - Detailed code examples (loaded on demand)
- `evals/` - Trigger tests and functional evaluations

## License

[Apache 2.0](LICENSE)
