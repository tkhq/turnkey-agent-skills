# Worked Example: Creating a Cosmos Signing Skill

This walks through the full process of creating a new skill from scratch.

## Step 1: Study Existing Skills

Read `skills/signing-transactions-api/SKILL.md` since it is the closest pattern (multi-chain signing skill). Note the structure: Quick Start, Prerequisites, Instructions, Signing Methods, Gotchas, Rules, Related Skills. Note how the SKILL.md keeps chain-specific commands brief and delegates full examples to the `references/` directory.

## Step 2: Research

Search Turnkey docs for Cosmos support using available sources:

**Option A: MCP tool (if available)**
```
search_turnkey("Cosmos signing CosmJS")
```

**Option B: Docs website**
1. Fetch https://docs.turnkey.com/llms.txt and search for "cosmos"
2. Find the relevant page (e.g., https://docs.turnkey.com/networks/cosmos)
3. Fetch that page for full details

Key findings from research:
- Uses `CURVE_SECP256K1` with `ADDRESS_FORMAT_COSMOS` for address derivation
- Can sign via `POST /public/v1/submit/sign_raw_payload` endpoint
- Requires the wallet to have a Cosmos-formatted account derived

## Step 3: Draft

### 3a. Create directory

```bash
mkdir -p skills/signing-cosmos/{references,evals}
```

### 3b. Write SKILL.md

```yaml
---
name: signing-cosmos
description: "Signs and broadcasts Cosmos ecosystem transactions using Turnkey with CosmJS. Covers ATOM transfers, IBC transfers, and staking operations. Use when asked to 'send ATOM', 'sign a Cosmos transaction', 'stake ATOM', 'do an IBC transfer', or 'interact with a Cosmos chain'."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). See managing-users-api for authentication setup."
metadata:
  version: "1.0.0"
  tags: ["cosmos", "signing", "cosmjs", "atom", "ibc"]
---

# Signing Cosmos Transactions

## Quick Start

Use the Turnkey API to sign Cosmos transactions via `POST /public/v1/submit/sign_raw_payload`.

## Prerequisites

...npm install command...

## Environment Variables

...env block...

## Instructions

...step-by-step with brief code patterns...

## Rules

- Use `SignRawPayload` with the correct Cosmos address format
- Always set the correct chain ID and RPC endpoint for the target chain
- For IBC transfers, verify the channel and port are correct before signing

## Related Skills

- `managing-wallets-api` for Cosmos address derivation
- `managing-policies-api` for Cosmos-specific policies
```

### 3c. Write references/cosmos-examples.md

Full, self-contained API examples for:
- ATOM transfer
- IBC transfer
- Staking delegation

### 3d. Write evals

**evals/triggers.json:**
```json
{
  "should_trigger": [
    "Send 10 ATOM to this Cosmos address",
    "Sign a Cosmos transaction using Turnkey",
    "Stake ATOM with a validator",
    "Do an IBC transfer from Cosmos Hub to Osmosis"
  ],
  "should_not_trigger": [
    "Send ETH on Ethereum",
    "Create a Cosmos wallet",
    "Sign a Solana transaction",
    "What is IBC?"
  ]
}
```

**evals/evals.json:**
```json
[
  {
    "skills": ["signing-cosmos"],
    "query": "Send 10 ATOM to cosmos1abc...",
    "expected_behavior": [
      "Uses POST /public/v1/submit/sign_raw_payload",
      "Specifies the correct Cosmos address and chain ID",
      "Signs with the correct denom and amount"
    ]
  },
  {
    "skills": ["signing-cosmos"],
    "query": "Use Ethereum signing to sign a Cosmos transaction",
    "expected_behavior": [
      "Corrects the user: Ethereum signing uses different address formats than Cosmos",
      "Recommends the correct Cosmos signing approach via the sign_raw_payload endpoint"
    ]
  },
  {
    "skills": ["managing-wallets-api", "signing-cosmos"],
    "query": "Create a Cosmos wallet and send ATOM",
    "expected_behavior": [
      "Creates wallet with ADDRESS_FORMAT_COSMOS",
      "Uses the derived address for signing"
    ]
  },
  {
    "skills": ["signing-cosmos"],
    "query": "Do an IBC transfer of ATOM from Cosmos Hub to Osmosis",
    "expected_behavior": [
      "Uses the IBC transfer message type",
      "Specifies the correct source channel and port"
    ]
  }
]
```

## Step 4: Validate

```bash
npx tsx skills/creating-skills/scripts/validate.ts skills/signing-cosmos
# Expected: PASS
```

## Step 5: Evaluate Triggers

```bash
npx tsx skills/creating-skills/scripts/eval-triggers.ts --skill signing-cosmos
# Expected: 90%+ trigger accuracy
```

## Step 6: Iterate if Needed

If "Do an IBC transfer from Cosmos Hub to Osmosis" fails to trigger, the description might need "IBC" as a more prominent keyword. Run:

```bash
npx tsx skills/creating-skills/scripts/eval-loop.ts --skill signing-cosmos --max-iterations 3
```

## Step 7: Generate Report

```bash
npx tsx skills/creating-skills/scripts/generate-report.ts --skill signing-cosmos
# Opens HTML report showing all results
```

## Key Takeaways

- Study an existing skill first (saves time, ensures consistency)
- Research the specific Turnkey API endpoints before writing
- Write evals BEFORE polishing the skill content (eval-driven development)
- The description is the most important part (it controls discovery)
- Keep SKILL.md under 300 lines, put full examples in references
