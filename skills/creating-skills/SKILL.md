---
name: creating-skills
description: "Creates, evaluates, and improves Turnkey agent skills. Walks through research, SKILL.md authoring, reference file creation, eval writing, and iterative quality improvement. Use when asked to 'create a new skill', 'add a skill for X', 'build a Turnkey skill', 'write a SKILL.md', or 'improve a skill description'."
license: Apache-2.0
compatibility: "Requires Node.js and tsx. Run npm install in the repo root."
metadata:
  version: "1.0.0"
  tags: ["meta", "skill-authoring", "evaluation"]
---

# Creating Turnkey Skills

## Quick Start

To create a new skill, follow this workflow: Research, Draft, Validate, Evaluate, Iterate.

## Workflow

### Step 1: Research

Before writing anything, gather context about the Turnkey feature you are building a skill for.

**Using Turnkey Docs MCP** (preferred, if available):
Use the `Turnkey Docs:search_turnkey` tool to search Turnkey documentation:
```
search_turnkey("wallets create HD")
search_turnkey("policy rules allow deny")
```

**Browsing the SDK** (for code examples):
- Check `~/turnkey/sdk/packages/` for relevant packages
- Read SDK examples in `~/turnkey/sdk/examples/`
- Check the public repo at https://github.com/tkhq/sdk

**Using llms.txt** (for doc index):
- Fetch https://docs.turnkey.com/llms.txt for a full index of available documentation

### Step 2: Draft the Skill

Create a new directory under `skills/` using kebab-case gerund naming:

```bash
mkdir -p skills/your-skill-name/{references,evals}
```

Write `skills/your-skill-name/SKILL.md` following the template at `template/SKILL.md`. See [references/skill-template.md](references/skill-template.md) for an annotated version.

**Frontmatter rules:**
- `name`: kebab-case, max 64 chars, must match directory name
- `description`: third person, max 1024 chars, include trigger phrases
- `description` structure: [What it does] + [When to use it] + [Trigger phrases]
- No XML tags in name or description
- Do not use "claude" or "anthropic" in the name

**SKILL.md body rules:**
- Under 300 lines preferred, 500 max
- Only include context Claude does not already know
- Include a "Quick Start" section at the top
- Include a "Rules" section with mandatory guardrails
- Delegate full code examples to `references/` files
- Reference files one level deep only

**Reference files:**
- Put detailed code examples in `references/*.md`
- Keep SKILL.md focused on patterns and routing
- Claude loads references on-demand, not at trigger time

### Step 3: Write Evals

Create two files in `evals/`:

**evals/triggers.json** (does the skill activate for the right queries?):
```json
{
  "should_trigger": [
    "Query that should activate this skill",
    "Another query using different phrasing",
    "A third query with domain-specific terms"
  ],
  "should_not_trigger": [
    "Unrelated query about a different topic",
    "Query that belongs to a different skill",
    "Generic programming question"
  ]
}
```

**evals/evals.json** (does the skill produce correct output?):
```json
[
  {
    "skills": ["your-skill-name"],
    "query": "A realistic user request",
    "expected_behavior": [
      "Uses the correct Turnkey SDK method",
      "Handles the response correctly",
      "Follows the documented pattern"
    ]
  }
]
```

Aim for 4+ functional evals covering: happy path, edge cases, adversarial prompts (user asks for wrong approach), and cross-skill interactions.

See [references/eval-guide.md](references/eval-guide.md) for detailed guidance.

### Step 4: Validate Structure

```bash
npx tsx skills/creating-skills/scripts/validate.ts skills/your-skill-name
```

Checks: frontmatter format, naming conventions, required files, character limits.

### Step 5: Evaluate Triggers

```bash
npx tsx skills/creating-skills/scripts/eval-triggers.ts --skill your-skill-name
```

Target: 90%+ accuracy on should_trigger, 0% false positives on should_not_trigger.

### Step 6: Improve (if needed)

If trigger accuracy is below 90%, run the improvement loop:

```bash
npx tsx skills/creating-skills/scripts/eval-loop.ts --skill your-skill-name --max-iterations 5
```

This iteratively refines the description using LLM feedback, then re-evaluates until passing or max iterations reached.

### Step 7: Generate Report

```bash
npx tsx skills/creating-skills/scripts/generate-report.ts --skill your-skill-name
```

Produces an HTML report showing trigger accuracy, eval results, and iteration history.

## Rules

- Every skill MUST have both `evals/evals.json` and `evals/triggers.json`
- Every skill MUST pass structural validation before committing
- Descriptions MUST include explicit trigger phrases
- SKILL.md body MUST stay under 500 lines
- Reference files MUST be one level deep from SKILL.md
- Do not duplicate code between SKILL.md and reference files
- Use consistent terminology throughout a skill
- All code examples in references MUST be valid TypeScript

## Checklist

Before considering a skill complete:

- [ ] Description has trigger phrases and is under 1024 chars
- [ ] SKILL.md is under 300 lines
- [ ] References have full code examples
- [ ] evals/evals.json has 4+ evals (happy path, edge cases, adversarial)
- [ ] evals/triggers.json has 3+ should_trigger and 3+ should_not_trigger
- [ ] Structural validation passes
- [ ] Trigger accuracy is 90%+
- [ ] No code duplication between SKILL.md and references
