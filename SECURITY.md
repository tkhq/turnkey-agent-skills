# Security

## Static analysis (Semgrep)

This repository runs [Semgrep](https://semgrep.dev) on every pull request,
on push to `main`, and on a daily schedule. The configuration lives in:

- `.github/workflows/semgrep.yml` — CI workflow
- `.semgrep/turnkey-rules.yml` — Turnkey-specific rules
- `.semgrepignore` — paths excluded from scanning

### Running locally

```bash
brew install semgrep   # or: pip install semgrep
semgrep scan --config p/security-audit --config p/secrets --config .semgrep/
```

### Adding a new rule

When you fix a security bug, add a Semgrep rule in `.semgrep/` so it cannot
regress. See the [Semgrep rule syntax docs](https://semgrep.dev/docs/writing-rules/rule-syntax).
