---
name: onboarding-workflow
description: "Guides a brand-new user through zero-to-first-wallet setup on Turnkey. Covers parent organization creation, root user API key provisioning, programmatic wallet creation, non-human signing agent setup, and scoped policy creation. Use when asked to 'set up Turnkey', 'create a Turnkey account', 'get started with Turnkey', 'create my first wallet on Turnkey', 'onboard to Turnkey', or 'provision a signing agent from scratch'. Not for managing existing wallets (use managing-wallets-api), rotating credentials (use managing-users-api), or advanced agent persona management (use agentic-wallet-workflow)."
license: Apache-2.0
compatibility: "Steps 1-2 require dashboard access at app.turnkey.com and a passkey-capable device. Steps 3-5 require Node.js with @turnkey/sdk-server and @turnkey/crypto."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["workflow", "onboarding", "getting-started", "wallet", "agent", "policies"]
---

# Onboarding Workflow

## Quick Start

Guide a user from zero to a fully provisioned Turnkey environment: a parent organization, a wallet, a non-human signing agent, and a scoped policy — ready for programmatic signing.

## Two Agents, Five Steps

Two distinct agents are involved throughout:

- **Provisioning agent** — you. Guide the user through two manual dashboard steps, then use the credentials obtained to execute the remaining steps via the Turnkey API on the user's behalf.
- **Signing agent** — the bounded, non-human API key user you will create in step 4. This is the entity that will ultimately be permitted to sign transactions, scoped by the policy you create in step 5.

Work through each step in order. For the manual steps, confirm completion before proceeding. For the API steps, execute the call, confirm the result, and surface any relevant IDs before moving on.

**Before starting:** Ask the user whether they have already completed any of these steps and skip ahead to the first incomplete one.

For any Turnkey API calls, SDK usage, or policy language questions beyond what is covered here, use `mcp__claude_ai_Turnkey_Docs__search_turnkey` before proceeding.

## Phase 1: Manual Dashboard Setup

### Step 1: Create a Parent Organization

**What this is:** The parent organization is the top-level entity in Turnkey. Everything else — wallets, users, policies — lives inside it. A human user (the org owner) is created alongside it, authenticated via passkey.

1. Direct the user to: https://app.turnkey.com/dashboard/auth/initial
2. The user registers with their email and verifies via the link Turnkey sends.
3. After verification, the user will be prompted to create a **passkey** — this is the only supported login method for the Turnkey dashboard.
4. Once the passkey is created, the user is logged into their new parent organization.

**Confirm before continuing:** Ask the user to confirm they can see their Turnkey dashboard and are logged in.

---

### Step 2: Issue API Credentials to the Root User

**What this is:** Before you can make any Turnkey API calls, the root user needs an API key pair associated with their account. This is the last manual step — once these credentials are in your hands, the remainder of the flow runs programmatically.

1. Tell the user to navigate to the **Users** tab and click on their **Root user** entry.
2. On the user detail screen, tell them to click **"+ Create API key"** and follow these steps:
   - Generate in-browser (not via CLI)
   - Enter a label for the key
   - The next screen will display the **API public key** and **API private key**, with a **"Download JSON"** button — the user must save both keys now, as the private key will not be shown again
   - Click **"Approve"** and authenticate with their passkey — the key is not registered until passkey approval is confirmed; backing out at any point cancels the action
3. Tell the user to retrieve their **Org ID**, visible by clicking the **"Root user"** tab in the top-right corner of the dashboard.
4. Do not ask the user to paste credentials into the chat. Instead:
   - Check whether a `.env` file already exists in the working directory. If it does, check for `TURNKEY_API_PUBLIC_KEY`, `TURNKEY_API_PRIVATE_KEY`, and `TURNKEY_ORGANIZATION_ID` and add any that are missing as empty placeholders. If no `.env` exists, create one:
     ```
     TURNKEY_API_PUBLIC_KEY=
     TURNKEY_API_PRIVATE_KEY=
     TURNKEY_ORGANIZATION_ID=
     ```
   - Check whether `.env` is in `.gitignore` — if not, add it.
   - Ask the user to fill in the three values and save the file.
5. Read the file and parse the credentials.

**Confirm before continuing:** Confirm you have all three values and can initialize a Turnkey API client.

## Phase 2: API Provisioning

### Step 3: Create a Wallet

**What this is:** A Turnkey wallet is an HD (hierarchical deterministic) wallet — a single seed from which one or more accounts can be derived. Each account is defined by its address type, curve, and derivation path. The same account is compatible with any chain that shares those parameters — an Ethereum-type account works on all EVM chains, for example.

1. Ask the user what address type they want. Ethereum (EVM), Solana, and Bitcoin are the most common starting points, each with well-established defaults. The full list is at https://docs.turnkey.com/concepts/wallets#address-formats-and-curves
2. Initialize a Turnkey API client using the credentials from step 2 (`@turnkey/sdk-server`: `new Turnkey({ apiBaseUrl, apiPublicKey, apiPrivateKey, defaultOrganizationId }).apiClient()`).
3. Ask the user for a wallet name, then call `createWallet()` with the wallet name and appropriate account parameters for the chosen address type.
4. Capture the **wallet ID** from the response — you will need it for step 5.

**Confirm before continuing:** Surface the wallet ID and derived account address(es) to the user. They can verify in the **Wallets** tab of the dashboard.

---

### Step 4: Create the Signing Agent

**What this is:** The signing agent is a non-root, non-human user — a service account that will authenticate signing requests to the Turnkey API via its own key pair. It is a distinct entity from you (the provisioning agent) and will be granted only the permissions defined in step 5.

1. Generate a P-256 key pair for the signing agent. Using `@turnkey/crypto`: `generateP256KeyPair()` returns `{ privateKey, compressedPublicKey }`. Register the `compressedPublicKey` with Turnkey; the `privateKey` is what the signing agent uses at runtime.
2. Ask the user for a name and API key label for the signing agent, then call the Turnkey API to create a new user with API key access, supplying the name and `compressedPublicKey` as its credential. Use `mcp__claude_ai_Turnkey_Docs__search_turnkey` to confirm the exact method and parameters.
3. Capture the **signing agent's user ID** from the response — you will need it for step 5.
4. Surface the signing agent's private key to the user and ensure they save it securely — it cannot be retrieved from Turnkey later.

**Confirm before continuing:** Surface the signing agent's user ID and public key to the user. Confirm the private key has been saved. They can verify the new user in the **Users** tab of the dashboard.

---

### Step 5: Create a Policy for the Signing Agent

**What this is:** By default, the signing agent has no permissions. Policies grant the right to act and define the security boundary — what the signing agent is and is not allowed to do. A policy that is too broad is a security risk; one that is too narrow will silently block legitimate actions.

1. Present the example policies below and help the user select or adapt one. Substitute all placeholders with real values.
2. Call the Turnkey API to create the policy. Use `mcp__claude_ai_Turnkey_Docs__search_turnkey` to confirm the exact method and parameters.

#### Policy language

Turnkey policies use a JSON structure with three fields:

- `effect` — `"EFFECT_ALLOW"` or `"EFFECT_DENY"`
- `consensus` — *who* must approve (evaluated against the approving user(s))
- `condition` — *what* action is permitted (evaluated against the activity being requested)

Full reference: https://docs.turnkey.com/concepts/policies/language

Examples by use case:
- Signing control: https://docs.turnkey.com/concepts/policies/examples/signing-control
- Ethereum/EVM: https://docs.turnkey.com/concepts/policies/examples/ethereum
- Solana/SVM: https://docs.turnkey.com/concepts/policies/examples/solana

#### Placeholder reference

- `<SIGNING_AGENT_ID>` — signing agent's user ID, from step 4
- `<ROOT_USER_ID>` — root user's ID, visible in the Users tab
- `<WALLET_ID>` — wallet ID from step 3 (use to scope to a specific wallet if supported — check activity parameters via `mcp__claude_ai_Turnkey_Docs__search_turnkey`)

#### Example policies

_Allow the signing agent to make a specific contract call on EVM mainnet:_
```json
{
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '<SIGNING_AGENT_ID>')",
  "condition": "eth.tx.to == '<CONTRACT_ADDRESS>' && eth.tx.data[0..10] == '<FUNCTION_SELECTOR>' && eth.tx.chain_id == 1"
}
```

_Require both signing agent and root user approval for any signing (dual-control):_
```json
{
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '<SIGNING_AGENT_ID>') && approvers.any(user, user.id == '<ROOT_USER_ID>')",
  "condition": "activity.action == 'SIGN'"
}
```

_Allow the signing agent to delete itself:_
```json
{
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '<SIGNING_AGENT_ID>')",
  "condition": "activity.type == 'ACTIVITY_TYPE_DELETE_USERS' && activity.params.user_ids.count() == 1 && '<SIGNING_AGENT_ID>' in activity.params.user_ids"
}
```

**Confirm before continuing:** Confirm the policy was created. The user can verify in the **Security** tab of the dashboard under the Policies list.

## Done

The user now has:

- A **parent organization** with themselves as root user
- A **wallet** with one or more derived accounts for their chosen address type
- A **signing agent** — a non-human API key user with its own key pair
- A **policy** defining exactly what the signing agent is permitted to do

The signing agent's `TURNKEY_API_PRIVATE_KEY` and `TURNKEY_ORGANIZATION_ID` are what downstream code will need to authenticate and submit signing requests.

**A note on pricing:** New organizations start on the **Free** plan, which has limits that may be reached quickly. Paid tiers:
- **Pay as You Go** — usage-based, no monthly commitment
- **Pro** — $99/month, improved limits

For usage at scale, contact Turnkey about **Enterprise** tiers. Full details at https://www.turnkey.com/pricing

## Rules

- Always confirm manual steps are complete before proceeding to API steps.
- Never ask the user to paste API credentials into the chat — use a `.env` file.
- The signing agent must be a non-root user. Root users bypass all policies.
- Surface all captured IDs (wallet ID, signing agent user ID) to the user before moving on.
- The signing agent's private key cannot be retrieved from Turnkey after creation — ensure it is saved before closing the step.

## Related Skills

- `managing-wallets-api` for wallet and account management beyond initial creation
- `managing-users-api` for API key rotation and user management
- `managing-policies-api` for policy management and access control
- `agentic-wallet-workflow` for advanced agent persona management and day-2 operations
