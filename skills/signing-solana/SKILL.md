---
name: signing-solana
description: "Signs and broadcasts Solana transactions using Turnkey. Covers SOL transfers, SPL token transfers, versioned transactions, and message signing. Use when asked to 'send SOL', 'sign a Solana transaction', 'transfer SPL tokens', 'sign a Solana message', or 'interact with a Solana program'."
license: Apache-2.0
compatibility: "Requires Node.js. Install @turnkey/sdk-server @turnkey/solana @solana/web3.js. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID, SIGN_WITH env vars."
metadata:
  version: "1.0.0"
  tags: ["solana", "signing", "transaction", "spl"]
---

# Signing Solana Transactions

## Quick Start

Use `@turnkey/solana` to sign Solana transactions. The `TurnkeySigner` implements the signing interface but does not store the address internally, so always pass the public key separately.

## Prerequisites

```bash
npm install @turnkey/sdk-server @turnkey/solana @solana/web3.js
```

## Environment Variables

```env
TURNKEY_API_PUBLIC_KEY=    # required
TURNKEY_API_PRIVATE_KEY=   # required
TURNKEY_ORGANIZATION_ID=   # required
SIGN_WITH=                 # Solana public key (base58)
```

## Instructions

### Step 1: Initialize signer and connection

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { TurnkeySigner } from "@turnkey/solana";
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const signer = new TurnkeySigner({ organizationId: process.env.TURNKEY_ORGANIZATION_ID!, client: turnkey.apiClient() });
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const fromKey = new PublicKey(process.env.SIGN_WITH!);
```

### Step 2: Build and sign a SOL transfer

```typescript
const tx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: fromKey,
    toPubkey: new PublicKey("RECIPIENT_ADDRESS"),
    lamports: 0.01 * LAMPORTS_PER_SOL,
  })
);

tx.feePayer = fromKey;
tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

await signer.addSignature(tx, process.env.SIGN_WITH!);
const sig = await connection.sendRawTransaction(tx.serialize());
console.log("Signature:", sig);
```

**Key detail:** `TurnkeySigner` does not store the address. Always pass `process.env.SIGN_WITH` to `addSignature`.

For complete examples (SPL transfers, versioned transactions, message signing, batch sends), see [references/solana-examples.md](references/solana-examples.md).

## Rules

- Always pass the signing address explicitly to `addSignature` (the signer does not store it)
- Set `feePayer` and `recentBlockhash` before signing
- Use `@turnkey/solana`, not `@turnkey/ethers`, for Solana transactions
- For versioned transactions, use `VersionedTransaction` from `@solana/web3.js`

## Related Skills

- `creating-wallets` for wallet setup and Solana address derivation
- `signing-ethereum` for EVM transactions
