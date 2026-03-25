---
name: signing-transactions-api
description: "Signs and broadcasts blockchain transactions using the Turnkey HTTP API. Supports signing, batch signing, sponsored/gasless transactions, balance queries, and transaction monitoring. Use when asked to 'sign a transaction via the Turnkey API', 'sign a raw payload', 'batch sign payloads', 'send a sponsored transaction', 'gasless transaction with Turnkey', 'broadcast a transaction via Turnkey', 'check balances via Turnkey API', 'get nonces', 'check gas usage', or 'list supported assets'. Do NOT use for creating wallets (use managing-wallets-api), managing policies (use managing-policies-api), managing users or API keys (use managing-users-api)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). See managing-users-api for authentication setup."
metadata:
  version: "2.0.0"
  author: turnkey
  tags: ["signing", "api", "transactions", "ethereum", "bitcoin", "solana", "raw-payload", "multichain", "sponsored", "gasless", "balances"]
---

## Quick Start

Use the Turnkey HTTP API to sign transactions, broadcast sponsored transactions, and query on-chain data. Turnkey signs within its secure enclave and returns signatures. For sponsored transactions, Turnkey handles the full lifecycle: construction, signing, broadcast, and monitoring.

**Base URL:** `https://api.turnkey.com`

Request bodies below show the `parameters` object for clarity. The full API envelope wraps these as: `{"type": "ACTIVITY_TYPE_...", "timestampMs": "<ms>", "organizationId": "<ORG_ID>", "parameters": { ... }}`. Query endpoints require `organizationId` in the request body.

## Prerequisites

Requires API keys and a wallet with derived addresses (see managing-users-api and managing-wallets-api skills).

## Choosing Your Signing Method

Three tiers, from most control to least:

### Tier 1: sign_transaction (you build, Turnkey signs, you broadcast)

Best when you want full control over transaction construction and broadcasting. The policy engine can inspect chain-specific fields (eth.tx.*, solana.tx.*, bitcoin.tx.*, tron.tx.*).

`POST /public/v1/submit/sign_transaction`

Supported types: TRANSACTION_TYPE_ETHEREUM, TRANSACTION_TYPE_SOLANA, TRANSACTION_TYPE_BITCOIN, TRANSACTION_TYPE_TRON, TRANSACTION_TYPE_TEMPO.

```json
{
  "signWith": "0xYOUR_ADDRESS",
  "unsignedTransaction": "0xSERIALIZED_UNSIGNED_TX_HEX",
  "type": "TRANSACTION_TYPE_ETHEREUM"
}
```

The `signWith` field accepts a wallet account address, private key address, or private key ID.

Response: `activity.result.signTransactionResult.signedTransaction` contains the fully signed transaction ready for broadcast.

### Tier 2: sign_raw_payload / sign_raw_payloads (chain-agnostic signing)

Best for chains without dedicated transaction type support, or for arbitrary message signing. You hash, serialize, and handle everything except the cryptographic signature. Bypasses chain-level policy inspection.

**Single payload:** `POST /public/v1/submit/sign_raw_payload`

```json
{
  "signWith": "0xYOUR_ADDRESS",
  "payload": "48656c6c6f2c205475726e6b657921",
  "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
  "hashFunction": "HASH_FUNCTION_SHA256"
}
```

**Batch (multiple payloads, same key and settings):** `POST /public/v1/submit/sign_raw_payloads`

Sign multiple payloads in a single request. Each payload produces its own signature.

```json
{
  "signWith": "0xYOUR_ADDRESS",
  "payloads": [
    "48656c6c6f",
    "576f726c64"
  ],
  "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
  "hashFunction": "HASH_FUNCTION_SHA256"
}
```

Response (single): `activity.result.signRawPayloadResult` with `r`, `s`, `v` components.
Response (batch): `activity.result.signRawPayloadsResult.signatures` array of `{r, s, v}` objects, one per payload in order.

### Tier 3: eth_send_transaction / sol_send_transaction (Turnkey manages everything)

Highest-level abstraction. Turnkey handles construction (EVM only), signing, broadcasting, and monitoring. Set `sponsor: true` for gasless transactions where Turnkey pays the fees.

**EVM:** `POST /public/v1/submit/eth_send_transaction`

```json
{
  "from": "0xSENDER_ADDRESS",
  "to": "0xRECIPIENT_OR_CONTRACT",
  "caip2": "eip155:8453",
  "sponsor": true,
  "value": "0",
  "data": "0xa9059cbb..."
}
```

When `sponsor: true`, do not set gasLimit, maxFeePerGas, or maxPriorityFeePerGas. Turnkey estimates gas automatically. Private key IDs are not supported for `from`, only addresses.

**Solana:** `POST /public/v1/submit/sol_send_transaction`

Unlike EVM, you must construct and serialize the unsigned transaction. Turnkey handles fee payer (if sponsored), blockhash (if omitted), signing, and broadcasting.

```json
{
  "unsignedTransaction": "<BASE64_ENCODED_SERIALIZED_TX>",
  "signWith": "<SOLANA_ADDRESS>",
  "caip2": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "sponsor": true
}
```

Both return a `sendTransactionStatusId` for polling. These are async operations.

## Monitoring Sponsored Transactions

After calling eth_send_transaction or sol_send_transaction, poll for completion using the returned status ID.

`POST /public/v1/query/get_send_transaction_status`

```json
{
  "organizationId": "<ORG_ID>",
  "sendTransactionStatusId": "<STATUS_ID>"
}
```

| Status | Meaning |
|--------|---------|
| `INITIALIZED` | Submitted, not yet broadcast |
| `BROADCASTING` | Sent to the network |
| `INCLUDED` | Confirmed on-chain |
| `FAILED` | Failed (check `txError` and `error` fields for details) |

Poll every 2 seconds until `INCLUDED` or `FAILED`. For EVM, the response includes `eth.txHash`. For Solana, it includes `solana.signature`. The `error` field contains decoded revert information for failed EVM transactions.

## Pre-signing Queries

Before signing, you often need on-chain context. These query endpoints provide balance, nonce, gas, and asset information.

### get_balances (beta)

Check asset balances for an address before sending a transaction. Returns only non-zero balances.

`POST /public/v1/query/get_balances`

```json
{
  "organizationId": "<ORG_ID>",
  "address": "0xYOUR_ADDRESS",
  "caip2": "eip155:8453"
}
```

Returns an array of balance objects with `caip19`, `symbol`, `balance` (atomic units), `decimals`, and `display` (USD and crypto values for presentation only). Beta feature, contact support for access.

### get_nonces

Fetch on-chain nonce and/or gas station nonce for an EVM address. Use `gasStationNonce` with sponsored transactions for replay protection.

`POST /public/v1/query/get_nonces`

```json
{
  "organizationId": "<ORG_ID>",
  "address": "0xYOUR_ADDRESS",
  "caip2": "eip155:8453",
  "nonce": true,
  "gasStationNonce": true
}
```

Returns `nonce` and/or `gasStationNonce` based on which booleans you set.

### get_gas_usage

Monitor your organization's gas sponsorship limits and current usage. Check this before sending large batches of sponsored transactions.

`POST /public/v1/query/get_gas_usage`

```json
{
  "organizationId": "<ORG_ID>"
}
```

Returns `windowDurationMinutes`, `windowLimitUsd`, and `usageUsd`.

### list_supported_assets (beta)

Discover which tokens and assets are available on a given network.

`POST /public/v1/query/list_supported_assets`

```json
{
  "organizationId": "<ORG_ID>",
  "caip2": "eip155:8453"
}
```

Returns an array of assets with `caip19`, `symbol`, `decimals`, `name`, and `logoUrl`. Beta feature, contact support for access.

For complete query examples, see [references/balance-query-examples.md](references/balance-query-examples.md).

## Chain-Specific Signing Guide

| Chain | Method | Transaction Type | Hash Function | Notes |
|-------|--------|-----------------|---------------|-------|
| Ethereum | sign_transaction | TRANSACTION_TYPE_ETHEREUM | N/A (handled internally) | Policy engine inspects eth.tx fields |
| Bitcoin (P2WPKH) | sign_transaction | TRANSACTION_TYPE_BITCOIN | N/A (handled internally) | Pass PSBT hex |
| Bitcoin (Taproot) | sign_raw_payload | N/A | HASH_FUNCTION_NO_OP | Pre-hash with tagged SHA-256, Schnorr signature |
| Solana | sign_transaction | TRANSACTION_TYPE_SOLANA | N/A (handled internally) | Policy engine inspects solana.tx fields |
| Tron | sign_transaction or sign_raw_payload | TRANSACTION_TYPE_TRON or N/A | HASH_FUNCTION_SHA256 for raw | |
| Sui | sign_raw_payload | N/A | HASH_FUNCTION_NOT_APPLICABLE | Hash with blake2b before signing |
| TON | sign_raw_payload | N/A | HASH_FUNCTION_NOT_APPLICABLE | Build BOC, hash with SHA-256 before signing |
| Cosmos | sign_raw_payload | N/A | HASH_FUNCTION_SHA256 | Sign the SignDoc bytes |

### Payload Encodings

| Encoding | Value | Use when |
|----------|-------|----------|
| UTF-8 text | PAYLOAD_ENCODING_TEXT_UTF8 | Signing human-readable messages |
| Hexadecimal | PAYLOAD_ENCODING_HEXADECIMAL | Signing pre-serialized binary data |
| EIP-712 | PAYLOAD_ENCODING_EIP712 | Signing typed structured data |
| EIP-7702 | PAYLOAD_ENCODING_EIP7702_AUTHORIZATION | Signing EIP-7702 authorization tuples |

### Hash Functions

| Hash Function | Value | Use for |
|---------------|-------|---------|
| SHA-256 | HASH_FUNCTION_SHA256 | TRON, Cosmos, general secp256k1 signing |
| Keccak-256 | HASH_FUNCTION_KECCAK256 | Ethereum message signing |
| No hash | HASH_FUNCTION_NOT_APPLICABLE | Ed25519 signing (Sui, TON). Payload signed directly. |
| No-op | HASH_FUNCTION_NO_OP | Bitcoin Taproot (Schnorr). Payload must be pre-hashed. |

For complete per-chain examples, see [references/chain-signing-examples.md](references/chain-signing-examples.md).
For raw payload and batch signing patterns, see [references/raw-payload-examples.md](references/raw-payload-examples.md).
For sponsored/gasless transactions and polling, see [references/sponsored-transactions-examples.md](references/sponsored-transactions-examples.md).

## Activity Response Pattern

Every submit endpoint returns an activity object:

```json
{
  "activity": {
    "id": "<ACTIVITY_ID>",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_SIGN_TRANSACTION_V2",
    "result": { ... },
    "fingerprint": "<FINGERPRINT>"
  }
}
```

If a policy requires multi-party approval, status will be `ACTIVITY_STATUS_CONSENSUS_NEEDED` instead of `ACTIVITY_STATUS_COMPLETED`. The result will be empty until the activity is approved.

## Important Gotchas

- For Tier 1 and 2: construct the unsigned transaction externally. Turnkey only signs.
- For eth_send_transaction: Turnkey constructs the EVM transaction. Just provide `to`, `data`, `value`.
- For sol_send_transaction: you still construct and serialize. Turnkey handles fee payer and broadcast.
- `signWith` / `from` must reference a derived address or private key address/ID. eth/sol_send_transaction do not accept private key IDs.
- sign_transaction enables policy engine chain-specific field inspection. sign_raw_payload(s) bypass it.
- For Ed25519 chains (Solana, Sui, TON), use HASH_FUNCTION_NOT_APPLICABLE.
- For Bitcoin Taproot (Schnorr), use HASH_FUNCTION_NO_OP and pre-hash the sighash yourself.
- When `sponsor: true`, do not set gas parameters. Turnkey handles gas estimation.
- Sponsored transactions are async. Always poll get_send_transaction_status after submitting.
- Balance and asset queries (get_balances, list_supported_assets) are in beta.
- Chain-specific units: wei (ETH), lamports (SOL), satoshis (BTC), SUN (TRX).

## Rules

- Always verify the signer address exists in your wallet before signing.
- Use sign_transaction over sign_raw_payload when the chain is supported (enables policy inspection).
- Use sign_raw_payloads for batch signing instead of multiple sign_raw_payload calls.
- Use eth/sol_send_transaction when you want Turnkey to handle broadcast and optionally sponsor gas.
- Match the hash function to the chain's requirements (see table above).
- Check get_gas_usage before large sponsored transaction batches to avoid hitting limits.
- Test signing on testnet before mainnet.

## Related Skills

- `managing-wallets-api` for wallet setup and address derivation.
- `managing-policies-api` for transaction governance and spending limits.
- `managing-users-api` for API key setup and authentication.
