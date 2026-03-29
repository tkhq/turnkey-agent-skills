# Sponsored Transaction Examples

Turnkey can sponsor gas fees so users pay nothing. Unlike sign_transaction and sign_raw_payload, these endpoints handle transaction construction, signing, and broadcasting in one call.

**Base URL:** `https://api.turnkey.com`

## EVM: Send Sponsored Transaction

Turnkey handles sponsored execution, signing, and broadcasting. For sponsored EVM requests, do not send `gasLimit`, `maxFeePerGas`, or `maxPriorityFeePerGas`; those fields are only used for non-sponsored requests.

**Step 1: Check gas usage (recommended before large batches)**

`POST /public/v1/query/get_gas_usage`

```json
{
  "organizationId": "<ORG_ID>"
}
```

Response:

```json
{
  "windowDurationMinutes": 1440,
  "windowLimitUsd": "100.00",
  "usageUsd": "12.34"
}
```

Verify `usageUsd` is well below `windowLimitUsd` before sending sponsored transactions. If close to the limit, wait for the window to reset or contact support to increase limits.

**Step 2: Get gas station nonce (optional, for replay protection)**

`POST /public/v1/query/get_nonces`

```json
{
  "organizationId": "<ORG_ID>",
  "address": "0xYOUR_SENDER_ADDRESS",
  "caip2": "eip155:8453",
  "gasStationNonce": true
}
```

Response: `{ "gasStationNonce": "42" }`

**Step 3: Send sponsored transaction**

`POST /public/v1/submit/eth_send_transaction`

```json
{
  "from": "0xYOUR_SENDER_ADDRESS",
  "to": "0xUSDC_CONTRACT_ADDRESS",
  "caip2": "eip155:8453",
  "sponsor": true,
  "data": "0xa9059cbb000000000000000000000000RECIPIENT_ADDRESS0000000000000000000000000000000000000000000000000000000000989680",
  "value": "0",
  "gasStationNonce": "42"
}
```

Response:

```json
{
  "activity": {
    "result": {
      "ethSendTransactionResult": {
        "sendTransactionStatusId": "<STATUS_ID>"
      }
    }
  }
}
```

### EVM Request Parameters

| Field | Required | Description |
|-------|----------|-------------|
| `from` | Yes | Sender wallet address (not private key ID) |
| `to` | Yes | Recipient or contract address |
| `caip2` | Yes | Chain identifier (see table below) |
| `sponsor` | No | Set `true` for gasless. Default `false` |
| `data` | No | Hex-encoded calldata (for contract calls) |
| `value` | No | Amount in wei |
| `gasStationNonce` | No | From get_nonces, for replay protection with sponsored txs |
| `nonce` | No | Standard on-chain nonce (non-sponsored only) |
| `gasLimit` | No | Gas limit (non-sponsored only) |
| `maxFeePerGas` | No | EIP-1559 max fee (non-sponsored only) |
| `maxPriorityFeePerGas` | No | EIP-1559 priority fee (non-sponsored only) |

When `sponsor: true`, Turnkey handles gas estimation and fee parameters. Do not set gasLimit, maxFeePerGas, or maxPriorityFeePerGas for sponsored transactions.

---

## Solana: Send Sponsored Transaction

The client must construct and serialize the unsigned transaction. Turnkey handles the fee payer, blockhash (if not provided), signing, and broadcasting.

`POST /public/v1/submit/sol_send_transaction`

```json
{
  "unsignedTransaction": "<BASE64_ENCODED_SERIALIZED_TX>",
  "signWith": "<SOLANA_ADDRESS>",
  "caip2": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "sponsor": true
}
```

Response:

```json
{
  "activity": {
    "result": {
      "solSendTransactionResult": {
        "sendTransactionStatusId": "<STATUS_ID>"
      }
    }
  }
}
```

### Solana Request Parameters

| Field | Required | Description |
|-------|----------|-------------|
| `unsignedTransaction` | Yes | Base64-encoded serialized unsigned transaction |
| `signWith` | Yes | Solana wallet address (not private key ID) |
| `caip2` | Yes | Chain identifier (see table below) |
| `sponsor` | No | Set `true` for gasless. Default `false` |
| `recentBlockhash` | No | For deadline control. Turnkey provides one if omitted |

---

## Poll Transaction Status

Sponsored transactions are async. After submitting, poll until confirmed or failed. This applies to both EVM and Solana.

`POST /public/v1/query/get_send_transaction_status`

```json
{
  "organizationId": "<ORG_ID>",
  "sendTransactionStatusId": "<STATUS_ID>"
}
```

### EVM Success Response

```json
{
  "txStatus": "INCLUDED",
  "eth": {
    "txHash": "0xabc123..."
  }
}
```

### Solana Success Response

```json
{
  "txStatus": "INCLUDED",
  "solana": {
    "signature": "5KtPn1..."
  }
}
```

### Failed Response (EVM example with decoded revert)

```json
{
  "txStatus": "FAILED",
  "txError": "execution reverted",
  "error": {
    "message": "Transaction reverted",
    "revertChain": [
      {
        "address": "0xCONTRACT_ADDRESS",
        "errorType": "custom",
        "displayMessage": "InsufficientBalance(required: 1000000, actual: 0)",
        "custom": {
          "errorName": "InsufficientBalance",
          "paramsJson": "{\"required\":\"1000000\",\"actual\":\"0\"}"
        }
      }
    ]
  }
}
```

### Status Values

| Status | Meaning |
|--------|---------|
| `INITIALIZED` | Transaction submitted, not yet broadcast |
| `BROADCASTING` | Transaction sent to the network |
| `INCLUDED` | Transaction confirmed on-chain |
| `FAILED` | Transaction failed (check `txError` and `error` fields) |

Poll every 2 seconds until status is `INCLUDED` or `FAILED`. Stop after a bounded timeout window that matches the caller's UX needs, then surface the last known status and `sendTransactionStatusId` so they can resume polling without resubmitting. The `error` field contains detailed revert information for failed EVM transactions, including decoded custom errors and panic codes. For Solana failures, the `error.solana` field includes program logs and RPC error details.

### Polling Pattern

1. Call eth_send_transaction or sol_send_transaction, extract `sendTransactionStatusId`.
2. Call get_send_transaction_status with the status ID.
3. If `txStatus` is `INITIALIZED` or `BROADCASTING`, wait 2 seconds and retry step 2.
4. If `txStatus` is `INCLUDED`, the transaction is confirmed. Extract the hash/signature.
5. If `txStatus` is `FAILED`, read `error` for diagnostics.

---

## Non-Sponsored EVM Transaction

You can also use eth_send_transaction without sponsorship. You provide the gas parameters.

`POST /public/v1/submit/eth_send_transaction`

```json
{
  "from": "0xSENDER_ADDRESS",
  "to": "0xRECIPIENT_ADDRESS",
  "caip2": "eip155:1",
  "sponsor": false,
  "value": "1000000000000000000",
  "nonce": "5",
  "gasLimit": "21000",
  "maxFeePerGas": "30000000000",
  "maxPriorityFeePerGas": "2000000000"
}
```

For non-sponsored transactions, you must provide `nonce`, `gasLimit`, `maxFeePerGas`, and `maxPriorityFeePerGas`. Use get_nonces with `nonce: true` to fetch the current on-chain nonce.

---

## CAIP-2 Chain Identifiers

### EVM Chains

| Chain | CAIP-2 |
|-------|--------|
| Ethereum Mainnet | `eip155:1` |
| Ethereum Sepolia | `eip155:11155111` |
| Base | `eip155:8453` |
| Base Sepolia | `eip155:84532` |
| Polygon | `eip155:137` |
| Polygon Amoy | `eip155:80002` |

### Solana Chains

| Chain | CAIP-2 |
|-------|--------|
| Solana Mainnet | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` |
| Solana Devnet | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG` |
| Solana Testnet | `solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY` |

---

## Key Differences: EVM vs Solana Sponsored Transactions

| Aspect | EVM | Solana |
|--------|-----|--------|
| Transaction construction | Turnkey handles it (just provide to, data, value) | Client must serialize the unsigned transaction |
| Nonce management | Turnkey handles it (gasStationNonce optional for extra security) | Turnkey provides recentBlockhash if omitted |
| Gas estimation | Turnkey handles it | N/A (Solana fees are fixed) |
| Status response | `eth.txHash` | `solana.signature` (when available) |
