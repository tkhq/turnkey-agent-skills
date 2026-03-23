---
name: creating-skills
description: "Creates, evaluates, and improves Turnkey agent skills. Walks through research, SKILL.md authoring, reference file creation, eval writing, and iterative quality improvement. Use when asked to 'create a new skill', 'add a skill for X', 'build a Turnkey skill', 'write a SKILL.md', 'improve a skill description', or 'evaluate a skill'."
license: Apache-2.0
compatibility: "Requires Node.js and tsx. Run npm install in the repo root."
metadata:
  version: "1.0.0"
  tags: ["meta", "skill-authoring", "evaluation"]
---

# Creating Turnkey Skills

## Quick Start

To create a new skill, follow these steps in order: Study, Research, Draft, Evaluate, Iterate.

## Workflow

### Step 1: Study Existing Skills

Before writing anything, read 1-2 existing skills to understand the pattern. Good references:

- `skills/creating-wallets/SKILL.md` is the simplest skill (wallet CRUD)
- `skills/signing-ethereum/SKILL.md` shows two-library support (ethers + viem)
- `skills/authenticating-users/SKILL.md` shows progressive disclosure across multiple auth methods

Read the SKILL.md, one reference file, and the evals for whichever skill is closest to what you are building. This gives you the exact pattern to follow.

### Step 2: Research the Turnkey Feature

Gather the specific information you need to write the skill:

**What to research:**
- Which Turnkey API methods are involved (e.g., `createWallet`, `signTransaction`)
- Which SDK package to use (e.g., `@turnkey/sdk-server`, `@turnkey/ethers`)
- What the request parameters and response shapes look like
- Common patterns, gotchas, and required ordering of operations
- What environment variables are needed

**Using Turnkey Docs MCP** (preferred, if available):
Use the `Turnkey Docs:search_turnkey` tool:
```
search_turnkey("wallets create HD")
search_turnkey("policy rules allow deny")
```

**Browsing Turnkey documentation directly:**
- Fetch https://docs.turnkey.com/llms.txt for a full index of doc pages
- Then fetch individual pages for detailed API reference (e.g., https://docs.turnkey.com/api-reference/activities/create-wallet)

**Browsing the SDK** (for code examples):
- Check `~/turnkey/sdk/packages/` for relevant packages
- Read SDK examples in `~/turnkey/sdk/examples/`
- Public repo: https://github.com/tkhq/sdk

### Step 3: Draft the Skill

**3a. Create the directory:**
```bash
mkdir -p skills/your-skill-name/{references,evals}
```

Use kebab-case gerund naming (e.g., `creating-wallets`, `signing-ethereum`, `managing-policies`).

**3b. Write the SKILL.md frontmatter:**

```yaml
---
name: your-skill-name
description: "Does X using Turnkey's Y API. Covers A, B, and C. Use when asked to 'do X', 'perform Y', or 'set up Z'."
license: Apache-2.0
compatibility: "Requires Node.js. Install @turnkey/sdk-server. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars."
metadata:
  version: "1.0.0"
  tags: ["relevant", "tags"]
---
```

**Frontmatter rules:**
- `name`: kebab-case, max 64 chars, must match directory name exactly
- `description`: third person, max 1024 chars, must include trigger phrases
- `description` structure: [What it does] + [What it covers] + "Use when asked to 'phrase 1', 'phrase 2', 'phrase 3'."
- No XML tags (`<` or `>`) in name or description
- Do not use "claude" or "anthropic" in the name

**3c. Write the SKILL.md body following this structure:**

1. **Quick Start** (1 sentence: simplest way to use this skill)
2. **Prerequisites** (`npm install` command)
3. **Environment Variables** (env block with comments)
4. **Instructions** (step-by-step with brief code patterns)
5. **Rules** (mandatory guardrails specific to this feature)
6. **Related Skills** (cross-references to other skills)

**Body rules:**
- Under 300 lines preferred, 500 max
- Only include context the LLM does not already know (Turnkey-specific APIs, gotchas, required ordering)
- Every skill starts with the same Turnkey client initialization pattern
- Keep code in SKILL.md to brief patterns (10-15 lines max per block)
- Delegate full, self-contained examples to `references/` files

**3d. Write reference files:**

Create `references/*.md` files with complete, runnable TypeScript examples. Each example should:
- Include all imports
- Include the full Turnkey client initialization
- Be self-contained (copy-pasteable)
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
3. **Adversarial**: User asks for the wrong SDK/approach (skill should correct them)
4. **Cross-skill**: Request that requires this skill plus another

See [references/eval-guide.md](references/eval-guide.md) for detailed guidance with examples.

### Step 5: Validate Structure

```bash
npx tsx skills/creating-skills/scripts/validate.ts skills/your-skill-name
```

Fix any errors before proceeding. Warnings are advisory but should be addressed.

### Step 6: Evaluate Triggers

```bash
npx tsx skills/creating-skills/scripts/eval-triggers.ts --skill your-skill-name
```

Target: 90%+ accuracy on should_trigger, 0% false positives on should_not_trigger.

If accuracy is below 90%, run the improvement loop:

```bash
npx tsx skills/creating-skills/scripts/eval-loop.ts --skill your-skill-name --max-iterations 5
```

This iteratively refines the description using LLM feedback, then re-evaluates.

### Step 7: Generate Report and Finalize

```bash
npx tsx skills/creating-skills/scripts/generate-report.ts --skill your-skill-name
```

Review the HTML report. If everything passes, run the checklist below.

## Rules

- Every skill MUST have both `evals/evals.json` and `evals/triggers.json`
- Every skill MUST pass structural validation before committing
- Descriptions MUST include explicit trigger phrases in the format "Use when asked to '...'"
- SKILL.md body MUST stay under 500 lines (prefer under 300)
- Reference files MUST be one level deep from SKILL.md (no nested references)
- Do not duplicate code between SKILL.md and reference files
- All code examples in references MUST be complete, self-contained TypeScript
- Every skill MUST include the standard Turnkey client initialization pattern
- Use consistent environment variable names: TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID, SIGN_WITH

## Checklist

Before considering a skill complete:

- [ ] Studied 1-2 existing skills as reference
- [ ] Researched the Turnkey feature via docs/SDK
- [ ] Description has trigger phrases and is under 1024 chars
- [ ] SKILL.md is under 300 lines
- [ ] Has Quick Start, Prerequisites, Environment Variables, Instructions, Rules, Related Skills sections
- [ ] References have full, self-contained code examples
- [ ] evals/evals.json has 4+ evals (happy path, edge case, adversarial, cross-skill)
- [ ] evals/triggers.json has 3+ should_trigger and 3+ should_not_trigger
- [ ] `npx tsx skills/creating-skills/scripts/validate.ts skills/<name>` passes
- [ ] Trigger accuracy is 90%+
- [ ] No code duplication between SKILL.md and references
