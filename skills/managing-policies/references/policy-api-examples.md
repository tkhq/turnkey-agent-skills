# Policy API Examples

Complete request/response examples for policy CRUD and chain-specific policy patterns.

**Base URL:** `https://api.turnkey.com`

**Request body convention:** JSON bodies below are the `parameters` object SDK methods take. For raw HTTP against `POST /public/v1/submit/*` endpoints (e.g., `create_policy`, `delete_policy`, `update_policy`), wrap in the activity envelope: `{"type": "ACTIVITY_TYPE_*", "timestampMs": "<ms>", "organizationId": "<ORG_ID>", "parameters": {...}}`. Query endpoints (`POST /public/v1/query/*`) take the body as shown. See the root [`SKILL.md`](../../../SKILL.md) "Request body convention" for details.

## Create a single policy

```
POST /public/v1/submit/create_policy
```

```json
{
  "policyName": "agent-sign-with-wallet",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "activity.action == 'SIGN' && wallet.id == 'wlt_abc123'",
  "notes": "Allow agent to sign with its designated wallet"
}
```

**Response:**

```json
{
  "activity": {
    "id": "act_...",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_CREATE_POLICY_V3",
    "result": {
      "createPolicyResult": {
        "policyId": "pol_..."
      }
    }
  }
}
```

## Create multiple policies (batch)

```
POST /public/v1/submit/create_policies
```

```json
{
  "policies": [
    {
      "policyName": "agent-deny-admin",
      "effect": "EFFECT_DENY",
      "condition": "activity.resource in ['USER', 'POLICY', 'ORGANIZATION'] || (activity.resource == 'WALLET' && activity.action in ['DELETE', 'EXPORT'])",
      "notes": "Block agent from admin operations and wallet deletion/export"
    },
    {
      "policyName": "deny-large-eth",
      "effect": "EFFECT_DENY",
      "condition": "eth.tx.value > 100000000000000000",
      "notes": "Block ETH transfers above 0.1 ETH"
    }
  ]
}
```

## List policies

```
POST /public/v1/query/list_policies
```

```json
{
  "organizationId": "<ORG_ID>"
}
```

**Response:**

```json
{
  "policies": [
    {
      "policyId": "pol_...",
      "policyName": "agent-sign-with-wallet",
      "effect": "EFFECT_ALLOW",
      "consensus": "approvers.any(user, user.tags.contains('agent'))",
      "condition": "activity.action == 'SIGN' && wallet.id == 'wlt_abc123'",
      "notes": "Allow agent to sign with its designated wallet",
      "createdAt": { "seconds": "1700000000", "nanos": "0" },
      "updatedAt": { "seconds": "1700000000", "nanos": "0" }
    }
  ]
}
```

## Update a policy

```
POST /public/v1/submit/update_policy
```

```json
{
  "policyId": "pol_...",
  "policyName": "agent-eth-allowlist-updated",
  "policyEffect": "EFFECT_ALLOW",
  "policyCondition": "wallet.id == 'wlt_abc123' && eth.tx.to in ['0xAddr1', '0xAddr2', '0xNewAddr3']",
  "policyConsensus": "approvers.any(user, user.tags.contains('agent'))",
  "policyNotes": "Added 0xNewAddr3 to allowlist"
}
```

## Delete a policy

```
POST /public/v1/submit/delete_policy
```

```json
{
  "policyId": "pol_..."
}
```

## Delete multiple policies

```
POST /public/v1/submit/delete_policies
```

```json
{
  "policyIds": ["pol_abc", "pol_def"]
}
```

## Debug a denied transaction

```
POST /public/v1/query/get_policy_evaluations
```

```json
{
  "organizationId": "<ORG_ID>",
  "activityId": "act_denied_123"
}
```

**Response:**

```json
{
  "policyEvaluations": [
    {
      "policyId": "pol_allow_sign",
      "policyName": "agent-sign-with-wallet",
      "effect": "EFFECT_ALLOW",
      "consensusMatched": true,
      "conditionMatched": true
    },
    {
      "policyId": "pol_deny_large",
      "policyName": "deny-large-eth",
      "effect": "EFFECT_DENY",
      "consensusMatched": true,
      "conditionMatched": true
    }
  ],
  "outcome": "DENY"
}
```

The DENY policy matched because the transfer exceeded 0.1 ETH. Fix: lower the transfer amount or update the spending cap.

## EVM policy patterns

### Address allowlist

```json
{
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "wallet.id == '<WALLET_ID>' && eth.tx.to in ['0xContractA', '0xContractB', '0xRecipient']"
}
```

### Spending cap

```json
{
  "effect": "EFFECT_DENY",
  "condition": "eth.tx.value > 1000000000000000000"
}
```

1 ETH = `1000000000000000000` wei. No consensus means it applies to all users.

### Chain restriction (testnet only)

```json
{
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "wallet.id == '<WALLET_ID>' && eth.tx.chain_id == 11155111"
}
```

Sepolia chain ID = `11155111`. Base = `8453`. Mainnet = `1`.

### Function-level restriction (requires ABI)

```json
{
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '<AGENT_USER_ID>')",
  "condition": "wallet_account.address == '<WALLET_ACCOUNT_ADDRESS>' && eth.tx.to == '0xUSDC_CONTRACT' && eth.tx.function_name == 'transfer'"
}
```

### EIP-7702 authorization restriction

```json
{
  "effect": "EFFECT_ALLOW",
  "condition": "private_key.id == '<PRIVATE_KEY_ID>' && eth.eip_7702_authorization.address == '<DELEGATION_CONTRACT>' && eth.eip_7702_authorization.chain_id == 1 && activity.type == 'ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2'"
}
```

Restricts EIP-7702 delegation to a specific contract on a specific chain. Without a policy like this, an agent could delegate the EOA to any contract.

## Solana policy patterns

### Restrict to System Program

```json
{
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "wallet.id == '<WALLET_ID>' && solana.tx.program_keys.all(p, p == '11111111111111111111111111111111')"
}
```

### SOL transfer cap

```json
{
  "effect": "EFFECT_DENY",
  "condition": "solana.tx.transfers.any(t, t.amount > 1000000000)"
}
```

1 SOL = `1000000000` lamports.

### Block address table lookups

```json
{
  "effect": "EFFECT_DENY",
  "condition": "solana.tx.address_table_lookups.count() > 0"
}
```

### SPL token mint restriction

```json
{
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "wallet.id == '<WALLET_ID>' && solana.tx.spl_transfers.all(t, t.token_mint == '<ALLOWED_MINT>')"
}
```

## Bitcoin policy patterns

### Fee cap

```json
{
  "effect": "EFFECT_DENY",
  "condition": "bitcoin.tx.fee > 50000"
}
```

50000 satoshis = 0.0005 BTC.

### Output address restriction

```json
{
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "wallet.id == '<WALLET_ID>' && bitcoin.tx.outputs.all(o, o.address in ['<ALLOWED_1>', '<ALLOWED_2>', '<CHANGE_ADDR>'])"
}
```

Include the change address in the allowlist or the transaction will be denied.

## Tron policy patterns

### Allow TRX transfers only

```json
{
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "wallet.id == '<WALLET_ID>' && tron.tx.contract[0].type == 'TransferContract'"
}
```

### TRX transfer cap

```json
{
  "effect": "EFFECT_DENY",
  "condition": "tron.tx.contract[0].amount > 10000000"
}
```

10,000,000 SUN = 10 TRX.

### Allow TRC-20 calls to a specific contract

```json
{
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "wallet.id == '<WALLET_ID>' && tron.tx.contract[0].contract_address == '<TRC20_CONTRACT>' && tron.tx.contract[0].data[0..8] == 'a9059cbb'"
}
```

`a9059cbb` is the ERC-20/TRC-20 `transfer(address,uint256)` function selector.

## Tempo policy patterns

### Allow Tempo transactions for a specific wallet

```json
{
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "activity.action == 'SIGN' && activity.params.type == 'TRANSACTION_TYPE_TEMPO' && wallet.id == '<WALLET_ID>'"
}
```

### Restrict all calls to an approved contract

```json
{
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "wallet.id == '<WALLET_ID>' && tempo.tx.calls.all(call, call.to == '<APPROVED_CONTRACT>')"
}
```

### Deny high gas limit

```json
{
  "effect": "EFFECT_DENY",
  "condition": "tempo.tx.gas_limit > 100000"
}
```

### Restrict ERC-20 transfer recipient via calldata slicing

Tempo does not support ABI uploads. Inspect encoded arguments by slicing `input`. The recipient address in a `transfer(address,uint256)` call starts at position 34 (after the 4-byte selector + 12 bytes of left-padding):

```json
{
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('agent'))",
  "condition": "wallet.id == '<WALLET_ID>' && tempo.tx.calls[0].to == '<TOKEN_CONTRACT>' && tempo.tx.calls[0].input[34..74] == '<RECIPIENT_NO_0x>'"
}
```

## Smart contract interface management

### Upload an ABI

```
POST /public/v1/submit/create_smart_contract_interface
```

```json
{
  "smartContractAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "smartContractInterface": "[{\"type\":\"function\",\"name\":\"transfer\",\"inputs\":[{\"name\":\"to\",\"type\":\"address\"},{\"name\":\"value\",\"type\":\"uint256\"}],\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}]}]",
  "type": "SMART_CONTRACT_INTERFACE_TYPE_ETHEREUM",
  "label": "USDC ERC-20",
  "notes": "USDC contract ABI for function-level policy control"
}
```

### List smart contract interfaces

```
POST /public/v1/query/list_smart_contract_interfaces
```

```json
{
  "organizationId": "<ORG_ID>"
}
```

### Delete a smart contract interface

```
POST /public/v1/submit/delete_smart_contract_interface
```

```json
{
  "smartContractInterfaceId": "<ID>"
}
```
