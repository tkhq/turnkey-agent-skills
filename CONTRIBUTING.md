# Contributing

## Repo Architecture

This repo contains 11 skills organized into three categories:

### Primitives (7 skills)

API-level skills covering 78 Turnkey HTTP endpoints. Named `managing-{resource}-api`:

| Skill | Endpoints | Description |
|-------|-----------|-------------|
| `managing-wallets-api` | 13 | HD wallet creation, account derivation, import/export |
| `managing-private-keys-api` | 11 | Standalone private keys, tags for policy targeting |
| `signing-transactions-api` | 10 | Signing, sponsored broadcasts, balance/nonce queries |
| `managing-policies-api` | 12 | Policy CRUD, smart contract interfaces, evaluation debugging |
| `monitoring-activities-api` | 5 | Activity lifecycle, consensus approval, audit trails |
| `managing-users-api` | 18 | User lifecycle, API keys, user tags |
| `managing-organizations-api` | 9 | Sub-orgs, root quorum, org features |

### Workflows (3 skills)

Multi-step orchestration composing multiple primitives. Named `{purpose}-workflow`:

| Skill | Description |
|-------|-------------|
| `getting-started-workflow` | Day-0 onboarding: verify credentials, create first wallet, sign first transaction |
| `agentic-wallet-workflow` | Give an AI agent scoped wallet access: sub-org, wallet, policies, credentials |
| `treasury-operations-workflow` | Set up and operate a company treasury: hot/cold wallets, multi-sig, payments |

### Meta (1 skill)

| Skill | Description |
|-------|-------------|
| `creating-skills` | For contributors: create, evaluate, and improve Turnkey agent skills |

## Naming Conventions

- **Primitives:** `managing-{resource}-api` (e.g., `managing-wallets-api`, `managing-users-api`)
- **Workflows:** `{purpose}-workflow` (e.g., `getting-started-workflow`, `treasury-operations-workflow`)
- **Meta:** descriptive name without a suffix (e.g., `creating-skills`)
- All names use kebab-case, max 64 characters, must match directory name exactly

## Creating a New Skill

The easiest way to create a skill is to use the `creating-skills` meta skill in Claude Code:

```
Create a new skill for [your feature]
```

This walks through research, drafting, validation, and evaluation automatically.

### Manual Process

1. **Copy the template:**
   ```bash
   cp -r template/ skills/your-skill-name/
   ```

2. **Edit `SKILL.md`:**
   - Set `name` to match your directory name (kebab-case, max 64 chars)
   - Write a description in third person with both positive and negative trigger phrases (max 1024 chars)
   - Keep the body under 300 lines, delegating code to `references/`

3. **Add reference files:**
   - Put complete API examples in `references/*.md`
   - Keep SKILL.md focused on patterns and routing
   - Primitives use descriptive headings (not "Step N:")
   - Workflows use phases to organize multi-step processes

4. **Write evals:**
   - `evals/evals.json`: 4+ functional evals (happy path, edge case, adversarial, cross-skill)
   - `evals/triggers.json`: 8+ should_trigger and 6+ should_not_trigger queries

5. **Validate:**
   ```bash
   npm run validate -- skills/your-skill-name
   ```

6. **Test triggers:**
   ```bash
   npm run eval -- --skill your-skill-name
   ```

## Quality Checklist

Before submitting a PR:

- [ ] `npm run validate` passes for all skills
- [ ] Description includes both positive AND negative trigger phrases, under 1024 chars
- [ ] SKILL.md body is under 300 lines
- [ ] References have complete, self-contained API request examples (endpoint + JSON body)
- [ ] evals/evals.json has 4+ evals
- [ ] evals/triggers.json has 8+ should_trigger and 6+ should_not_trigger queries
- [ ] CI trigger accuracy passes (90% threshold enforced)
- [ ] Primitives use descriptive headings, workflows use phases
- [ ] No code duplication between SKILL.md and references
- [ ] Consistent terminology throughout

## Code Style

- All examples must use the Turnkey HTTP API endpoints
- Use standard environment variable names (`TURNKEY_API_PUBLIC_KEY`, `TURNKEY_API_PRIVATE_KEY`, `TURNKEY_ORGANIZATION_ID`, `SIGN_WITH`)
- Include complete API request examples (endpoint + JSON body) in references
- Every skill references `managing-users-api` for authentication setup

## PR Guidelines

- One skill per PR (unless skills are tightly coupled)
- Include eval results in the PR description
- Reference any Turnkey documentation used for research
