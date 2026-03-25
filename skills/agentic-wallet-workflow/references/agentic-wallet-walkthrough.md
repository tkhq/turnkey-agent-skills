# Agentic Wallet: End-to-End Walkthrough

This walkthrough follows the recommended sub-org path to set up an Ethereum-only agent with signing permissions and spending guardrails. Every API call shows the full request and response JSON.

Base URL: `https://api.turnkey.com`

All submit requests use the envelope format: `{"type": "ACTIVITY_TYPE_...", "timestampMs": "<ms>", "organizationId": "<ORG_ID>", "parameters": { ... }}`. The examples below show the full envelope where relevant.

## Step 1: Create Sub-Organization with Wallet

Create an isolated sub-org for the agent. Include a wallet in the same call so the sub-org and wallet are created atomically.

**Request:**

```
POST /public/v1/submit/create_sub_organization
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V7",
  "timestampMs": "1700000000000",
  "organizationId": "org-parent-id-1234",
  "parameters": {
    "subOrganizationName": "agent-trading-bot",
    "rootUsers": [
      {
        "userName": "admin",
        "userEmail": "admin@company.com",
        "apiKeys": [
          {
            "apiKeyName": "admin-key",
            "publicKey": "04abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
            "curveType": "API_KEY_CURVE_P256"
          }
        ],
        "authenticators": [],
        "oauthProviders": []
      }
    ],
    "rootQuorumThreshold": 1,
    "wallet": {
      "walletName": "agent-wallet",
      "accounts": [
        {
          "curve": "CURVE_SECP256K1",
          "pathFormat": "PATH_FORMAT_BIP32",
          "path": "m/44'/60'/0'/0/0",
          "addressFormat": "ADDRESS_FORMAT_ETHEREUM"
        }
      ]
    }
  }
}
```

**Response:**

```json
{
  "activity": {
    "id": "act-create-suborg-001",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V7",
    "organizationId": "org-parent-id-1234",
    "result": {
      "createSubOrganizationResultV7": {
        "subOrganizationId": "suborg-agent-5678",
        "rootUserIds": ["user-admin-001"],
        "wallet": {
          "walletId": "wallet-agent-9012",
          "addresses": ["0x1234abcd5678ef901234abcd5678ef901234abcd"]
        }
      }
    }
  }
}
```

Save these values:
- `subOrganizationId`: `suborg-agent-5678` (used as `organizationId` in all subsequent calls)
- `walletId`: `wallet-agent-9012`
- Wallet address: `0x1234abcd5678ef901234abcd5678ef901234abcd`

## Step 2: Create the Agent User (Non-Root)

Create a non-root user for the agent inside the sub-org. Generate the agent's P-256 key pair locally first, then register the public key here.

**Request:**

```
POST /public/v1/submit/create_users
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_USERS_V2",
  "timestampMs": "1700000001000",
  "organizationId": "suborg-agent-5678",
  "parameters": {
    "users": [
      {
        "userName": "trading-agent",
        "apiKeys": [
          {
            "apiKeyName": "agent-key-v1",
            "publicKey": "04fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba09876543",
            "curveType": "API_KEY_CURVE_P256"
          }
        ],
        "authenticators": [],
        "userTags": ["agent"]
      }
    ]
  }
}
```

**Response:**

```json
{
  "activity": {
    "id": "act-create-users-002",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_USERS_V2",
    "organizationId": "suborg-agent-5678",
    "result": {
      "createUsersResultV2": {
        "userIds": ["user-agent-003"]
      }
    }
  }
}
```

Save `userId`: `user-agent-003`. The `agent` tag is critical for policy targeting.

## Step 3: Create ALLOW Policy for Signing

Grant the agent permission to sign with its wallet. The consensus expression targets any user with the `agent` tag. The condition restricts signing to this specific wallet.

**Request:**

```
POST /public/v1/submit/create_policy
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_POLICY_V3",
  "timestampMs": "1700000002000",
  "organizationId": "suborg-agent-5678",
  "parameters": {
    "policyName": "agent-can-sign",
    "effect": "EFFECT_ALLOW",
    "consensus": "approvers.any(user, user.tags.contains('agent'))",
    "condition": "activity.action == 'SIGN' && wallet.id == 'wallet-agent-9012'",
    "notes": "Allow agent to sign payloads with its designated wallet"
  }
}
```

**Response:**

```json
{
  "activity": {
    "id": "act-create-policy-003",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_POLICY_V3",
    "organizationId": "suborg-agent-5678",
    "result": {
      "createPolicyResult": {
        "policyId": "policy-allow-sign-001"
      }
    }
  }
}
```

## Step 4: Create DENY Guardrails

Block the agent from admin operations and large transfers. These are separate policies because the policy engine does not short-circuit: combining `activity.action` checks with `eth.tx.value` in one condition would cause evaluation errors on non-EVM actions.

**Request:**

```
POST /public/v1/submit/create_policies
```

```json
{
  "type": "ACTIVITY_TYPE_CREATE_POLICIES",
  "timestampMs": "1700000003000",
  "organizationId": "suborg-agent-5678",
  "parameters": {
    "policies": [
      {
        "policyName": "agent-deny-admin-ops",
        "effect": "EFFECT_DENY",
        "condition": "activity.resource in ['USER', 'POLICY', 'ORGANIZATION'] || (activity.resource == 'WALLET' && activity.action in ['DELETE', 'EXPORT'])",
        "notes": "Block agent from administrative operations"
      },
      {
        "policyName": "agent-deny-large-eth-transfers",
        "effect": "EFFECT_DENY",
        "condition": "eth.tx.value > 1000000000000000000",
        "notes": "Block ETH transfers above 1 ETH (1e18 wei)"
      },
      {
        "policyName": "agent-deny-unapproved-addresses",
        "effect": "EFFECT_DENY",
        "condition": "eth.tx.to != '0xApprovedContractAddress'",
        "notes": "Block transfers to unapproved addresses. Update the address list as needed."
      }
    ]
  }
}
```

**Response:**

```json
{
  "activity": {
    "id": "act-create-policies-004",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_POLICIES",
    "organizationId": "suborg-agent-5678",
    "result": {
      "createPoliciesResult": {
        "policyIds": ["policy-deny-admin-001", "policy-deny-large-eth-001", "policy-deny-unapproved-001"]
      }
    }
  }
}
```

## Step 5: Test Signature with Agent Credentials

Sign a test payload using the agent's API key to verify the entire setup works. This request must be signed with the agent's credentials (not the admin's).

**Request:**

```
POST /public/v1/submit/sign_raw_payload
```

```json
{
  "type": "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2",
  "timestampMs": "1700000004000",
  "organizationId": "suborg-agent-5678",
  "parameters": {
    "signWith": "0x1234abcd5678ef901234abcd5678ef901234abcd",
    "payload": "68656c6c6f",
    "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
    "hashFunction": "HASH_FUNCTION_NO_OP"
  }
}
```

**Response (success):**

```json
{
  "activity": {
    "id": "act-sign-test-005",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2",
    "organizationId": "suborg-agent-5678",
    "result": {
      "signRawPayloadResult": {
        "r": "abc123...",
        "s": "def456...",
        "v": "1b"
      }
    }
  }
}
```

If the status is `ACTIVITY_STATUS_FAILED`, the policy setup is wrong. Debug it with `get_policy_evaluations` (see Step 6 below).

## Step 6: Output Credentials for Agent Runtime

After a successful test signature, hand these values to the admin for injection into the agent's environment:

```
TURNKEY_API_PUBLIC_KEY=04fedcba0987654321...  (agent's public key from Step 2)
TURNKEY_API_PRIVATE_KEY=<agent-private-key>    (generated locally, never sent to Turnkey)
TURNKEY_ORGANIZATION_ID=suborg-agent-5678      (the sub-org ID from Step 1)
SIGN_WITH=0x1234abcd5678ef901234abcd5678ef901234abcd  (wallet address from Step 1)
```

The agent is now operational.

## Debugging: Policy Evaluation Trace

If the test signature (or any agent action) is denied, retrieve the policy evaluation trace to understand why.

**Request:**

```
POST /public/v1/query/get_policy_evaluations
```

```json
{
  "organizationId": "suborg-agent-5678",
  "activityId": "act-sign-test-005"
}
```

**Response:**

```json
{
  "policyEvaluations": [
    {
      "policyId": "policy-allow-sign-001",
      "policyName": "agent-can-sign",
      "effect": "EFFECT_ALLOW",
      "consensusMatched": true,
      "conditionMatched": true
    },
    {
      "policyId": "policy-deny-large-eth-001",
      "policyName": "agent-deny-large-eth-transfers",
      "effect": "EFFECT_DENY",
      "consensusMatched": true,
      "conditionMatched": true
    }
  ],
  "outcome": "DENY"
}
```

In this example, the DENY policy matched because the transfer exceeded the 1 ETH limit. The fix is to either lower the transfer amount or update the spending limit policy.

## Policy Expression Examples

These are working policy expressions for common agent scenarios.

### Sign-only access for a tagged user

```
effect: EFFECT_ALLOW
consensus: approvers.any(user, user.tags.contains('agent'))
condition: activity.action == 'SIGN' && wallet.id == '<WALLET_ID>'
```

### Sign + manage wallet accounts

These require two separate policies because `activity.action == 'SIGN'` applies to signing contexts (where `wallet.id` is available), while `activity.resource == 'WALLET' && activity.action == 'CREATE'` applies to wallet management contexts. Combining them with `||` in one condition would cause evaluation errors due to the policy engine not short-circuiting.

**Policy 1: signing**
```
effect: EFFECT_ALLOW
consensus: approvers.any(user, user.tags.contains('agent'))
condition: activity.action == 'SIGN' && wallet.id == '<WALLET_ID>'
```

**Policy 2: wallet account creation**
```
effect: EFFECT_ALLOW
consensus: approvers.any(user, user.tags.contains('agent'))
condition: activity.resource == 'WALLET' && activity.action == 'CREATE'
```

### Address allowlist (EVM)

```
effect: EFFECT_ALLOW
consensus: approvers.any(user, user.tags.contains('agent'))
condition: eth.tx.to in ['0xContractA', '0xContractB', '0xContractC']
```

### Spending cap (EVM, 0.1 ETH)

```
effect: EFFECT_DENY
condition: eth.tx.value > 100000000000000000
```

### Block admin operations

```
effect: EFFECT_DENY
condition: activity.resource in ['USER', 'POLICY', 'ORGANIZATION'] || (activity.resource == 'WALLET' && activity.action in ['DELETE', 'EXPORT'])
```

### Solana program restriction

```
effect: EFFECT_ALLOW
consensus: approvers.any(user, user.tags.contains('agent'))
condition: solana.tx.program_keys.all(p, p == '<ALLOWED_PROGRAM_ID>')
```
