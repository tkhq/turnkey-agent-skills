---
name: turnkey-solana-signing
version: "1.0.0"
description: 'Signs and sends Solana transactions using Turnkey with @turnkey/solana. Covers SOL transfers, batch signing, message signing, and versioned transactions. Use when asked to "send SOL", "sign a Solana transaction", "transfer SPL tokens", "sign a Solana message", "interact with a Solana program", "stake SOL", "batch send to multiple addresses", or build anything on the Solana blockchain.'
tags: ["turnkey", "solana", "signing", "blockchain", "sol", "spl-tokens", "crypto", "web3"]
compatibility: Requires Node.js. Install @turnkey/solana and @solana/web3.js. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID, SIGN_WITH (base58 Solana address) env vars.
sdk_versions:
  "@turnkey/http": "^3.17.0"
  "@turnkey/api-key-stamper": "^0.6.2"
  "@turnkey/solana": "^1.1.25"
---

# Turnkey Solana Signing

## Overview

Use this skill to sign and broadcast Solana transactions using `@turnkey/solana`. `TurnkeySigner` wraps a Turnkey client and exposes `signTransaction`, `signAllTransactions`, and `signMessage` methods — each taking the sender's Solana address as a parameter.

The wallet account must have been created with `ADDRESS_FORMAT_SOLANA` and `CURVE_ED25519`. If you haven't created a wallet yet, read `skills/core/wallet-management/SKILL.md` first.

## Prerequisites

```bash
npm install @turnkey/http @turnkey/api-key-stamper @turnkey/solana @solana/web3.js
```

## Environment Variables

```env
TURNKEY_API_PUBLIC_KEY=    # Turnkey API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # Turnkey API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Turnkey organization UUID
SIGN_WITH=                 # Solana address of the wallet account (base58)
SOLANA_RPC=                # Optional. Defaults to devnet public endpoint
```

`SIGN_WITH` is the base58 Solana address derived when the wallet was created. Retrieve it using `getWalletAccounts` with `addressFormat === "ADDRESS_FORMAT_SOLANA"` — see `skills/core/wallet-management/SKILL.md`.

**Note:** Unlike the EVM signers, `TurnkeySigner` from `@turnkey/solana` does not store the address internally. You pass `fromAddress` (the base58 Solana address) as an argument to each signing call. Keep it in a variable.

## Instructions

### Step 1: Initialize TurnkeyClient and TurnkeySigner

`TurnkeySigner` accepts both `TurnkeyClient` (from `@turnkey/http`) and the `@turnkey/sdk-server` client. If you already have a `@turnkey/sdk-server` client from the wallet-management skill, pass `turnkey.apiClient()` directly and skip installing `@turnkey/http`.

```typescript
import { TurnkeyClient } from "@turnkey/http";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { TurnkeySigner } from "@turnkey/solana";

const client = new TurnkeyClient(
  { baseUrl: "https://api.turnkey.com" },
  new ApiKeyStamper({
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  })
);

const signer = new TurnkeySigner({
  client,
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

// Address is managed by the caller, not stored on the signer
const solanaAddress = process.env.SIGN_WITH!;
```

### Step 2: Create a connection and build a transaction

```typescript
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const connection = new Connection(
  process.env.SOLANA_RPC ?? "https://api.devnet.solana.com",
  "confirmed"
);

const senderPublicKey = new PublicKey(solanaAddress);

const { blockhash, lastValidBlockHeight } =
  await connection.getLatestBlockhash();

const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: senderPublicKey,
    toPubkey: new PublicKey("RecipientBase58Address"),
    lamports: Math.round(0.001 * LAMPORTS_PER_SOL),
  })
);
transaction.recentBlockhash = blockhash;
transaction.feePayer = senderPublicKey;
```

### Step 3: Sign and send

```typescript
// signTransaction returns a new signed transaction
const signedTransaction = await signer.signTransaction(transaction, solanaAddress);

const signature = await connection.sendRawTransaction(
  (signedTransaction as Transaction).serialize()
);

await connection.confirmTransaction(
  { signature, blockhash, lastValidBlockHeight },
  "confirmed"
);
console.log("Transaction confirmed:", signature);
```

## Examples

For complete usage examples — SOL transfer, batch signing, message signing, and versioned transactions — see `references/solana-examples.md`.

## Troubleshooting

**`Blockhash not found` / blockhash expiry**
Solana blockhashes expire after ~150 slots (~60 seconds). Always fetch a fresh blockhash immediately before signing. Do not reuse blockhashes across retries:
```typescript
const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
transaction.recentBlockhash = blockhash;
```

**`Insufficient lamports`**
The account does not have enough SOL for the transfer plus transaction fee (~5000 lamports). Fund the address at `solanaAddress`. On devnet:
```bash
solana airdrop 1 <solanaAddress> --url devnet
```

**`Signature verification failed`**
The `feePayer` or signer in the transaction does not match the key that signed. Ensure `transaction.feePayer = senderPublicKey` is set, and that `fromAddress` passed to `signTransaction` matches the address that owns the key.

**Wallet account not found in Turnkey**
`SIGN_WITH` must be a base58 Solana address that exists as an `ADDRESS_FORMAT_SOLANA` account in your Turnkey organization. Verify with `getWalletAccounts`.

**`SendTransactionError` with program logs**
The transaction was sent but the Solana program rejected it. Inspect `error.logs` for the error:
```typescript
try {
  await connection.sendRawTransaction((signedTx as Transaction).serialize());
} catch (err: any) {
  if (err.logs) console.error("Program logs:", err.logs);
  throw err;
}
```

## Related Skills

- `skills/core/wallet-management/SKILL.md` — create a Solana wallet account (`ADDRESS_FORMAT_SOLANA`)
- `skills/core/transaction-signing/SKILL.md` — understand the stamping model
- `skills/signing/ethereum-evm/SKILL.md` — EVM signing (ethers.js or viem)
