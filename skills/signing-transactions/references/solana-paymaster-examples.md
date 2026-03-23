# Solana Paymaster Examples (Gasless Solana Transactions)

Complete examples for sending sponsored/gasless Solana transactions using Turnkey's gas station.

With the Solana paymaster, Turnkey signs and broadcasts the transaction with sponsored fees. The user pays no SOL for gas.

## Prerequisites

```bash
npm install @turnkey/sdk-server @solana/web3.js @solana/spl-token
```

## Send Sponsored SPL Token Transfer

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import {
  Connection, PublicKey, TransactionMessage, VersionedTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction, createTransferInstruction,
  getAccount, getAssociatedTokenAddressSync, TokenAccountNotFoundError,
} from "@solana/spl-token";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const organizationId = process.env.TURNKEY_ORGANIZATION_ID!;
const senderAddress = new PublicKey(process.env.SIGN_WITH!);
const recipientAddress = new PublicKey("RECIPIENT_SOLANA_ADDRESS");

// USDC on Solana mainnet
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const CAIP2_SOLANA = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"; // Solana mainnet

const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

// Get token accounts
const sourceAta = getAssociatedTokenAddressSync(USDC_MINT, senderAddress);
const destinationAta = getAssociatedTokenAddressSync(USDC_MINT, recipientAddress);

// Build instructions
const instructions = [];

// Create destination token account if it doesn't exist
const destinationAccountInfo = await connection.getAccountInfo(destinationAta);
if (!destinationAccountInfo) {
  instructions.push(
    createAssociatedTokenAccountInstruction(senderAddress, destinationAta, recipientAddress, USDC_MINT)
  );
}

// Add transfer instruction
const amount = 100_000n; // 0.1 USDC (6 decimals)
instructions.push(
  createTransferInstruction(sourceAta, destinationAta, senderAddress, amount)
);

// Build versioned transaction
const { blockhash } = await connection.getLatestBlockhash();
const txMessage = new TransactionMessage({
  payerKey: senderAddress,
  recentBlockhash: blockhash,
  instructions,
});

const versionedTx = new VersionedTransaction(txMessage.compileToV0Message());
const unsignedTransaction = Buffer.from(versionedTx.serialize()).toString("hex");

// Send with sponsorship
const { sendTransactionStatusId } = await turnkey.apiClient().solSendTransaction({
  organizationId,
  unsignedTransaction,
  signWith: senderAddress.toBase58(),
  caip2: CAIP2_SOLANA,
  sponsor: true,
});

// Poll for status (same pattern as EVM paymaster)
const status = await pollTransactionStatus(turnkey, organizationId, sendTransactionStatusId);
console.log("TX signature:", status.solana?.txSignature);
```

## Poll Transaction Status Helper

```typescript
async function pollTransactionStatus(
  turnkey: Turnkey,
  organizationId: string,
  sendTransactionStatusId: string,
  maxAttempts = 30,
  intervalMs = 2000,
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await turnkey.apiClient().getSendTransactionStatus({
      organizationId,
      sendTransactionStatusId,
    });

    if (status.status === "CONFIRMED" || status.solana?.txSignature) {
      return status;
    }

    if (status.status === "FAILED") {
      throw new Error(`Transaction failed: ${JSON.stringify(status)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Transaction status polling timed out");
}
```

## CAIP-2 Solana Identifiers

| Network | CAIP-2 |
|---|---|
| Solana Mainnet | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` |
| Solana Devnet | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG` |
