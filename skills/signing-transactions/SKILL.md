---
name: signing-transactions
description: "Signs and broadcasts blockchain transactions via Turnkey: EVM (Ethereum, Base, Polygon, Arbitrum, Optimism), Solana, Bitcoin, and any chain via raw payload signing. Includes gasless/sponsored transactions and message/typed-data signing."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials. Tier 1 requires Node.js and chain-specific SDK packages. Tier 2 uses the Turnkey HTTP API directly. Tier 3 uses the Turnkey HTTP API with optional gas sponsorship."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: "signing transactions ethereum evm solana bitcoin raw-payload sponsored gasless ethers viem"
---

# Signing Transactions

## Overview

Turnkey provides three approaches to signing, from simplest to most control.

| What you want to do | Approach |
|---|---|
| Send ETH/tokens or SOL — simplest possible | **Turnkey-managed** (below) |
| Gasless/sponsored transaction | **Turnkey-managed** with `sponsor: true` (below) |
| Full control over EVM tx (custom gas, contracts, typed data) | **SDK**: ethers or viem — read [references/evm-examples.md](references/evm-examples.md) |
| Full control over Solana tx (programs, versioned, batch) | **SDK**: @turnkey/solana — read [references/solana-examples.md](references/solana-examples.md) |
| Send BTC (SegWit or Taproot) | **SDK**: bitcoinjs-lib — read [references/bitcoin-examples.md](references/bitcoin-examples.md) |
| Sign on Cosmos, Aptos, Sui, TON, Tron, or any other chain | **Raw payload**: `sign_raw_payload` — read [references/raw-payload-examples.md](references/raw-payload-examples.md) |
| Sign arbitrary bytes or messages | **Raw payload**: `sign_raw_payload` — read [references/raw-payload-examples.md](references/raw-payload-examples.md) |

For SDK signing, Bitcoin, or raw payload signing, you **must** read the linked reference file — those approaches are not covered inline below.

## Turnkey-managed EVM signing

Turnkey handles transaction construction, signing, broadcasting, and monitoring. Set `sponsor: true` for gasless transactions where Turnkey pays the fees.

Turnkey handles gas fees on your behalf (billed to the organization monthly). **Note**: this functionality is not available at all tiers, the human user must reach out to Turnkey support for enablement. Advise them to do so if relevant.

### Send a sponsored (gasless) EVM transaction

```
POST /public/v1/submit/eth_send_transaction
```

```json
{
  "from": "0xYOUR_SENDER_ADDRESS",
  "to": "0xRECIPIENT_ADDRESS",
  "caip2": "eip155:8453",
  "sponsor": true,
  "value": "1000000000000000",
  "data": ""
}
```

For contract calls, set `value` to `"0"` and encode the calldata in `data`.

When `sponsor: true`, Turnkey handles gas estimation and fee parameters. Do not set `gasLimit`, `maxFeePerGas`, or `maxPriorityFeePerGas` for sponsored transactions.

### Send a non-sponsored EVM transaction

You provide gas parameters. Use `get_nonces` to fetch the current on-chain nonce.

```
POST /public/v1/submit/eth_send_transaction
```

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

### EVM request parameters

| Field | Required | Description |
|-------|----------|-------------|
| `from` | Yes | Sender wallet address |
| `to` | Yes | Recipient or contract address |
| `caip2` | Yes | Chain identifier (see table below) |
| `sponsor` | No | Set `true` for gasless. Default `false` |
| `data` | No | Hex-encoded calldata (for contract calls) |
| `value` | No | Amount in wei |
| `nonce` | No | On-chain nonce (non-sponsored only) |
| `gasLimit` | No | Gas limit (non-sponsored only) |
| `maxFeePerGas` | No | EIP-1559 max fee (non-sponsored only) |
| `maxPriorityFeePerGas` | No | EIP-1559 priority fee (non-sponsored only) |

### Supported EVM chains

| Chain | CAIP-2 |
|-------|--------|
| Ethereum Mainnet | `eip155:1` |
| Ethereum Sepolia | `eip155:11155111` |
| Base | `eip155:8453` |
| Base Sepolia | `eip155:84532` |
| Polygon | `eip155:137` |
| Polygon Amoy | `eip155:80002` |
| Arbitrum | `eip155:42161` |
| Arbitrum Sepolia | `eip155:421614` |

For additional EVM chains and gas station nonce usage, see [references/evm-examples.md](references/evm-examples.md).

## Turnkey-managed Solana signing

Unlike EVM, you must still construct and serialize the unsigned transaction. Turnkey handles the fee payer, signing, and broadcasting.

### Send a sponsored (gasless) Solana transaction

```
POST /public/v1/submit/sol_send_transaction
```

```json
{
  "unsignedTransaction": "<BASE64_ENCODED_SERIALIZED_TX>",
  "signWith": "<SOLANA_ADDRESS>",
  "caip2": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "sponsor": true
}
```

When `sponsor: true`, Turnkey handles the fee payer and provides a recent blockhash if you omit one.

### Solana request parameters

| Field | Required | Description |
|-------|----------|-------------|
| `unsignedTransaction` | Yes | Base64-encoded serialized unsigned transaction |
| `signWith` | Yes | Solana wallet address (base58) |
| `caip2` | Yes | Chain identifier (see table below) |
| `sponsor` | No | Set `true` for gasless. Default `false` |
| `recentBlockhash` | No | For deadline control. Turnkey provides one if omitted |

### Supported Solana chains

| Chain | CAIP-2 |
|-------|--------|
| Solana Mainnet | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` |
| Solana Devnet | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG` |
| Solana Testnet | `solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY` |

These are the exact enum values accepted by the API. They use the Solana genesis hash as the chain reference. Turnkey's SDK tutorials may show short aliases like `solana:mainnet` — the SDK translates these internally, but for HTTP API calls use the genesis-hash values above.

For SDK signing, batch transactions, message signing, and versioned transactions, see [references/solana-examples.md](references/solana-examples.md).

## Poll transaction status

Both EVM and Solana Turnkey-managed transactions are async. Poll until terminal:

```
POST /public/v1/query/get_send_transaction_status
```

```json
{
  "organizationId": "<ORG_ID>",
  "sendTransactionStatusId": "<STATUS_ID>"
}
```

| Status | Meaning |
|--------|---------|
| `INITIALIZED` | Transaction submitted, not yet broadcast |
| `BROADCASTING` | Transaction sent to the network |
| `INCLUDED` | Transaction confirmed on-chain |
| `FAILED` | Transaction failed — check error fields |

Poll every 2 seconds. For EVM, extract `eth.txHash` on success. For Solana, extract `solana.signature`.

## Prerequisites

Requires a wallet with a derived address for your target chain.

**Before signing, verify the address exists.** If `SIGN_WITH` is not already set to a known good address, call `list_wallet_accounts` to confirm:

```
POST /public/v1/query/list_wallet_accounts
```

```json
{
  "organizationId": "<ORG_ID>",
  "walletId": "<WALLET_ID>"
}
```

Look for an account whose `addressFormat` matches your target chain (`ADDRESS_FORMAT_ETHEREUM`, `ADDRESS_FORMAT_SOLANA`, etc.). If no matching account exists, use the `managing-wallets` skill to create a wallet or derive a new account before signing.

Environment variables used across all approaches:

```env
TURNKEY_API_PUBLIC_KEY=    # Turnkey API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # Turnkey API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Turnkey organization UUID
SIGN_WITH=                 # Address or public key of the wallet account to sign with
```

`SIGN_WITH` accepts a wallet account address, private key address, or private key ID. Chain-specific references document the expected format (0x... for EVM, base58 for Solana, bech32 for Bitcoin).

## The signWith field

Every signing endpoint accepts `signWith`. It identifies which key Turnkey should use to produce the signature. You can pass:
- A wallet account **address** (most common) — e.g., `0x1234...` for EVM, `7nYB...` for Solana
- A private key **address** — for standalone private keys
- A private key **ID** — the Turnkey identifier for the key

## Activity responses

All signing endpoints return an activity object:

```json
{
  "activity": {
    "id": "<ACTIVITY_ID>",
    "status": "ACTIVITY_STATUS_COMPLETED",
    "type": "ACTIVITY_TYPE_SIGN_TRANSACTION_V2",
    "result": { ... }
  }
}
```

| Status | Meaning |
|---|---|
| `ACTIVITY_STATUS_COMPLETED` | Signing succeeded. Extract the result. |
| `ACTIVITY_STATUS_FAILED` | Signing failed. Call `get_activity` with the `activityId` for error details. |
| `ACTIVITY_STATUS_CONSENSUS_NEEDED` | A policy requires multi-party approval. Surface the `activityId` to a human approver. |
| `ACTIVITY_STATUS_REJECTED` | A policy denied the operation. Call `get_policy_evaluations` with the `activityId` to see which policy matched. |

When using `@turnkey/sdk-server`, activity polling is automatic — methods return the result directly. When using the HTTP API, poll `get_activity` until the status is terminal.

## Rules

- **Confirm before signing on mainnet.** Before signing any mainnet transaction, show the user: chain, recipient address, value/amount, and contract function (if applicable). Wait for explicit confirmation.
- **Default to testnet.** Use testnet chains and endpoints for first-time flows unless the user explicitly requests mainnet.

## Troubleshooting

**`ACTIVITY_STATUS_FAILED`**
The signing operation failed server-side. Common causes: key curve mismatch, malformed transaction, or unsupported transaction type. Call `get_activity` with the `activityId` to retrieve the error details.

**`ACTIVITY_STATUS_CONSENSUS_NEEDED`**
A policy requires additional approvals before this transaction can proceed. Capture the `activityId` and surface it to a human approver.

**`ACTIVITY_STATUS_REJECTED`**
A policy denied the signing operation. Use `get_policy_evaluations` with the activity ID to see which policy matched and why.

**Wrong `SIGN_WITH` value**
`SIGN_WITH` must be an address that exists as a wallet account in your Turnkey organization. Verify with `list_wallet_accounts` or `getWalletAccounts`.

**Rate limiting (`429 Too Many Requests`)**
Turnkey rate-limits by organization. Back off exponentially with jitter.

## Related Skills

- `managing-wallets` — create a wallet and derive addresses before signing
- `managing-policies` — review or update policies that affect signing
