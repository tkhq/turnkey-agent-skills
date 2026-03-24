# Contributing

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
   - Write a description in third person with trigger phrases (max 1024 chars)
   - Keep the body under 300 lines, delegating code to `references/`

3. **Add reference files:**
   - Put complete code examples in `references/*.md`
   - Keep SKILL.md focused on patterns and routing

4. **Write evals:**
   - `evals/evals.json`: 4+ functional evals (happy path, edge case, adversarial, cross-skill)
   - `evals/triggers.json`: 3+ should_trigger and 3+ should_not_trigger queries

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
- [ ] Description includes trigger phrases and is under 1024 chars
- [ ] SKILL.md body is under 300 lines
- [ ] References have complete, compilable TypeScript examples
- [ ] evals/evals.json has 4+ evals
- [ ] evals/triggers.json has 3+ queries per category
- [ ] No code duplication between SKILL.md and references
- [ ] Consistent terminology throughout

## Code Style

- All code examples must use the Turnkey CLI and API endpoints
- Use standard environment variable names (`ORGANIZATION_ID`, etc.)
- Include complete, runnable CLI commands in reference examples

## PR Guidelines

- One skill per PR (unless skills are tightly coupled)
- Include eval results in the PR description
- Reference any Turnkey documentation used for research
