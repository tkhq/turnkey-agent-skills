# Writing Effective Evals

## Trigger Tests (triggers.json)

Trigger tests verify that your skill activates for the right queries and stays silent for unrelated ones.

### Structure

```json
{
  "should_trigger": [
    "Direct request using primary keywords",
    "Paraphrased request using synonyms",
    "Domain-specific request with technical terms"
  ],
  "should_not_trigger": [
    "Request for a completely different domain",
    "Request that belongs to a different skill",
    "Generic programming question unrelated to your skill"
  ]
}
```

### Guidelines

- Include 3+ queries per category (more is better for accuracy)
- Vary phrasing: direct requests, questions, imperative commands
- Include domain-specific terms users would actually say
- For should_not_trigger, use queries that are close but belong to a different skill
- Test edge cases: what if someone mentions your skill's topic but needs a different skill?

### Example (for a wallet creation skill)

```json
{
  "should_trigger": [
    "Create a wallet that supports Ethereum and Solana",
    "I need a blockchain address to receive payments",
    "Set up an HD wallet with Turnkey",
    "How do I derive a Bitcoin address from my wallet?"
  ],
  "should_not_trigger": [
    "Sign a transaction on Ethereum",
    "Add Google OAuth login to my app",
    "What's the current ETH price?",
    "Deploy a smart contract"
  ]
}
```

## Functional Evals (evals.json)

Functional evals verify that your skill produces correct output when activated.

### Structure

```json
[
  {
    "skills": ["your-skill-name"],
    "query": "A realistic user request",
    "expected_behavior": [
      "Uses the correct Turnkey API endpoint",
      "Handles the response correctly",
      "Follows the documented pattern"
    ]
  }
]
```

### Guidelines

- Write 4+ evals minimum
- Cover these categories:
  1. **Happy path**: Standard usage that should work perfectly
  2. **Edge case**: Unusual but valid request
  3. **Adversarial**: User asks for wrong approach (should be corrected)
  4. **Cross-skill**: Request that involves this skill plus another

### Adversarial Eval Example

Test that the skill corrects users who ask for the wrong approach:

```json
{
  "skills": ["signing-transactions-api"],
  "query": "Use the Ethereum signing method to sign a Solana transaction",
  "expected_behavior": [
    "Corrects the user: Ethereum and Solana use different signing methods",
    "Recommends the correct Solana signing approach",
    "Provides the correct Solana signing pattern"
  ]
}
```

### Cross-Skill Eval Example

Test that the skill works alongside related skills:

```json
{
  "skills": ["creating-wallets-api", "signing-transactions-api"],
  "query": "Create a wallet and send 0.01 ETH to 0xabc...",
  "expected_behavior": [
    "Creates a wallet first using POST /public/v1/submit/create_wallet",
    "Derives an Ethereum address",
    "Signs and sends the transaction via POST /public/v1/submit/sign_transaction"
  ]
}
```

## Running Evals

```bash
# Validate structure
npx tsx skills/creating-skills/scripts/validate.ts skills/your-skill

# Test triggers
npx tsx skills/creating-skills/scripts/eval-triggers.ts --skill your-skill

# Improve if failing
npx tsx skills/creating-skills/scripts/eval-loop.ts --skill your-skill

# Generate report
npx tsx skills/creating-skills/scripts/generate-report.ts --skill your-skill
```
