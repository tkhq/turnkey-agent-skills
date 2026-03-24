# Sponsored Transaction Examples (Gasless via Paymaster)

Turnkey can sponsor gas fees so users pay nothing. Unlike signTransaction and signRawPayload, these endpoints handle transaction construction, signing, and broadcasting in one call. These are API-only (no CLI shortcut exists).

## EVM: Send Sponsored Transaction

Turnkey handles gas estimation, nonce management, signing, and broadcasting.

```bash
# Step 1: Get gas station nonce (optional, for replay protection)
turnkey request --path /public/v1/query/get_nonces --body '{
  "organizationId": "<ORG_ID>",
  "address": "0xYOUR_SENDER_ADDRESS",
  "caip2": "eip155:8453",
  "gasStationNonce": true
}'
# Response: { "gasStationNonce": "42" }

# Step 2: Send sponsored transaction
turnkey request --path /public/v1/submit/eth_send_transaction --body '{
  "from": "0xYOUR_SENDER_ADDRESS",
  "to": "0xUSDC_CONTRACT_ADDRESS",
  "caip2": "eip155:8453",
  "sponsor": true,
  "data": "0xa9059cbb000000000000000000000000RECIPIENT_ADDRESS0000000000000000000000000000000000000000000000000000000000989680",
  "value": "0",
  "gasStationNonce": "42"
}'
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
| `from` | Yes | Sender wallet address |
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

```bash
turnkey request --path /public/v1/submit/sol_send_transaction --body '{
  "unsignedTransaction": "<BASE64_ENCODED_SERIALIZED_TX>",
  "signWith": "<SOLANA_ADDRESS>",
  "caip2": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "sponsor": true
}'
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
| `signWith` | Yes | Solana wallet address or private key address |
| `caip2` | Yes | Chain identifier (see table below) |
| `sponsor` | No | Set `true` for gasless. Default `false` |
| `recentBlockhash` | No | For deadline control. Turnkey provides one if omitted |

---

## Poll Transaction Status

Sponsored transactions are async. After submitting, poll until confirmed or failed.

```bash
turnkey request --path /public/v1/query/get_send_transaction_status --body '{
  "organizationId": "<ORG_ID>",
  "sendTransactionStatusId": "<STATUS_ID>"
}'
```

Response:

```json
{
  "txStatus": "INCLUDED",
  "eth": {
    "txHash": "0xabc123..."
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

Poll every 2 seconds until status is `INCLUDED` or `FAILED`. The `error` field contains detailed revert information for failed EVM transactions, including decoded custom errors and panic codes.

---

## Check Gas Usage

Monitor your organization's gas sponsorship usage.

```bash
turnkey request --path /public/v1/query/get_gas_usage --body '{
  "organizationId": "<ORG_ID>"
}'
```

Response:

```json
{
  "windowDurationMinutes": 1440,
  "windowLimitUsd": "100.00",
  "usageUsd": "12.34"
}
```

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
| Status response | `eth.txHash` | `sol.signature` (when available) |
