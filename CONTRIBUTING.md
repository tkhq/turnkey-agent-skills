# Contributing

This guide covers how to add new skills, run the eval harness, and validate your changes. If you're just trying to *use* the skills, see the [README](README.md).

## Running Evals

Each skill includes test cases in `skills/<skill-name>/evals/evals.json`. The automated eval runner discovers all evals, sends them through an LLM (with and without skill context), grades the output against assertions, and prints a summary.

```bash
# Run all evals with Claude (default provider)
npm run evals

# Run evals for a specific skill
npm run evals -- --skill signing-transactions

# Run a single eval
npm run evals -- --skill managing-wallets --eval 1

# Also run a baseline without skill context for comparison
npm run evals -- --without-skill

# Use OpenAI instead of Claude (requires OPENAI_API_KEY)
npm run evals -- --provider openai --model gpt-4o

# Use a custom command as the LLM provider
npm run evals -- --provider custom --command "llm prompt -m claude-3.5-sonnet"

# Other options
npm run evals -- --concurrency 2    # limit parallel runs (default: 4)
npm run evals -- --dry-run           # print prompts without executing
npm run evals -- --verbose           # print full LLM responses
```

The runner extracts the largest TypeScript code block from each response, runs the assertions from `evals.json` against it, and writes results to `evals-workspace/report.json`. Generated solutions are saved to `evals-workspace/<skill-name>/eval-<id>/solution.ts`.

After running evals, `npm test` will grade any solutions in `evals-workspace/` against their assertions.

Eval outputs are gitignored (`evals-workspace/`). Only `evals/evals.json` definitions are committed.

## Maintaining API Schemas

`tests/api-schemas.test.ts` validates every documented `POST /public/v1/{submit,query}/<endpoint>` JSON body against JSON Schemas extracted from the bundled `@turnkey/sdk-server` types (`dist/__inputs__/public_api.types.d.ts`). This catches drift like a missing required field (`oauthProviders`) or a stale activity-type version (`CREATE_USERS_V3` vs `V4`) before users hit it at runtime.

The schemas live in two checked-in fixtures:

- `tests/fixtures/api-schemas.json` — JSON Schema document, one `definitions[<TypeName>]` entry per SDK type
- `tests/fixtures/endpoint-to-intent.json` — `/public/v1/{submit,query}/<endpoint>` → `{ intent, activityType? }` mapping

### When to refresh

After bumping `@turnkey/sdk-server` (or accepting a Renovate PR that does so), regenerate the fixtures:

```bash
npm run refresh-api-schemas
```

The script reads the SDK's bundled type definitions, walks the AST, and writes both fixtures. Re-running it without an SDK change must produce **no diff** — that's the idempotence guarantee. Diffs after an SDK bump should be reviewed alongside any documentation updates the same PR makes.

If the schema diff introduces a new required field on an intent your skill documents, the test will fail until the documented body includes it. That's the point — fix the docs (don't paper over the failure).

### Skipping a JSON block

Some examples are intentionally partial (e.g. documenting a query-by-address shortcut whose SDK type marks the wallet ID required even though the live API resolves it from the address). Mark them with an HTML comment between the endpoint header and the JSON body:

````markdown
```
POST /public/v1/query/get_wallet_account
```

<!-- schema-skip: docs the by-address lookup shortcut; SDK type marks `walletId` required but the live API resolves wallet from `address` -->

```json
{
  "organizationId": "<ORG_ID>",
  "address": "<ADDRESS>"
}
```
````

The rationale is mandatory and reviewed. A guardrail in the test suite fails CI if skipped blocks exceed 25% of validated blocks, so this mechanism cannot be used to silently disable coverage.

### Body convention

The validator auto-detects two body shapes documented in the skills:

- **Parameters payload** (most submit / all query endpoints) — validated directly against the mapped intent / request schema.
- **Activity envelope** `{ type, timestampMs, organizationId, parameters }` (used in a handful of walk-throughs) — `parameters` is validated against the intent schema and `type` is cross-checked against the mapped `activityType`.

## Adding a New Skill

Skills live directly under `skills/` in a flat layout — no category subdirectories. Follow these steps:

1. **Choose a name.** Use a short, verb-based kebab-case name that reads as an action (e.g. `managing-wallets`, `signing-transactions`, `monitoring-activities`). The directory name and the `name` field in the frontmatter must match exactly.

2. **Create the directory:** `skills/<your-skill-name>/`.

3. **Create `SKILL.md`** with the required frontmatter:

   ```yaml
   ---
   name: your-skill-name
   description: "Single-line description of what this skill does and when to use it."
   license: Apache-2.0
   compatibility: "Runtime requirements and required env vars."
   metadata:
     author: turnkey
     tags: "space separated tags"
   ---
   ```

   The `name` must match the directory name exactly.

4. **Include these required sections:** Overview, Prerequisites, Environment Variables, Instructions (or Examples), Troubleshooting, Related Skills.

5. **Add reference examples** in `references/`. Each TypeScript code block must be fully self-contained (all imports and setup) — these are type-checked by the test suite (`tests/reference-compiles.test.ts`).

6. **Add evals** in `evals/evals.json`. Include `compiles` assertions to catch real type errors. Look at an existing skill's `evals.json` (for example `skills/managing-wallets/evals/evals.json`) for the assertion reference.

7. **Validate:**
   ```bash
   npm test        # structure, syntax, type-checking, evals
   npm run check   # typecheck + tests
   ```

8. **Register the skill in the root [`SKILL.md`](SKILL.md)** under the appropriate section (Workflows or Primitives) so it's discoverable.

## Commit Messages

Every commit on a PR must follow [Conventional Commits](https://www.conventionalcommits.org/). This is enforced in CI; PRs cannot merge until the check passes.

Format:

```
<type>(<optional-scope>): <subject>
```

- `<type>` must be one of: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`, `perf`, `style`, `revert`, `deps`.
- `<subject>` must start with a lowercase letter and describe the change in the imperative (`add`, not `added`).
- `<optional-scope>` is freeform; skill directory names are a natural fit (e.g. `managing-wallets`, `signing-transactions`).
- Append `!` after the type/scope (e.g. `feat!:`) or include `BREAKING CHANGE:` in the body to mark a breaking change.

Examples:

```
feat(managing-wallets): add multi-address derivation
fix(signing-transactions): handle empty memo on Solana
docs: clarify policy quorum semantics
chore(deps): bump @turnkey/http to 4.2.0
feat!: drop legacy SKILL.md metadata.version field
```

Release impact: only `feat` and `fix` (and breaking changes) trigger a version bump and changelog entry — `feat` minor, `fix` patch, breaking major. All other types land silently. See the README for the full release flow.



```
turnkey-agent-skills/
├── README.md
├── CONTRIBUTING.md
├── SKILL.md                              # Root skill index
├── skills/
│   ├── getting-started/                  # Onboarding workflow
│   ├── provisioning-agent/               # Create a scoped agent
│   ├── managing-agent/                   # Debug / rotate / revoke an agent
│   ├── managing-wallets/                 # HD wallets, addresses, chains
│   ├── signing-transactions/             # Sign & broadcast on any chain
│   ├── managing-users/                   # Users, API keys, user tags
│   ├── managing-policies/                # Access control, spending limits
│   └── monitoring-activities/            # Activity status, approvals, audit
├── examples/                             # Runnable SDK demos (tsx)
│   ├── wallet-management.ts
│   ├── ethereum-ethers.ts
│   ├── ethereum-viem.ts
│   ├── solana-signing.ts
│   └── bitcoin-signing.ts
├── scripts/
│   ├── run-evals.ts                      # Eval runner entry point
│   └── refresh-api-schemas.ts            # Regenerates tests/fixtures/api-*.json
└── tests/
    ├── skill-structure.test.ts           # Layer 1: frontmatter + sections
    ├── code-blocks.test.ts               # Layer 2: syntax checking
    ├── reference-compiles.test.ts        # Layer 3: full type-checking
    ├── api-schemas.test.ts               # Layer 4: JSON body schema validation
    ├── evals.test.ts                     # Layer 5: assertion grading
    ├── plugin-dir.test.ts                # Plugin packaging checks
    ├── fixtures/                         # Generated API schema + endpoint mapping
    ├── grader.ts                         # Assertion runner
    └── helpers.ts                        # Shared test utilities
```

Each skill directory contains:

```
skills/<skill-name>/
├── SKILL.md                              # Frontmatter + instructions
├── references/                           # Self-contained code examples
└── evals/
    └── evals.json                        # Test cases + assertions
```
