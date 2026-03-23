# Turnkey Agent Skills

Agent skills that teach AI assistants how to use [Turnkey](https://turnkey.com) for wallet management, transaction signing, authentication, and access control. Built following the [Agent Skills open standard](https://agentskills.io/specification).

## Quick Start

### Claude Code (plugin marketplace)

```bash
/plugin marketplace add tkhq/turnkey-agent-skills
/plugin install turnkey-skills@turnkey-agent-skills
```

### Claude Code (local)

```bash
git clone https://github.com/tkhq/turnkey-agent-skills.git
cd turnkey-agent-skills
npm install
claude --plugin-dir .
```

### Claude.ai

1. Download a skill folder (e.g., `skills/creating-wallets/`)
2. Zip the folder
3. Upload via **Settings > Capabilities > Skills**

## Skills

| Skill | Description | Use when... |
|-------|-------------|-------------|
| `creating-wallets` | HD wallet creation and multi-chain address derivation | Setting up wallets, deriving addresses, listing existing wallets |
| `signing-ethereum` | EVM transaction signing with ethers.js or viem | Sending ETH, transferring tokens, signing messages on any EVM chain |
| `signing-solana` | Solana transaction signing | Sending SOL, transferring SPL tokens, signing Solana messages |
| `signing-bitcoin` | Bitcoin signing (P2WPKH SegWit, P2TR Taproot) | Sending BTC, building PSBTs, signing Bitcoin transactions |
| `managing-policies` | Policy engine for access control and governance | Adding spending limits, address allowlists, agent guardrails |
| `authenticating-users` | Email OTP, OAuth/OIDC, passkeys/WebAuthn | Adding login, signup, social auth, or passkey authentication |
| `creating-skills` | Meta skill for authoring and evaluating new skills | Building new skills, improving skill descriptions, running evals |

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
SIGN_WITH=                 # Address to sign with (for signing skills)
```

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
npm run eval -- --skill creating-wallets

# Run improvement loop
npm run eval:loop -- --skill creating-wallets

# Generate HTML report
npm run report -- --skill creating-wallets
```

## Project Structure

```
turnkey-agent-skills/
  skills/
    creating-wallets/          # Wallet creation and management
    signing-ethereum/          # EVM signing (ethers.js + viem)
    signing-solana/            # Solana signing
    signing-bitcoin/           # Bitcoin signing (SegWit + Taproot)
    managing-policies/         # Policy engine and access control
    authenticating-users/      # Auth flows (OTP, OAuth, passkeys)
    creating-skills/           # Meta skill + eval tooling
  template/                    # Skeleton for new skills
  .claude-plugin/              # Plugin marketplace config
```

Each skill contains:
- `SKILL.md` - Main instructions (loaded when skill triggers)
- `references/` - Detailed code examples (loaded on demand)
- `evals/` - Trigger tests and functional evaluations

## License

[Apache 2.0](LICENSE)
