# signRawPayload Examples

Each example below is fully self-contained — it includes all imports and setup so you can use it directly.

## Send BTC with P2WPKH using custom signer

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import * as bitcoin from "bitcoinjs-lib";
import ECPairFactory from "ecpair";
import * as tinysecp from "tiny-secp256k1";

bitcoin.initEccLib(tinysecp);
const ECPair = ECPairFactory(tinysecp);

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const network = bitcoin.networks.testnet;
const signWith = process.env.SIGN_WITH!;
const compressedPubKey = Buffer.from(
  process.env.BITCOIN_COMPRESSED_PUBLIC_KEY!,
  "hex"
);

class TurnkeySigner {
  public publicKey: Buffer;

  constructor(
    private signWith: string,
    compressedPublicKey: Buffer
  ) {
    this.publicKey = compressedPublicKey;
  }

  async sign(hash: Buffer): Promise<Buffer> {
    const result = await client.signRawPayload({
      organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
      signWith: this.signWith,
      payload: hash.toString("hex"),
      encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
      hashFunction: "HASH_FUNCTION_NO_OP",
    });
    const r = Buffer.from(result.r!, "hex");
    const s = Buffer.from(result.s!, "hex");
    return Buffer.concat([r, s]);
  }
}

async function sendBtcP2wpkhRaw(
  recipientAddress: string,
  amountSats: number
) {
  const apiBase = "https://blockstream.info/testnet/api";

  // Fetch UTXOs
  const utxoResponse = await fetch(`${apiBase}/address/${signWith}/utxo`);
  const utxos: Array<{
    txid: string;
    vout: number;
    value: number;
    status: { confirmed: boolean };
  }> = await utxoResponse.json();

  const confirmedUtxos = utxos.filter((u) => u.status.confirmed);
  if (confirmedUtxos.length === 0) throw new Error("No confirmed UTXOs found");

  // Estimate fees
  const feeResponse = await fetch(
    "https://mempool.space/testnet/api/v1/fees/recommended"
  );
  const fees: { fastestFee: number; halfHourFee: number; hourFee: number } =
    await feeResponse.json();
  const feeRate = fees.halfHourFee;

  // Build PSBT
  const psbt = new bitcoin.Psbt({ network });

  const payment = bitcoin.payments.p2wpkh({
    pubkey: compressedPubKey,
    network,
  });

  for (const utxo of confirmedUtxos) {
    const prevTxResponse = await fetch(`${apiBase}/tx/${utxo.txid}/hex`);
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

  const inputTotal = confirmedUtxos.reduce((sum, u) => sum + u.value, 0);
  const estimatedFee = feeRate * (90 * confirmedUtxos.length + 45 * 2);
  const change = inputTotal - amountSats - estimatedFee;
  if (change < 0) throw new Error("Insufficient funds");

  psbt.addOutput({ address: recipientAddress, value: amountSats });
  if (change > 546) {
    psbt.addOutput({ address: signWith, value: change });
  }

  // Sign each input with custom signer
  const signer = new TurnkeySigner(signWith, compressedPubKey);
  for (let i = 0; i < psbt.inputCount; i++) {
    await psbt.signInputAsync(i, signer);
  }

  psbt.finalizeAllInputs();
  const txHex = psbt.extractTransaction().toHex();

  // Broadcast
  const broadcastResponse = await fetch(`${apiBase}/tx`, {
    method: "POST",
    body: txHex,
  });
  const txid = await broadcastResponse.text();
  console.log("Broadcast txid:", txid);
  return txid;
}

sendBtcP2wpkhRaw("tb1qRecipientAddress", 1000).catch(console.error);
```

## Send BTC with P2TR using custom signer

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import * as bitcoin from "bitcoinjs-lib";
import ECPairFactory from "ecpair";
import * as tinysecp from "tiny-secp256k1";

bitcoin.initEccLib(tinysecp);
const ECPair = ECPairFactory(tinysecp);

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const network = bitcoin.networks.testnet;
const signWith = process.env.SIGN_WITH!;
const compressedPubKey = Buffer.from(
  process.env.BITCOIN_COMPRESSED_PUBLIC_KEY!,
  "hex"
);

class TurnkeySigner {
  public publicKey: Buffer;

  constructor(
    private signWith: string,
    compressedPublicKey: Buffer
  ) {
    // For P2TR, publicKey must be the 32-byte x-only key
    this.publicKey = compressedPublicKey.slice(1, 33);
  }

  async signSchnorr(hash: Buffer): Promise<Buffer> {
    const result = await client.signRawPayload({
      organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
      signWith: this.signWith,
      payload: hash.toString("hex"),
      encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
      hashFunction: "HASH_FUNCTION_NO_OP",
    });
    const r = Buffer.from(result.r!, "hex");
    const s = Buffer.from(result.s!, "hex");
    return Buffer.concat([r, s]);
  }
}

async function sendBtcP2trRaw(recipientAddress: string, amountSats: number) {
  const apiBase = "https://blockstream.info/testnet/api";

  // Fetch UTXOs
  const utxoResponse = await fetch(`${apiBase}/address/${signWith}/utxo`);
  const utxos: Array<{
    txid: string;
    vout: number;
    value: number;
    status: { confirmed: boolean };
  }> = await utxoResponse.json();

  const confirmedUtxos = utxos.filter((u) => u.status.confirmed);
  if (confirmedUtxos.length === 0) throw new Error("No confirmed UTXOs found");

  // Estimate fees
  const feeResponse = await fetch(
    "https://mempool.space/testnet/api/v1/fees/recommended"
  );
  const fees: { fastestFee: number; halfHourFee: number; hourFee: number } =
    await feeResponse.json();
  const feeRate = fees.halfHourFee;

  // Build PSBT with P2TR inputs
  const psbt = new bitcoin.Psbt({ network });

  const tapInternalKey = compressedPubKey.slice(1, 33);
  const taprootPayment = bitcoin.payments.p2tr({
    internalPubkey: tapInternalKey,
    network,
  });

  for (const utxo of confirmedUtxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: taprootPayment.output!,
        value: utxo.value,
      },
      tapInternalKey,
    });
  }

  const inputTotal = confirmedUtxos.reduce((sum, u) => sum + u.value, 0);
  const estimatedFee = feeRate * (90 * confirmedUtxos.length + 45 * 2);
  const change = inputTotal - amountSats - estimatedFee;
  if (change < 0) throw new Error("Insufficient funds");

  psbt.addOutput({ address: recipientAddress, value: amountSats });
  if (change > 546) {
    psbt.addOutput({ address: signWith, value: change });
  }

  // Sign each input with custom Schnorr signer
  const signer = new TurnkeySigner(signWith, compressedPubKey);
  for (let i = 0; i < psbt.inputCount; i++) {
    await psbt.signInputAsync(i, signer);
  }

  psbt.finalizeAllInputs();
  const txHex = psbt.extractTransaction().toHex();

  // Broadcast
  const broadcastResponse = await fetch(`${apiBase}/tx`, {
    method: "POST",
    body: txHex,
  });
  const txid = await broadcastResponse.text();
  console.log("Broadcast txid:", txid);
  return txid;
}

sendBtcP2trRaw("tb1pRecipientAddress", 1000).catch(console.error);
```
