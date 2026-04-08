---
name: signing-transactions
description: "Signs and broadcasts blockchain transactions using Turnkey. Supports EVM (Ethereum, Base, Polygon, Arbitrum, Optimism), Solana, Bitcoin, and any chain via raw payload signing. Includes gasless/sponsored transactions. Use when asked to 'sign a transaction', 'send ETH', 'send SOL', 'send BTC', 'transfer tokens', 'sign a message', 'sign typed data', 'call a smart contract', 'broadcast a transaction', 'gasless transaction', 'sponsored transaction', 'sign a raw payload', or 'sign on [any chain]'. Do NOT use for wallet creation (use managing-wallets), policy management (use managing-policies), or balance queries (use checking-balances)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials. Tier 1 requires Node.js and chain-specific SDK packages. Tier 2 uses the Turnkey HTTP API directly. Tier 3 uses the Turnkey HTTP API with optional gas sponsorship."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["signing", "transactions", "ethereum", "evm", "solana", "bitcoin", "raw-payload", "sponsored", "gasless", "ethers", "viem"]
---

# Signing Transactions

## Overview

Turnkey provides three approaches to signing, from simplest to most control. Pick the one that fits your use case.

### Turnkey-managed (simplest)

Turnkey handles transaction construction, signing, broadcasting, and monitoring. You provide the sender, recipient, value, and chain. Supports gasless/sponsored transactions where Turnkey pays the fees.

- EVM: `eth_send_transaction` — see [references/evm-examples.md](references/evm-examples.md)
- Solana: `sol_send_transaction` — see [references/solana-examples.md](references/solana-examples.md)

### SDK signing (full control)

You construct the transaction using standard blockchain libraries (ethers, viem, @solana/web3.js, bitcoinjs-lib). Turnkey signs it. You broadcast. Gives you full control over gas, nonces, contract calls, and transaction types.

- EVM (ethers or viem): see [references/evm-examples.md](references/evm-examples.md)
- Solana (@turnkey/solana): see [references/solana-examples.md](references/solana-examples.md)
- Bitcoin (bitcoinjs-lib + signTransaction): see [references/bitcoin-examples.md](references/bitcoin-examples.md)

### Raw payload signing (any chain)

Sign arbitrary bytes for chains without dedicated SDK support (Cosmos, Aptos, Sui, TON, Tron, or any new chain). You handle serialization, hashing, and broadcasting. Turnkey just signs.

- All chains: see [references/raw-payload-examples.md](references/raw-payload-examples.md)

## Choosing an approach

| What you want to do | Approach | Reference |
|---|---|---|
| Send ETH/tokens, simplest possible | Turnkey-managed: `eth_send_transaction` | [evm-examples.md](references/evm-examples.md) |
| Gasless/sponsored EVM transaction | Turnkey-managed: `eth_send_transaction` with `sponsor: true` | [evm-examples.md](references/evm-examples.md) |
| Full control over EVM tx (custom gas, contracts, typed data) | SDK: ethers or viem | [evm-examples.md](references/evm-examples.md) |
| Send SOL, simplest possible | Turnkey-managed: `sol_send_transaction` | [solana-examples.md](references/solana-examples.md) |
| Full control over Solana tx (programs, versioned) | SDK: `@turnkey/solana` | [solana-examples.md](references/solana-examples.md) |
| Send BTC (SegWit or Taproot) | SDK: bitcoinjs-lib + `signTransaction` | [bitcoin-examples.md](references/bitcoin-examples.md) |
| Sign on Cosmos, Aptos, Sui, TON, Tron, or any other chain | Raw payload: `sign_raw_payload` | [raw-payload-examples.md](references/raw-payload-examples.md) |
| Sign arbitrary bytes or messages | Raw payload: `sign_raw_payload` | [raw-payload-examples.md](references/raw-payload-examples.md) |

## Prerequisites

Requires a wallet with a derived address for your target chain. Use the `managing-wallets` skill to create one if needed.

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
| `ACTIVITY_STATUS_FAILED` | Signing failed. Check the Turnkey console for details. |
| `ACTIVITY_STATUS_CONSENSUS_NEEDED` | A policy requires multi-party approval. Surface the `activityId` to a human approver. |
| `ACTIVITY_STATUS_REJECTED` | A policy denied the operation. Review policies in the Turnkey console. |

When using `@turnkey/sdk-server`, activity polling is automatic — methods return the result directly. When using the HTTP API, poll `get_activity` until the status is terminal.

## Rules

- **Confirm before signing on mainnet.** Before signing any mainnet transaction, show the user: chain, recipient address, value/amount, and contract function (if applicable). Wait for explicit confirmation.
- **Default to testnet.** Use testnet chains and endpoints for first-time flows unless the user explicitly requests mainnet.

## Troubleshooting

**`ACTIVITY_STATUS_FAILED`**
The signing operation failed server-side. Common causes: key curve mismatch, malformed transaction, or unsupported transaction type. Check the Turnkey console for the activity error.

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
