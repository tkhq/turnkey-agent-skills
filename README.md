# Turnkey Agent Skills

Agent skills that teach AI assistants how to use [Turnkey](https://turnkey.com) for wallet management, transaction signing, authentication, and access control. Skills are structured markdown files that AI assistants load contextually to provide accurate, up-to-date guidance for Turnkey development. Built following the [Agent Skills open standard](https://agentskills.io/specification).

For more on Turnkey, see the [Turnkey documentation](https://docs.turnkey.com).

## Before You Start

Check your environment variables. If `TURNKEY_API_PUBLIC_KEY` is unset, start with the `managing-users-api` skill to generate API keys, then use `managing-wallets-api` to create your first wallet.

## How These Skills Get Used

### AI-assisted administrator

A human using Claude Code with their own API key to manage a Turnkey organization.

- Root key is fine here, the human owns the org
- The assistant should confirm before destructive operations (policy deletion, quorum changes, user removal)
- The assistant should explain what an action will do before executing it

### Autonomous agent

An agent operating with a scoped API key inside a sub-organization.

- Should not have a root key
- Permissions come from policies (deny-by-default)
- Use `managing-policies-api` and `managing-organizations-api` to set up scoped access, policies, and hardened quorum before giving an agent access

## Skill Routing

| User asks about... | Skill to load |
|---|---|
| Getting started, no API key yet | `managing-users-api` |
| Creating or managing HD wallets | `managing-wallets-api` |
| Standalone private keys or key tags | `managing-private-keys-api` |
| Signing or broadcasting transactions | `signing-transactions-api` |
| Checking balances or nonces | `signing-transactions-api` |
| Sponsored or gasless transactions | `signing-transactions-api` |
| Access control, spending limits, allowlists | `managing-policies-api` |
| Smart contract ABIs for policy engine | `managing-policies-api` |
| Why a transaction was denied | `managing-policies-api` |
| Pending approvals, activity status | `monitoring-activities-api` |
| Creating users, API keys, key rotation | `managing-users-api` |
| Sub-organizations, multi-tenancy | `managing-organizations-api` |
| Root quorum or org feature flags | `managing-organizations-api` |
| Building a new skill for this repo | `creating-skills` |

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

### Primitives (Turnkey HTTP API)

7 skills covering 78 endpoints at `https://api.turnkey.com`.

| Skill | Endpoints | Description |
|-------|-----------|-------------|
| `managing-wallets-api` | 13 | HD wallet creation, account derivation, import/export |
| `managing-private-keys-api` | 11 | Standalone private keys, tags for policy targeting |
| `signing-transactions-api` | 10 | Signing, sponsored broadcasts, balance/nonce queries |
| `managing-policies-api` | 12 | Policy CRUD, smart contract interfaces, evaluation debugging |
| `monitoring-activities-api` | 5 | Activity lifecycle, consensus approval, audit trails |
| `managing-users-api` | 18 | User lifecycle, API keys, user tags |
| `managing-organizations-api` | 9 | Sub-orgs, root quorum, org features |

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
    creating-skills/              # Meta skill for contributors
  template/                       # Skeleton for new skills
```

Each skill contains:
- `SKILL.md` - Main instructions with YAML frontmatter (loaded when skill triggers)
- `references/` - Detailed code examples (loaded on demand)
- `evals/` - Trigger tests and functional evaluations

## License

[Apache 2.0](LICENSE)
