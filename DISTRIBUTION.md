# Distribution Guide

This document covers how to distribute the Turnkey Agent Skills to users after the skills are finalized and approved. Do not distribute until all skills pass evaluation.

## Pre-Distribution Checklist

- [ ] All skills pass `npm run validate`
- [ ] Trigger evals pass at 90%+ for each skill
- [ ] Functional evals pass for each skill
- [ ] README.md is complete and accurate
- [ ] `.claude-plugin/` config is correct
- [ ] No references to internal tooling or private repos
- [ ] License headers are in place

## Distribution Channels

### 1. Claude Code Plugin Marketplace (Primary)

Users install via:
```bash
/plugin marketplace add tkhq/turnkey-agent-skills
/plugin install turnkey-skills@turnkey-agent-skills
```

**Setup:** Push the repo to `github.com/tkhq/turnkey-agent-skills`. The `.claude-plugin/marketplace.json` is already configured. No additional steps needed.

**Updates:** Users refresh with `/plugin marketplace update`. Push changes to the repo and bump the version in both `plugin.json` and `marketplace.json`.

**Validation:** Test locally before publishing:
```bash
/plugin marketplace add ./
/plugin install turnkey-skills@turnkey-agent-skills
```

### 2. Claude Code Local (Development / Testing)

Users clone and point Claude Code at the repo:
```bash
git clone https://github.com/tkhq/turnkey-agent-skills.git
claude --plugin-dir /path/to/turnkey-agent-skills
```

Or copy individual skills to their personal skills directory:
```bash
cp -r skills/creating-wallets ~/.claude/skills/creating-wallets
```

### 3. Claude.ai (Web Interface)

Users download a skill folder, zip it, and upload:
1. Download the skill folder (e.g., `skills/creating-wallets/`)
2. Zip the folder
3. In Claude.ai, go to **Settings > Capabilities > Skills**
4. Click **Upload skill** and select the zip file

Consider providing pre-zipped skill downloads in GitHub Releases.

### 4. Claude API (Programmatic)

Applications can include skills via the Messages API:
```json
{
  "model": "claude-sonnet-4-20250514",
  "messages": [...],
  "container": {
    "skills": ["creating-wallets"]
  }
}
```

This requires uploading skills to the Claude Console first, or using the `/v1/skills` API endpoint.

## Version Management

When updating skills:

1. Bump `version` in `.claude-plugin/plugin.json`
2. Bump `version` in `.claude-plugin/marketplace.json` (plugins array)
3. Bump `version` in individual skill `metadata.version` if the skill content changed
4. Update the CHANGELOG (if one exists)
5. Tag the release: `git tag v1.0.1`

## Recommended Launch Sequence

1. **Internal testing:** Share with Solutions Engineering via local install
2. **Beta:** Invite select customers to test via direct GitHub clone
3. **Public launch:** Push to public GitHub repo, announce the marketplace plugin
4. **Ongoing:** Monitor issues, iterate on skills based on user feedback

## Monitoring Adoption

Track marketplace install metrics via GitHub stars, clone counts, and any analytics the Claude Code plugin system provides. Monitor GitHub Issues for skill quality feedback.
