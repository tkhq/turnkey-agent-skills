# Provisioning Walkthrough

> **CLI migration:** This is retained API parameter/semantic reference material. Execute supported core operations through the commands in the parent SKILL.md and root CLI convention. SDK authentication, stamping, inline key-generation scripts, and old envelope/retry instructions below are superseded. Import/export crypto and unvalidated request bridges remain explicit gaps; this reference alone does not establish CLI completion. Existing user authorization takes precedence over blanket per-call confirmation wording in legacy examples.


Complete request/response JSON for provisioning an Ethereum agent in the parent org. Every API call shows the full request and response.

**Base URL:** `https://api.turnkey.com`

## Request body convention

The JSON bodies below are the `parameters` object — the shape SDK methods accept. For raw HTTP against `POST /public/v1/submit/*` endpoints, wrap in the activity envelope: `{"type": "ACTIVITY_TYPE_*", "timestampMs": "<ms>", "organizationId": "<ORG_ID>", "parameters": {...}}`. Query endpoints (`POST /public/v1/query/*`) take the body as shown. Activity types follow the endpoint path (`create_wallet` → `ACTIVITY_TYPE_CREATE_WALLET`, `create_users` → `ACTIVITY_TYPE_CREATE_USERS_V3`, `create_policy` → `ACTIVITY_TYPE_CREATE_POLICY_V3`, `create_user_tag` → `ACTIVITY_TYPE_CREATE_USER_TAG`, `sign_transaction` → `ACTIVITY_TYPE_SIGN_TRANSACTION_V2`). See the root [`SKILL.md`](../../../SKILL.md) for the full convention.

## Step 1: Check for existing wallets

```
POST /public/v1/query/list_wallets
```

```json
{
  "organizationId": "org-12345678-abcd-1234-abcd-1234567890ab"
}
```

**Response (no wallets):**

```json
{
  "wallets": []
}
```

## Step 2: Create the agent's wallet

```
POST /public/v1/submit/create_wallet
```

```json
{
  "walletName": "agent-wallet",
  "accounts": [
    {
      "curve": "CURVE_SECP256K1",
      "pathFormat": "PATH_FORMAT_BIP32",
      "path": "m/44'/60'/0'/0/0",
      "addressFormat": "ADDRESS_FORMAT_ETHEREUM"
    }
  ],
  "mnemonicLength": 12
}
```

**Response:**

```json
{
  "activity": {
    "id": "act-create-wallet-001",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_WALLET",
    "result": {
      "createWalletResult": {
        "walletId": "wlt-agent-9012",
        "addresses": [
          "0x1234abcd5678ef901234abcd5678ef901234abcd"
        ]
      }
    }
  }
}
```

Save: `walletId` = `wlt-agent-9012`, address = `0x1234abcd5678ef901234abcd5678ef901234abcd`

## Step 3: Create the agent user (non-root)

First create the `agent` tag so you have a `userTagId` to assign. (`create_users.userTags` takes tag IDs, not names.)

```
POST /public/v1/submit/create_user_tag
```

```json
{
  "userTagName": "agent",
  "userIds": []
}
```

**Response:**

```json
{
  "activity": {
    "id": "act-create-tag-001",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_USER_TAG",
    "result": {
      "createUserTagResult": {
        "userTagId": "tag-agent-001"
      }
    }
  }
}
```

Obtain the agent's public key from `tk api-key generate --output PATH` or an explicitly supplied public key. Register only that public key and pass the tag UUID; the parent skill owns the CLI sequence.

```
POST /public/v1/submit/create_users
```

```json
{
  "users": [
    {
      "userName": "trading-agent",
      "apiKeys": [
        {
          "apiKeyName": "agent-key-v1",
          "publicKey": "02fedcba0987654321fedcba0987654321fedcba0987654321fedcba09876543",
          "curveType": "API_KEY_CURVE_P256"
        }
      ],
      "authenticators": [],
      "oauthProviders": [],
      "userTags": ["tag-agent-001"]
    }
  ]
}
```

**Response:**

```json
{
  "activity": {
    "id": "act-create-users-002",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_USERS_V3",
    "result": {
      "createUsersResult": {
        "userIds": ["usr-agent-003"]
      }
    }
  }
}
```

Save: `userId` = `usr-agent-003`. The `agent` tag enables policy targeting.

## Step 4: Create the ALLOW policy

**Present this policy to the human and get explicit confirmation.**

"This policy allows any user carrying the agent tag (`tag-agent-001`) to sign chain-aware transactions using wallet `wlt-agent-9012`. It does not allow raw payload signing, and it does not restrict destination addresses or amounts. The agent cannot perform any other actions (default deny)."

```
POST /public/v1/submit/create_policy
```

```json
{
  "policyName": "agent-can-sign",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('tag-agent-001'))",
  "condition": "activity.type in ['ACTIVITY_TYPE_SIGN_TRANSACTION_V2', 'ACTIVITY_TYPE_ETH_SEND_TRANSACTION', 'ACTIVITY_TYPE_SOL_SEND_TRANSACTION'] && wallet.id == 'wlt-agent-9012'",
  "notes": "Allow agent to sign chain-aware transactions with its designated wallet; raw payload signing is excluded"
}
```

**Response:**

```json
{
  "activity": {
    "id": "act-create-policy-003",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_POLICY_V3",
    "result": {
      "createPolicyResult": {
        "policyId": "pol-allow-sign-001"
      }
    }
  }
}
```

### Optional: Add a spending cap DENY

"This policy blocks all ETH transfers above 0.1 ETH for any user. It overrides the ALLOW policy above for large transfers."

```json
{
  "policyName": "deny-large-eth",
  "effect": "EFFECT_DENY",
  "condition": "eth.tx.value > 100000000000000000",
  "notes": "Block transfers above 0.1 ETH (100000000000000000 wei)"
}
```

### Verify the full policy set

```
POST /public/v1/query/list_policies
```

```json
{
  "organizationId": "org-12345678-abcd-1234-abcd-1234567890ab"
}
```

**Response:**

```json
{
  "policies": [
    {
      "policyId": "pol-allow-sign-001",
      "policyName": "agent-can-sign",
      "effect": "EFFECT_ALLOW",
      "consensus": "approvers.any(user, user.tags.contains('tag-agent-001'))",
      "condition": "activity.type in ['ACTIVITY_TYPE_SIGN_TRANSACTION_V2', 'ACTIVITY_TYPE_ETH_SEND_TRANSACTION', 'ACTIVITY_TYPE_SOL_SEND_TRANSACTION'] && wallet.id == 'wlt-agent-9012'"
    },
    {
      "policyId": "pol-deny-large-001",
      "policyName": "deny-large-eth",
      "effect": "EFFECT_DENY",
      "condition": "eth.tx.value > 100000000000000000"
    }
  ]
}
```

Confirm with the human that this matches their intent before proceeding.

## Step 5: Verify with agent credentials

**Switch to the agent's credentials for this request.** Sign a chain-aware test transaction with the agent's API key, not the root key. Do not use `sign_raw_payload` unless the human explicitly approved it as an exception.

```
POST /public/v1/submit/sign_transaction
```

```json
{
  "signWith": "0x1234abcd5678ef901234abcd5678ef901234abcd",
  "unsignedTransaction": "0x02f86c...",
  "type": "TRANSACTION_TYPE_ETHEREUM"
}
```

**Response (success):**

```json
{
  "activity": {
    "id": "act-sign-test-005",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_SIGN_TRANSACTION_V2",
    "result": {
      "signTransactionResult": {
        "signedTransaction": "0x02f86c..."
      }
    }
  }
}
```

If it fails, debug with `get_policy_evaluations`:

```
POST /public/v1/query/get_policy_evaluations
```

```json
{
  "organizationId": "org-12345678-abcd-1234-abcd-1234567890ab",
  "activityId": "act-sign-test-005"
}
```

## Step 6: Output agent credentials

```env
# AGENT CREDENTIALS (scoped, non-root)
TURNKEY_API_PUBLIC_KEY=02fedcba0987654321...    # agent's compressed public key from Step 3 (33 bytes / 66 hex chars)
TURNKEY_API_PRIVATE_KEY=<agent-private-key>      # generated locally, never sent to Turnkey
TURNKEY_ORGANIZATION_ID=org-12345678-abcd-1234-abcd-1234567890ab
SIGN_WITH=0x1234abcd5678ef901234abcd5678ef901234abcd
```

These are the agent's credentials. Your root credentials are not included and should never be placed in the agent's environment.
