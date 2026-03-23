---
name: signing-bitcoin
description: "Signs Bitcoin transactions using Turnkey with support for P2WPKH (SegWit) and P2TR (Taproot) address types. Covers UTXO selection, transaction construction, and broadcasting. Use when asked to 'send BTC', 'sign a Bitcoin transaction', 'create a PSBT', 'sign with taproot', 'sign with segwit', or 'transfer bitcoin'."
license: Apache-2.0
compatibility: "Requires Node.js. Install @turnkey/sdk-server bitcoinjs-lib. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID, SIGN_WITH env vars."
metadata:
  version: "1.0.0"
  tags: ["bitcoin", "signing", "segwit", "taproot", "utxo"]
---

# Signing Bitcoin Transactions

## Quick Start

For the simplest path, use Turnkey's `signTransaction` API with a P2WPKH (SegWit) address. This handles signing internally. For Taproot (P2TR) or advanced cases, use `signRawPayload` with `bitcoinjs-lib`.

## Prerequisites

```bash
npm install @turnkey/sdk-server bitcoinjs-lib ecpair tiny-secp256k1
```

## Environment Variables

```env
TURNKEY_API_PUBLIC_KEY=    # required
TURNKEY_API_PRIVATE_KEY=   # required
TURNKEY_ORGANIZATION_ID=   # required
SIGN_WITH=                 # Bitcoin address (P2WPKH or P2TR)
```

## Address Types

| Type | Format | Use |
|------|--------|-----|
| P2WPKH (SegWit) | `bc1q...` | Recommended default. Lower fees, wide support. |
| P2TR (Taproot) | `bc1p...` | Newer. Schnorr signatures, better privacy. |

When creating a wallet, use `ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH` for SegWit or `ADDRESS_FORMAT_BITCOIN_MAINNET_P2TR` for Taproot (see `creating-wallets` skill).

## Instructions

### Simple Path: signTransaction (P2WPKH)

Turnkey's `signTransaction` handles PSBT construction and signing. You provide the unsigned transaction hex.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();

const result = await client.signTransaction({
  signWith: process.env.SIGN_WITH!,
  unsignedTransaction: "<unsigned-tx-hex>",
  type: "TRANSACTION_TYPE_BITCOIN",
});

console.log("Signed TX:", result.signedTransaction);
```

### Advanced Path: signRawPayload (P2TR / custom PSBT)

For Taproot or when you need full control over PSBT construction, use `signRawPayload` with `bitcoinjs-lib`. This is more complex but supports all address types.

For complete examples of both paths, see [references/bitcoin-examples.md](references/bitcoin-examples.md).

## Rules

- Use `signTransaction` for P2WPKH (simpler, recommended for most cases)
- Use `signRawPayload` for P2TR Taproot or when you need custom PSBT construction
- Always fetch UTXOs from a Bitcoin node or API before building a transaction
- Set appropriate fees based on current network conditions
- Use testnet addresses (`ADDRESS_FORMAT_BITCOIN_TESTNET_P2WPKH`) for development

## Related Skills

- `creating-wallets` for Bitcoin wallet setup and address derivation
- `signing-ethereum` for EVM transactions
- `managing-policies` for Bitcoin-specific spending policies
