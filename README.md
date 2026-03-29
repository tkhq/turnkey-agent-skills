# Turnkey Agent Skills

Agent skills that teach AI assistants how to use [Turnkey](https://turnkey.com) to manage wallets, sign transactions, and author rules in Turnkey's policy engine.

These skills serve two personas: humans using AI tools to administer their Turnkey organization, and autonomous agents operating with scoped, policy-constrained wallet access.

Built following the [Agent Skills open standard](https://agentskills.io/specification). For more on Turnkey, see the [Turnkey documentation](https://docs.turnkey.com).

## How These Skills Get Used

### AI-assisted administrator

A human using Claude Code with their own API key to manage a Turnkey organization — set policies, make wallets, and manage users.

- You can provide Claude with your root-user or personal API key.
- The assistant should confirm before destructive operations (policy deletion, quorum changes, user removal)
- The assistant should explain what an action will do before executing it

### Autonomous agent

An agent operating with a scoped API key, typically using a Turnkey wallet to transact.

- Should not have a root key — instead, should use an API key which is tightly scoped. For example, the autonomous agent should not have permissions to change policies.
- Permissions come from policies (deny-by-default)
- If you have been using an AI assistant to manage your Turnkey organization, use `agentic-wallet-workflow` to set up an agentic wallet from scratch. The workflow creates a wallet, non-root agent user, and least-privilege policies — then outputs scoped API credentials for the admin to inject into the agent's runtime.
- The workflow applies one of two personas that control what the agent can do:
  - **Worker** (default) — can sign transactions, nothing else. Use for trading bots, payment processors, DeFi agents.
  - **Observer** — read-only. Use for dashboards, compliance monitoring, balance tracking.
- See [agent personas reference](skills/agentic-wallet-workflow/references/agent-personas.md) for the complete policy templates behind each persona.

### ⚠️ Safety Warning

> [!CAUTION]
> **These skills control access to real wallets holding real funds.** A misconfigured policy or overly broad permission can allow an agent to irreversibly send funds. AI-generated policy conditions can contain subtle errors that pass validation but create unintended access.

These skills instruct the AI assistant to stop and confirm with the human before creating, updating, or deleting any policy. However, the human is solely responsible for:

- **Reviewing every policy** before it is submitted. Do not approve policies you do not fully understand.
- **Keeping ALLOW policies narrow.** Turnkey denies everything by default — each ALLOW policy you add is an exception. Broad exceptions (wide address allowlists, high spending limits) compound risk.
- **Verifying the full policy set** after changes. Individual policies may be correct but combine to produce unintended behavior (e.g., a broad ALLOW that overrides a narrow DENY, or missing coverage for a resource type).

These skills are tools, not substitutes for human judgment on security-critical decisions.

## Before You Start

All skills require Turnkey API credentials. If you are an **AI-assisted administrator**, set them in your environment:

```env
TURNKEY_API_PUBLIC_KEY=    # API key public component (hex)
TURNKEY_API_PRIVATE_KEY=   # API key private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Organization UUID
```

If you don't have credentials yet, use `getting-started-workflow` to walk through account setup, API key generation, and creating your first wallet.

To set up an autonomous agent, you'll use these same credentials to run `agentic-wallet-workflow`, which generates a separate set of scoped credentials for the agent.

## Skill Routing

| User asks about... | Skill to load |
|---|---|
| Getting started, first wallet, new to Turnkey | `getting-started-workflow` |
| Setting up an agent wallet with scoped access | `agentic-wallet-workflow` |
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
| Root quorum or org feature flags | `managing-organizations-api` |

## Quick Start

### Claude Code

```bash
git clone https://github.com/tkhq/turnkey-agent-skills.git
cd turnkey-agent-skills
```

Then start Claude Code from the repo directory. Skills are automatically discovered from the `skills/` folder.

### Adding to an existing project

Copy the skill folders you need into your project's `.claude/skills/` directory:

```bash
cp -r turnkey-agent-skills/skills/managing-wallets-api your-project/.claude/skills/
```

## Skills

### Primitives (Turnkey HTTP API)

| Skill | Description |
|-------|-------------|
| `managing-wallets-api` | HD wallet creation, account derivation, import/export |
| `managing-private-keys-api` | Standalone private keys, tags for policy targeting |
| `signing-transactions-api` | Signing, sponsored broadcasts, balance/nonce queries |
| `managing-policies-api` | Policy CRUD, smart contract interfaces, evaluation debugging |
| `monitoring-activities-api` | Activity lifecycle, consensus approval, audit trails |
| `managing-users-api` | User lifecycle, API keys, user tags |
| `managing-organizations-api` | Root quorum, org features |

### Workflows (multi-step orchestration)

Compose multiple primitives into end-to-end guides.

| Skill | Description |
|-------|-------------|
| `getting-started-workflow` | Day-0 onboarding: verify credentials, create first wallet, sign first transaction |
| `agentic-wallet-workflow` | Give an AI agent scoped wallet access: wallet, policies, credentials |

Each skill folder contains:
- `SKILL.md` — main instructions with YAML frontmatter (loaded when skill triggers)
- `references/` — detailed code examples (loaded on demand)

## License

[Apache 2.0](LICENSE)