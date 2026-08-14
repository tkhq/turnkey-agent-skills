# Turnkey Agent Skills

A collection of AI agent skills for [Turnkey](https://turnkey.com) — the wallet infrastructure platform that manages cryptographic keys in hardware-backed secure enclaves.

These skills enable AI agents to autonomously create wallets, derive addresses, sign transactions, and authenticate users across multiple blockchains. Compatible with **Claude Code**, **OpenAI**, and other third-party agent frameworks.
Use of these Skills is subject to Turnkey's Terms of Service. See also: [Shared Responsibility Model](https://docs.turnkey.com/security/shared-responsibility-model#turnkey-shared-responsibility-model).

## What is Turnkey?

Turnkey stores private keys in secure enclaves (AWS Nitro, etc.) — keys are **never exposed** to application code. Every API request is cryptographically "stamped" (signed with your API key pair) before being sent, ensuring only authorized callers can trigger operations on your keys.

For full documentation, please see our [docs site](https://docs.turnkey.com/home) or our [docs MCP server](https://docs.turnkey.com/mcp).

## Why Use These Skills?

These skills let you operate Turnkey through conversation instead of code. Point your AI agent at the skills and describe what you need — it handles the API calls, parameter formatting, and chain-specific details.

- **Explore and test** — create wallets, sign transactions, and set policies without writing integration code. See [`managing-wallets`](skills/managing-wallets/SKILL.md) and [`signing-transactions`](skills/signing-transactions/SKILL.md).
- **Administer your organization** — manage users, rotate API keys, and monitor activities conversationally. See [`managing-users`](skills/managing-users/SKILL.md), [`managing-policies`](skills/managing-policies/SKILL.md), and [`monitoring-activities`](skills/monitoring-activities/SKILL.md).
- **Provision autonomous agents** — set up a scoped wallet with constrained credentials and governance policies so an agent can transact on-chain without human review. See [`provisioning-agent`](skills/provisioning-agent/SKILL.md).

## Environment Variables

All HTTP API skills require these three variables:

```env
TURNKEY_API_PUBLIC_KEY=<your-api-public-key>
TURNKEY_API_PRIVATE_KEY=<your-api-private-key>
TURNKEY_ORGANIZATION_ID=<your-organization-id>
```

The one exception is [`tvc-deployments`](skills/tvc-deployments/SKILL.md), which drives the `tvc` CLI rather than the HTTP API and authenticates with a separate `TVC_*` variable set (`TVC_ORG_ID`, `TVC_API_KEY_PUBLIC`, `TVC_API_KEY_PRIVATE`) — see that skill's Authentication section. Do not mix the two credential sets.

> **⚠️ Security warning — a note on root credentials**
>
> The credentials you provide here may belong to a root user or a scoped non-root user. Root users are members of your organization's root quorum — they can execute any action and bypass all policies. Before giving these credentials to an AI agent, consider your use case:
>
> - **Interactive assistant** (human approves each action): root credentials may be acceptable for testing — evaluate the risk before using them in production.
> - **Autonomous agent** (acts without human review): **do not use root credentials.** Create scoped credentials with policies that limit what the agent can do — see [`skills/provisioning-agent/`](skills/provisioning-agent/SKILL.md).
>
> LLMs can misinterpret instructions or execute unintended actions. Scoped credentials ensure mistakes are bounded. Turnkey policies are the technical enforcement mechanism.

Get these from the [Turnkey console](https://app.turnkey.com) under **Settings → API Keys**. When you create an API key, you receive a P-256 public/private key pair. The organization ID is visible in the URL and settings page.

## Loading Skills

Each skill is a `SKILL.md` file — a structured prompt that teaches an AI agent how to perform a Turnkey operation. The root [`SKILL.md`](SKILL.md) is the master index: it lists every skill, explains when to use each one, and defines the load order for multi-step tasks.

Clone the repo and point your assistant at the folder. This works with any AI assistant that can read files (Cursor, Cline, Windsurf, Aider, ChatGPT with file upload, etc.):

```bash
git clone https://github.com/tkhq/turnkey-agent-skills.git
cd turnkey-agent-skills
```

Then reference the root `SKILL.md` (or a specific skill) in your prompt:

```
Please read SKILL.md in this repo and help me sign an Ethereum transaction.
```

### Skill load order

For multi-step tasks, skills should be loaded in a specific order. The root [`SKILL.md`](SKILL.md) documents this in detail, but the summary is:

- **First-time setup** — `getting-started` (verifies credentials, creates your first wallet)
- **Signing a transaction** — `managing-wallets` → `signing-transactions` (one skill covers EVM, Solana, Bitcoin, and 10+ other chains)
- **Provisioning an agent** — `provisioning-agent` (pulls in `managing-wallets`, `managing-users`, and `managing-policies` as needed)

Agents that load the root `SKILL.md` first will follow this order automatically.

## Skills

**Workflows** are guided multi-step procedures (start here if you're new). **Primitives** are individual operations (use these for ongoing work).

### Workflows

Guided multi-step procedures — start here for onboarding or agent setup.

| Skill | Path | Description |
|-------|------|-------------|
| Getting Started | `skills/getting-started/` | Day-0 onboarding: verify credentials, create your first wallet |
| Provisioning Agent | `skills/provisioning-agent/` | Create a scoped agent with constrained credentials and policies |
| Managing Agent | `skills/managing-agent/` | Debug denied transactions, rotate keys, update agent policies |
| TVC Deployments | `skills/tvc-deployments/` | Build, deploy, and maintain Turnkey Verifiable Cloud apps via the `tvc` CLI |

### Primitives

Individual operations — use for ongoing work and one-off tasks.

| Skill | Path | Description |
|-------|------|-------------|
| Managing Wallets | `skills/managing-wallets/` | Create wallets, derive addresses, add chains, import/export |
| Signing Transactions | `skills/signing-transactions/` | Sign and broadcast on any chain (EVM, Solana, Bitcoin, +10 more) |
| Managing Users | `skills/managing-users/` | Create users, rotate API keys, user tags |
| Managing Policies | `skills/managing-policies/` | Access control, spending limits, allowlists, multi-sig |
| Monitoring Activities | `skills/monitoring-activities/` | Activity status, consensus approvals, audit |

**Note**: You don't need to run `npm install` in this repo to use the skills — your AI assistant reads the `SKILL.md` files directly as prompts. The skills will, however, tell you to install `@turnkey/sdk-server` (and a chain-specific package if you're signing transactions) in your own project, since Turnkey's API requires a cryptographic stamp on every request that the SDK handles for you. The Running Examples section below is only for developers who want to run this repo's examples/ demos end-to-end.

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

## Versioning

This repo is versioned as a single bundle using [Semantic Versioning](https://semver.org). The authoritative version lives in `package.json`; release-please keeps `.claude-plugin/plugin.json` in sync via its `extra-files` configuration. See [`CHANGELOG.md`](CHANGELOG.md) for release history.

**SemVer contract for this skill bundle:**

- **Major** — removing or renaming a skill, removing a documented workflow step, or changing required environment variables.
- **Minor** — adding a new skill, adding a new optional reference, or non-breaking expansions to an existing skill's workflow.
- **Patch** — wording, formatting, doc fixes, dependency bumps with no behavior change.

**Pinning a release.** Each distribution channel resolves to a git tag, so you can pin to a specific version. Replace `<version>` with a tag from the [GitHub releases page](https://github.com/tkhq/turnkey-agent-skills/releases):

```bash
# Local clone
git clone --branch v<version> https://github.com/tkhq/turnkey-agent-skills.git
```

Releases are automated via [release-please](https://github.com/googleapis/release-please) on merges to `main`. Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `feat!:` for breaking) so the bot can compute the next version.

## Contributing

Adding a new skill, running the eval harness, or exploring the project structure? See [CONTRIBUTING.md](CONTRIBUTING.md).
