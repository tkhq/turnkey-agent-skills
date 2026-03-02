/**
 * Turnkey Solana Signing — Runnable Example
 *
 * Sends 0.001 SOL on devnet using TurnkeySigner from @turnkey/solana.
 *
 * Required environment variables:
 *   TURNKEY_API_PUBLIC_KEY    — Turnkey API key public component
 *   TURNKEY_API_PRIVATE_KEY   — Turnkey API key private component
 *   TURNKEY_ORGANIZATION_ID   — Turnkey organization UUID
 *   SIGN_WITH                 — Solana address of your Turnkey wallet account (base58)
 *
 * Optional:
 *   SOLANA_RPC        — RPC endpoint (defaults to devnet public endpoint)
 *   RECIPIENT         — Recipient base58 address
 *
 * Run with:
 *   npx tsx examples/solana-signing.ts
 */

import { TurnkeyClient } from "@turnkey/http";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { TurnkeySigner } from "@turnkey/solana";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// A known devnet address — replace with your intended recipient
const RECIPIENT =
  process.env.RECIPIENT ?? "FN2PVMmuBdVkUFRXB1bCkL7j2kW5VGZrTrRh1rRLSjqB";
const AMOUNT_SOL = 0.001;

// ---------------------------------------------------------------------------
// Client + signer setup
// ---------------------------------------------------------------------------

const client = new TurnkeyClient(
  { baseUrl: "https://api.turnkey.com" },
  new ApiKeyStamper({
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  })
);

// TurnkeySigner does not store the address — pass it per signing call
const signer = new TurnkeySigner({
  client,
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const solanaAddress = process.env.SIGN_WITH!;
const senderPublicKey = new PublicKey(solanaAddress);

const connection = new Connection(
  process.env.SOLANA_RPC ?? "https://api.devnet.solana.com",
  "confirmed"
);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const balance = await connection.getBalance(senderPublicKey);

  console.log("Network:  devnet");
  console.log("Sender:  ", solanaAddress);
  console.log("Balance: ", balance / LAMPORTS_PER_SOL, "SOL");
  console.log("Send:    ", AMOUNT_SOL, "SOL →", RECIPIENT);

  const minRequired = Math.round(AMOUNT_SOL * LAMPORTS_PER_SOL) + 5000;
  if (balance < minRequired) {
    throw new Error(
      `Insufficient balance. Need at least ${AMOUNT_SOL} SOL plus fees. ` +
        `Request an airdrop: solana airdrop 1 ${solanaAddress} --url devnet`
    );
  }

  // Build transaction — always fetch a fresh blockhash immediately before signing
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: senderPublicKey,
      toPubkey: new PublicKey(RECIPIENT),
      lamports: Math.round(AMOUNT_SOL * LAMPORTS_PER_SOL),
    })
  );
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = senderPublicKey;

  // Sign with Turnkey — fromAddress is passed per-call
  console.log("\nSigning transaction via Turnkey...");
  const signedTransaction = await signer.signTransaction(
    transaction,
    solanaAddress
  );

  // Broadcast
  console.log("Broadcasting...");
  const signature = await connection.sendRawTransaction(
    (signedTransaction as Transaction).serialize()
  );

  console.log("Transaction signature:", signature);
  console.log("Waiting for confirmation...");

  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed"
  );
  console.log("Confirmed!");
  console.log(
    "Explorer:          ",
    `https://explorer.solana.com/tx/${signature}?cluster=devnet`
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
