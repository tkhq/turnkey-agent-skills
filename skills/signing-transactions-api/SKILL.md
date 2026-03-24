---
name: signing-transactions-api
description: "Signs and broadcasts blockchain transactions using the Turnkey HTTP API. Supports Ethereum, Bitcoin, Solana, Tron, Sui, TON, Cosmos via signTransaction, signRawPayload, and sponsored/gasless transactions via ethSendTransaction and solSendTransaction. Use when asked to 'sign a transaction via the Turnkey API', 'call the sign transaction endpoint', 'sign a raw payload via the API', 'sign a Bitcoin transaction using the Turnkey API', 'sign a Solana transaction via Turnkey', 'send a sponsored transaction via the API', 'gasless transaction with Turnkey', or 'sign on Sui/TON/Cosmos via Turnkey API'. Do NOT use for creating wallets (use creating-wallets-api), managing policies (use managing-policies-api), managing credentials (use managing-credentials-api)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). See managing-credentials-api for authentication setup."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["signing", "api", "transactions", "ethereum", "bitcoin", "solana", "raw-payload", "multichain"]
---

## Quick Start

Use the Turnkey HTTP API to sign transactions. Turnkey signs within its secure enclave and returns the signature. You construct the unsigned transaction externally and broadcast after signing.

**Base URL:** `https://api.turnkey.com`

## Prerequisites

Requires API keys and a wallet with derived addresses (see managing-credentials-api and creating-wallets-api skills).

## Choosing Your Signing Method

| Method | When to use | API Endpoint |
|--------|-------------|--------------|
| **signTransaction** | Chain-aware signing. Turnkey parses the transaction and the policy engine can inspect chain-specific fields. | `POST /public/v1/submit/sign_transaction` (all supported chains) |
| **signRawPayload** | Low-level, chain-agnostic. You hash and serialize the payload, Turnkey signs the raw bytes. Required for chains without dedicated transaction type support. | `POST /public/v1/submit/sign_raw_payload` |

signTransaction supports these transaction types: TRANSACTION_TYPE_ETHEREUM, TRANSACTION_TYPE_SOLANA, TRANSACTION_TYPE_BITCOIN, TRANSACTION_TYPE_TRON, TRANSACTION_TYPE_TEMPO.

signRawPayload works with any chain since it operates at the cryptographic primitive level.

## Instructions

### Step 1: Sign an Ethereum transaction

`POST /public/v1/submit/sign_transaction`

```json
{
  "signWith": "0xYOUR_ADDRESS",
  "unsignedTransaction": "0xSERIALIZED_UNSIGNED_TX_HEX",
  "type": "TRANSACTION_TYPE_ETHEREUM"
}
```

The signer can be a wallet account address, private key address, or private key ID.

### Step 2: Sign a transaction (any supported chain)

For Solana, Bitcoin, Tron, use the API endpoint with the appropriate type:

**Solana:**

`POST /public/v1/submit/sign_transaction`

```json
{
  "signWith": "<SOLANA_ADDRESS>",
  "unsignedTransaction": "<BASE64_ENCODED_TX>",
  "type": "TRANSACTION_TYPE_SOLANA"
}
```

**Bitcoin:**

`POST /public/v1/submit/sign_transaction`

```json
{
  "signWith": "<BITCOIN_ADDRESS>",
  "unsignedTransaction": "<HEX_ENCODED_PSBT>",
  "type": "TRANSACTION_TYPE_BITCOIN"
}
```

### Step 3: Sign a raw payload

`POST /public/v1/submit/sign_raw_payload`

```json
{
  "signWith": "0xYOUR_ADDRESS",
  "payload": "48656c6c6f2c205475726e6b657921",
  "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
  "hashFunction": "HASH_FUNCTION_SHA256"
}
```

### Payload Encodings

| Encoding | Value | Use when |
|----------|-------|----------|
| UTF-8 text | PAYLOAD_ENCODING_TEXT_UTF8 | Signing human-readable messages |
| Hexadecimal | PAYLOAD_ENCODING_HEXADECIMAL | Signing pre-serialized binary data |

### Hash Functions

| Hash Function | Value | Use for |
|---------------|-------|---------|
| SHA-256 | HASH_FUNCTION_SHA256 | TRON, general secp256k1 signing |
| Keccak-256 | HASH_FUNCTION_KECCAK256 | Ethereum message signing |
| No hash | HASH_FUNCTION_NOT_APPLICABLE | Ed25519 signing (Sui, TON). The payload is signed directly without hashing. |
| No-op | HASH_FUNCTION_NO_OP | Bitcoin Taproot (Schnorr). Payload must be pre-hashed. |

## Chain-Specific Signing Guide

Quick reference for which method and settings to use per chain:

| Chain | Method | Transaction Type | Hash Function | Notes |
|-------|--------|-----------------|---------------|-------|
| Ethereum | signTransaction | TRANSACTION_TYPE_ETHEREUM | N/A (handled internally) | Policy engine can inspect eth.tx fields |
| Bitcoin (P2WPKH) | signTransaction | TRANSACTION_TYPE_BITCOIN | N/A (handled internally) | Pass PSBT hex |
| Bitcoin (Taproot) | signRawPayload | N/A | HASH_FUNCTION_NO_OP | Pre-hash with tagged SHA-256, Schnorr signature |
| Solana | signTransaction | TRANSACTION_TYPE_SOLANA | N/A (handled internally) | Policy engine can inspect solana.tx fields |
| Tron | signTransaction or signRawPayload | TRANSACTION_TYPE_TRON or N/A | HASH_FUNCTION_SHA256 for raw | |
| Sui | signRawPayload | N/A | HASH_FUNCTION_NOT_APPLICABLE | Hash with blake2b before signing |
| TON | signRawPayload | N/A | HASH_FUNCTION_NOT_APPLICABLE | Build BOC, hash with SHA-256 before signing |
| Cosmos | signRawPayload | N/A | HASH_FUNCTION_SHA256 | Sign the SignDoc bytes |

For complete per-chain examples, see [references/chain-signing-examples.md](references/chain-signing-examples.md).
For raw payload signing patterns, see [references/raw-payload-examples.md](references/raw-payload-examples.md).
For gasless/sponsored transactions (paymaster), see [references/sponsored-transactions-examples.md](references/sponsored-transactions-examples.md).

## Important Gotchas

- Construct the unsigned transaction externally (using chain-specific tooling). Turnkey only signs; it does not construct transactions.
- The `signWith` field must be a derived address from a Turnkey wallet or a private key address/ID. Use the creating-wallets-api skill to set up wallets first.
- `signTransaction` enables the policy engine to parse chain-specific fields (eth.tx.*, solana.tx.*, bitcoin.tx.*, tron.tx.*). `signRawPayload` bypasses chain-level policy inspection.
- For Ed25519 chains (Solana, Sui, TON), use HASH_FUNCTION_NOT_APPLICABLE. Ed25519 does not pre-hash the payload.
- For Bitcoin Taproot (Schnorr), use HASH_FUNCTION_NO_OP and pre-hash the sighash yourself with tagged SHA-256.
- Chain-specific units: wei (ETH), lamports (SOL), satoshis (BTC), SUN (TRX).

## Rules

- Always verify the signer address exists in your wallet before signing.
- Use signTransaction over signRawPayload when the chain is supported (enables policy inspection).
- Match the hash function to the chain's requirements (see table above).
- Test signing on testnet before mainnet.

## Related Skills

- `creating-wallets-api` for wallet setup and address derivation.
- `managing-policies-api` for transaction governance and spending limits.
- `managing-credentials-api` for API key setup.
- `setup-account-workflow` for end-to-end organization bootstrapping (install, keys, wallets, first signature).
