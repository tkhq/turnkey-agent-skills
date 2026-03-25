# Worked Example: Creating a Cosmos Signing Skill

This walks through the full process of creating a new skill from scratch.

## Study Existing Skills

Read `skills/signing-transactions-api/SKILL.md` since it is the closest pattern (multi-chain signing skill). Note the structure: Quick Start, Prerequisites, Instructions with descriptive headings, Rules, Related Skills. Note how the SKILL.md keeps chain-specific commands brief and delegates full examples to the `references/` directory.

Also note the naming convention: primitives use `managing-{resource}-api` or `{action}-{resource}-api`, workflows use `{purpose}-workflow`.

## Research

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

## Draft

### Create directory

```bash
mkdir -p skills/signing-cosmos-api/{references,evals}
```

### Write SKILL.md

```yaml
---
name: signing-cosmos-api
description: "Signs and broadcasts Cosmos ecosystem transactions using the Turnkey HTTP API. Covers ATOM transfers, IBC transfers, and staking operations. Use when asked to 'send ATOM', 'sign a Cosmos transaction', 'stake ATOM', 'do an IBC transfer', or 'interact with a Cosmos chain'. Do NOT use for wallet creation (use managing-wallets-api), general multi-chain signing (use signing-transactions-api), or policies (use managing-policies-api)."
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

Requires API credentials configured via the managing-users-api skill. All requests must be signed with your P-256 key pair using Turnkey's stamp authentication.

## Instructions

Request bodies below show the `parameters` object for clarity. The full API envelope wraps these as: `{"type": "ACTIVITY_TYPE_...", "timestampMs": "<ms>", "organizationId": "<ORG_ID>", "parameters": { ... }}`. Query endpoints require `organizationId` in the request body.

Every submit endpoint returns an activity object: `{ activity: { id, status, type, result } }`. Check `activity.status` for completion.

### Sign a Raw Cosmos Payload

POST /public/v1/submit/sign_raw_payload
...brief code pattern...

### Broadcast to Cosmos Network

...brief code pattern...

## Rules

- Use `SignRawPayload` with the correct Cosmos address format
- Always set the correct chain ID and RPC endpoint for the target chain
- For IBC transfers, verify the channel and port are correct before signing

## Related Skills

- `managing-wallets-api` for Cosmos address derivation
- `managing-policies-api` for Cosmos-specific policies
- `signing-transactions-api` for general multi-chain signing patterns
```

Note the key patterns in this SKILL.md:
- **Descriptive headings** ("Sign a Raw Cosmos Payload", "Broadcast to Cosmos Network") instead of "Step 1:", "Step 2:"
- **Activity envelope note** at the top of Instructions explaining the request body format
- **Description includes both positive and negative trigger phrases** ("Use when asked to..." and "Do NOT use for...")
- **Naming follows the convention**: `signing-cosmos-api` for a primitive

### Write references/cosmos-examples.md

Full, self-contained API examples for:
- ATOM transfer
- IBC transfer
- Staking delegation

### Write evals

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
    "skills": ["signing-cosmos-api"],
    "query": "Send 10 ATOM to cosmos1abc...",
    "expected_behavior": [
      "Uses POST /public/v1/submit/sign_raw_payload",
      "Specifies the correct Cosmos address and chain ID",
      "Signs with the correct denom and amount"
    ]
  },
  {
    "skills": ["signing-cosmos-api"],
    "query": "Use Ethereum signing to sign a Cosmos transaction",
    "expected_behavior": [
      "Corrects the user: Ethereum signing uses different address formats than Cosmos",
      "Recommends the correct Cosmos signing approach via the sign_raw_payload endpoint"
    ]
  },
  {
    "skills": ["managing-wallets-api", "signing-cosmos-api"],
    "query": "Create a Cosmos wallet and send ATOM",
    "expected_behavior": [
      "Creates wallet with ADDRESS_FORMAT_COSMOS",
      "Uses the derived address for signing"
    ]
  },
  {
    "skills": ["signing-cosmos-api"],
    "query": "Do an IBC transfer of ATOM from Cosmos Hub to Osmosis",
    "expected_behavior": [
      "Uses the IBC transfer message type",
      "Specifies the correct source channel and port"
    ]
  }
]
```

## Validate

```bash
npx tsx skills/creating-skills/scripts/validate.ts skills/signing-cosmos-api
# Expected: PASS
```

## Evaluate Triggers

```bash
npx tsx skills/creating-skills/scripts/eval-triggers.ts --skill signing-cosmos-api
# Expected: 90%+ trigger accuracy
```

## Iterate if Needed

If "Do an IBC transfer from Cosmos Hub to Osmosis" fails to trigger, the description might need "IBC" as a more prominent keyword. Run:

```bash
npx tsx skills/creating-skills/scripts/eval-loop.ts --skill signing-cosmos-api --max-iterations 3
```

## Generate Report

```bash
npx tsx skills/creating-skills/scripts/generate-report.ts --skill signing-cosmos-api
# Opens HTML report showing all results
```

## Key Takeaways

- Study an existing skill first (saves time, ensures consistency)
- Research the specific Turnkey API endpoints before writing
- Write evals BEFORE polishing the skill content (eval-driven development)
- The description is the most important part (it controls discovery)
- Include both positive trigger phrases ("Use when asked to...") and negative exclusions ("Do NOT use for...")
- Use descriptive headings in Instructions, not numbered steps
- Include the activity envelope note at the top of Instructions
- Follow naming conventions: `managing-{resource}-api` for primitives, `{purpose}-workflow` for workflows
- Keep SKILL.md under 300 lines, put full examples in references
