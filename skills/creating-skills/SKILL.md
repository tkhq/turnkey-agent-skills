---
name: creating-skills
description: "Creates, evaluates, and improves Turnkey agent skills. Walks through research, SKILL.md authoring, reference file creation, eval writing, and iterative quality improvement. Use when asked to 'create a new skill', 'add a skill for X', 'build a Turnkey skill', 'write a SKILL.md', 'improve a skill description', 'improve skill triggers', 'make my skill trigger better', 'evaluate a skill', 'run skill evals', or 'iterate on skill quality'."
license: Apache-2.0
compatibility: "Requires Node.js and tsx. Run npm install in the repo root."
metadata:
  author: turnkey
  version: "1.0.0"
  tags: ["meta", "skill-authoring", "evaluation"]
---

# Creating Turnkey Skills

## Quick Start

To create a new skill, follow these steps in order: Study, Research, Draft, Evaluate, Iterate.

## Workflow

### Step 1: Study Existing Skills

Before writing anything, read 1-2 existing skills to understand the pattern.

**Primitives** (7 skills, named `managing-{resource}-api` or `{action}-{resource}-api`):
- `skills/managing-wallets-api/SKILL.md` is a solid primitive example (wallet CRUD with descriptive headings)
- `skills/signing-transactions-api/SKILL.md` shows multi-chain support with progressive disclosure
- `skills/managing-policies-api/SKILL.md` shows complex rule-based logic
- Also: `managing-private-keys-api`, `monitoring-activities-api`, `managing-users-api`, `managing-organizations-api`

**Workflows** (3 skills, named `{purpose}-workflow`):
- `skills/agentic-wallet-workflow/SKILL.md` shows phased structure (Phase 1/2/3) and agent personas (Worker, Observer, Admin)
- `skills/getting-started-workflow/SKILL.md` shows first-time onboarding flow
- `skills/treasury-operations-workflow/SKILL.md` shows fund management operations

Read the SKILL.md, one reference file, and the evals for whichever skill is closest to what you are building. This gives you the exact pattern to follow.

Key patterns to note:
- Primitives use **descriptive headings** ("Query Wallets", "Create a Wallet"), not numbered steps ("Step 1:", "Step 2:")
- Workflows use **phases** ("Phase 1: Onboarding", "Phase 2: Management", "Phase 3: Monitoring")
- All primitives include an **activity envelope note** at the top of Instructions explaining the request body format
- Descriptions include both **positive trigger phrases** ("Use when asked to...") and **negative trigger phrases** ("Do NOT use for... (use X instead)")

### Step 2: Research the Turnkey Feature

Gather the specific information you need to write the skill:

**What to research:**
- Which Turnkey API endpoints are involved (e.g., `CreateWallet`, `SignTransaction`)
- Which HTTP API endpoints to use (e.g., `POST /public/v1/submit/create_wallet`)
- What the request parameters and response shapes look like
- Common patterns, gotchas, and required ordering of operations
- What environment variables are needed

**Research sources (use in this order):**

**1. Turnkey Docs MCP** (fastest, if available):
Use the `Turnkey Docs:search_turnkey` tool for targeted searches:
```
search_turnkey("wallets create HD")
search_turnkey("policy rules allow deny")
search_turnkey("sign transaction ethereum")
```

**2. Turnkey documentation website:**
- Homepage: https://docs.turnkey.com/home
- Index of all doc pages (599 lines, links only): https://docs.turnkey.com/llms.txt
- Full documentation content (98K lines, complete text): https://docs.turnkey.com/llms-full.txt

Start with `llms.txt` to find relevant pages, then fetch individual pages by appending `.md` to the URL path. For example, if `llms.txt` lists `https://docs.turnkey.com/api-reference/activities/create-wallet`, fetch `https://docs.turnkey.com/api-reference/activities/create-wallet.md` for the full content.

Use `llms-full.txt` only when you need to search across all docs at once (it is very large).

**3. Turnkey docs repo** (for raw documentation source):
- https://github.com/tkhq/docs

### Step 3: Draft the Skill

**3a. Create the directory:**
```bash
mkdir -p skills/your-skill-name/{references,evals}
```

Use the naming convention: `managing-{resource}-api` for primitives (e.g., `managing-wallets-api`, `managing-policies-api`), `{purpose}-workflow` for workflows (e.g., `agentic-wallet-workflow`, `treasury-operations-workflow`).

**3b. Write the SKILL.md frontmatter:**

```yaml
---
name: your-skill-name
description: "Does X using Turnkey's Y API. Covers A, B, and C. Use when asked to 'do X', 'perform Y', or 'set up Z'."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). See managing-users-api for authentication setup."
metadata:
  version: "1.0.0"
  tags: ["relevant", "tags"]
---
```

**Frontmatter rules:**
- `name`: kebab-case, max 64 chars, must match directory name exactly
- `description`: third person, max 1024 chars, must include trigger phrases
- `description` structure: [What it does] + [What it covers] + "Use when asked to 'phrase 1', 'phrase 2', 'phrase 3'." + "Do NOT use for X (use Y), Z (use W)."
- Include both positive triggers ("Use when asked to...") and negative triggers ("Do NOT use for...")
- No XML tags (`<` or `>`) in name or description
- Do not use "claude" or "anthropic" in the name

**3c. Write the SKILL.md body following this structure:**

1. **Quick Start** (1 sentence: simplest way to use this skill)
2. **Prerequisites** (reference managing-users-api for auth)
3. **Instructions** (descriptive headings with brief API patterns; start with the activity envelope note)
4. **Rules** (mandatory guardrails specific to this feature)
5. **Related Skills** (cross-references to other skills using current names)

**Body rules:**
- Under 300 lines preferred, 500 max
- Only include context the LLM does not already know (Turnkey-specific APIs, gotchas, required ordering)
- Every skill starts with a reference to managing-users-api for authentication
- Use descriptive headings in Instructions ("### Query Wallets", "### Create a Wallet"), not numbered steps ("### Step 1:")
- For primitives, include the activity envelope note at the top of Instructions (see skill-template.md for the exact text)
- For workflows, use phases ("## Phase 1: Onboarding", "## Phase 2: Management")
- Keep code in SKILL.md to brief patterns (10-15 lines max per block)
- Delegate full, self-contained examples to `references/` files

**3d. Write reference files:**

Create `references/*.md` files with complete API examples. Each example should:
- Show the full HTTP endpoint and JSON request body
- Include all required fields
- Be self-contained
- Cover one specific use case per example

SKILL.md links to references like: `See [references/examples.md](references/examples.md)`.

For a complete worked example of building a skill from scratch, see [references/worked-example.md](references/worked-example.md).

### Step 4: Write Evals

Create two files in `evals/`:

**evals/triggers.json** (does the skill activate for the right queries?):
```json
{
  "should_trigger": [
    "Direct request using the skill's primary action",
    "Same request phrased differently",
    "Request using domain-specific technical terms",
    "Request that mentions the feature by name"
  ],
  "should_not_trigger": [
    "Request for a different Turnkey feature (e.g., signing vs creating wallets)",
    "Request that sounds similar but belongs to another skill",
    "Generic programming question unrelated to Turnkey"
  ]
}
```

**evals/evals.json** (does the skill produce correct output?):
Write 4+ evals covering these categories:
1. **Happy path**: Standard request that should work perfectly
2. **Edge case**: Unusual but valid request
3. **Adversarial**: User asks for the wrong approach (skill should correct them)
4. **Cross-skill**: Request that requires this skill plus another

See [references/eval-guide.md](references/eval-guide.md) for detailed guidance with examples.

### Step 5: Validate Structure

```bash
npx tsx skills/creating-skills/scripts/validate.ts skills/your-skill-name
```

Fix any errors before proceeding. Warnings are advisory but should be addressed.

### Step 6: Evaluate Triggers

Ensure `.claude/commands/` exists in the project root:
```bash
mkdir -p .claude/commands
```

#### 6a. Test individual queries (fast iteration)

Use `test-one.py` to test a single query at a time (~5s per run, ~15s for 3 runs). This is the primary tool for iterating on a skill description:

```bash
# Test one query, 3 runs with majority vote (~15s)
python3 skills/creating-skills/scripts/test-one.py "Create a wallet" skills/your-skill-name --expect true

# Quick single run for rapid feedback (~5s)
python3 skills/creating-skills/scripts/test-one.py "Create a wallet" skills/your-skill-name --expect true --runs 1

# Test a should-not-trigger query
python3 skills/creating-skills/scripts/test-one.py "Sign a transaction" skills/your-skill-name --expect false
```

The script creates a temporary slash command, runs `claude -p` with streaming detection, and kills the process as soon as triggering is confirmed. No waiting for the full session to complete.

**Iteration workflow:**
1. Run a failing query with `--runs 1` to confirm the failure (~5s)
2. Edit the SKILL.md description
3. Re-run the same query to check if it passes now
4. Once it passes at `--runs 1`, confirm with `--runs 3` for stability
5. Move to the next failing query

#### 6b. Run all triggers at once

Run every query from triggers.json sequentially with `--runs 1` for a full sweep (~5s per query):

```bash
# should_trigger queries
python3 skills/creating-skills/scripts/test-one.py "query 1" skills/<name> --expect true --runs 1
python3 skills/creating-skills/scripts/test-one.py "query 2" skills/<name> --expect true --runs 1
# ... repeat for each query in triggers.json

# should_not_trigger queries
python3 skills/creating-skills/scripts/test-one.py "query 1" skills/<name> --expect false --runs 1
```

should_not_trigger queries that hit the 30s timeout without triggering are working correctly. The timeout is the expected behavior for negative cases.

#### 6c. Full evaluation with Anthropic's eval suite

For a final comprehensive check, use Anthropic's `run_eval.py` with multiple runs per query:

```bash
# Convert triggers.json to Anthropic eval format
python3 -c "
import json
with open('skills/<name>/evals/triggers.json') as f:
    data = json.load(f)
eval_set = []
for q in data['should_trigger']:
    eval_set.append({'query': q, 'should_trigger': True})
for q in data['should_not_trigger']:
    eval_set.append({'query': q, 'should_trigger': False})
with open('/tmp/<name>-evalset.json', 'w') as f:
    json.dump(eval_set, f, indent=2)
"

# Run full eval (3 runs per query, 2 parallel workers)
PYTHONPATH=~/turnkey/skills/skills/skill-creator python3 \
  ~/turnkey/skills/skills/skill-creator/scripts/run_eval.py \
  --eval-set /tmp/<name>-evalset.json \
  --skill-path skills/<name> \
  --num-workers 2 \
  --timeout 30 \
  --runs-per-query 3 \
  --verbose
```

#### 6d. LLM-powered description improvement

If trigger accuracy is low, generate an improved description from the eval failures:

```bash
PYTHONPATH=~/turnkey/skills/skills/skill-creator python3 \
  ~/turnkey/skills/skills/skill-creator/scripts/improve_description.py \
  --eval-results /tmp/<name>-eval-results.json \
  --skill-path skills/<name> \
  --model sonnet \
  --verbose
```

Always re-eval after applying the improved description. The LLM suggestion does not always outperform the original. Keep whichever scores higher.

#### Trigger evaluation guidelines

- Start with `test-one.py --runs 1` for fast iteration, then confirm with `--runs 3` once queries pass.
- Use `--num-workers 2` in the full eval to avoid contention with parallel Claude sessions.
- Single runs have high variance. A query that fails 1 run may pass the next. Use 3 runs minimum for any final judgment.
- Explicit trigger phrases in the description ("Use when asked to 'create a wallet'") perform as well or better than abstract phrasing ("Use for any task involving wallet creation").
- Cross-reference all blockchain network names, address formats, curves, and derivation paths against the official Turnkey docs at `docs/concepts/wallets.mdx` before publishing. The Turnkey docs are the source of truth.

### Step 7: Finalize

Review the eval results. If everything passes, run the checklist below.

## Rules

- Every skill MUST have both `evals/evals.json` and `evals/triggers.json`
- Every skill MUST pass structural validation before committing
- Descriptions MUST include explicit trigger phrases in the format "Use when asked to '...'"
- SKILL.md body MUST stay under 500 lines (prefer under 300)
- Reference files MUST be one level deep from SKILL.md (no nested references)
- Do not duplicate code between SKILL.md and reference files
- All code examples in references MUST be complete and self-contained
- Every skill MUST reference managing-users-api for authentication setup
- Use consistent environment variable names: TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID, SIGN_WITH

## Checklist

Before considering a skill complete:

- [ ] Studied 1-2 existing skills as reference
- [ ] Researched the Turnkey feature via docs
- [ ] Description has trigger phrases and is under 1024 chars
- [ ] SKILL.md is under 300 lines
- [ ] Has Quick Start, Prerequisites, Environment Variables, Instructions, Rules, Related Skills sections
- [ ] References have full, self-contained code examples
- [ ] evals/evals.json has 4+ evals (happy path, edge case, adversarial, cross-skill)
- [ ] evals/triggers.json has 3+ should_trigger and 3+ should_not_trigger
- [ ] `npx tsx skills/creating-skills/scripts/validate.ts skills/<name>` passes
- [ ] All triggers pass with `test-one.py --runs 3`
- [ ] No false positives on should_not_trigger queries
- [ ] No code duplication between SKILL.md and references
