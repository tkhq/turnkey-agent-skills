/**
 * Turnkey Bitcoin Signing — Runnable Example
 *
 * Sends 1000 satoshis on Bitcoin testnet using signTransaction with P2WPKH (SegWit).
 *
 * Required environment variables:
 *   TURNKEY_API_PUBLIC_KEY          — Turnkey API key public component
 *   TURNKEY_API_PRIVATE_KEY         — Turnkey API key private component
 *   TURNKEY_ORGANIZATION_ID         — Turnkey organization UUID
 *   SIGN_WITH                       — Bitcoin testnet address (tb1q...)
 *   BITCOIN_COMPRESSED_PUBLIC_KEY   — Compressed public key (hex, from ADDRESS_FORMAT_COMPRESSED)
 *
 * Optional:
 *   RECIPIENT   — Recipient testnet address (defaults to a well-known testnet address)
 *
 * Run with:
 *   npx tsx examples/bitcoin-signing.ts
 */

import { Turnkey } from "@turnkey/sdk-server";
import * as bitcoin from "bitcoinjs-lib";
import ECPairFactory from "ecpair";
import * as tinysecp from "tiny-secp256k1";

bitcoin.initEccLib(tinysecp);
const ECPair = ECPairFactory(tinysecp);

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RECIPIENT =
  process.env.RECIPIENT ?? "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx";
const AMOUNT_SATS = 1000;
const NETWORK = bitcoin.networks.testnet;
const API_BASE = "https://blockstream.info/testnet/api";

// ---------------------------------------------------------------------------
// Client setup
// ---------------------------------------------------------------------------

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const signWith = process.env.SIGN_WITH!;
const compressedPubKey = Buffer.from(
  process.env.BITCOIN_COMPRESSED_PUBLIC_KEY!,
  "hex"
);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Fetch UTXOs
  const utxoResponse = await fetch(`${API_BASE}/address/${signWith}/utxo`);
  const utxos: Array<{
    txid: string;
    vout: number;
    value: number;
    status: { confirmed: boolean };
  }> = await utxoResponse.json();

  const confirmedUtxos = utxos.filter((u) => u.status.confirmed);
  const balance = confirmedUtxos.reduce((sum, u) => sum + u.value, 0);

  console.log("Network: testnet");
  console.log("Sender: ", signWith);
  console.log("Balance:", balance, "sats");
  console.log("Send:   ", AMOUNT_SATS, "sats →", RECIPIENT);

  if (confirmedUtxos.length === 0) {
    throw new Error(
      "No confirmed UTXOs found. Fund your testnet address using a Bitcoin testnet faucet."
    );
  }

  // Estimate fees
  const feeResponse = await fetch(
    "https://mempool.space/testnet/api/v1/fees/recommended"
  );
  const fees: { fastestFee: number; halfHourFee: number; hourFee: number } =
    await feeResponse.json();
  const feeRate = fees.halfHourFee;

  // Build PSBT with P2WPKH inputs
  const psbt = new bitcoin.Psbt({ network: NETWORK });

  const payment = bitcoin.payments.p2wpkh({
    pubkey: compressedPubKey,
    network: NETWORK,
  });

  for (const utxo of confirmedUtxos) {
    const prevTxResponse = await fetch(`${API_BASE}/tx/${utxo.txid}/hex`);
    const prevTxHex = await prevTxResponse.text();

    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: Buffer.from(prevTxHex, "hex"),
      witnessUtxo: {
        script: payment.output!,
        value: utxo.value,
      },
    });
  }

  const estimatedFee = feeRate * (90 * confirmedUtxos.length + 45 * 2);
  const change = balance - AMOUNT_SATS - estimatedFee;
  if (change < 0) {
    throw new Error(
      `Insufficient funds. Need ${AMOUNT_SATS + estimatedFee} sats, have ${balance} sats.`
    );
  }

  psbt.addOutput({ address: RECIPIENT, value: AMOUNT_SATS });
  if (change > 546) {
    psbt.addOutput({ address: signWith, value: change });
  }

  // Sign via Turnkey
  console.log("\nSigning transaction via Turnkey...");
  const signResult = await client.signTransaction({
    organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
    signWith,
    unsignedTransaction: psbt.toHex(),
    type: "TRANSACTION_TYPE_BITCOIN",
  });

  // Finalize and extract
  const signedPsbt = bitcoin.Psbt.fromHex(signResult.signedTransaction, {
    network: NETWORK,
  });
  signedPsbt.finalizeAllInputs();
  const txHex = signedPsbt.extractTransaction().toHex();

  // Broadcast
  console.log("Broadcasting...");
  const broadcastResponse = await fetch(`${API_BASE}/tx`, {
    method: "POST",
    body: txHex,
  });
  const txid = await broadcastResponse.text();

  console.log("Transaction ID:", txid);
  console.log(
    "Explorer:       ",
    `https://blockstream.info/testnet/tx/${txid}`
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
