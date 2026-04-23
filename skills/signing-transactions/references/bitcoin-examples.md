# Bitcoin Signing Examples

Bitcoin signing uses `signTransaction` with `TRANSACTION_TYPE_BITCOIN`. You construct a PSBT (Partially Signed Bitcoin Transaction) using `bitcoinjs-lib`, send it to Turnkey for signing, then finalize and broadcast.

There is no Turnkey-managed (Tier 3) equivalent for Bitcoin. You must construct the PSBT yourself.

```bash
npm install @turnkey/sdk-server bitcoinjs-lib ecpair tiny-secp256k1
```

## Prerequisites

Bitcoin wallets require **two accounts at the same derivation path**:
1. A Bitcoin address account — gives you the `SIGN_WITH` address (`bc1q...` / `bc1p...` / `tb1q...` / `tb1p...`)
2. A compressed public key account (`ADDRESS_FORMAT_COMPRESSED`) at the **same** path — gives you `BITCOIN_COMPRESSED_PUBLIC_KEY`, needed for PSBT input construction

Create both when setting up the wallet via the `managing-wallets` skill.

```env
SIGN_WITH=                      # Bitcoin bech32 address
BITCOIN_COMPRESSED_PUBLIC_KEY=  # 33-byte compressed public key (hex)
```

## Setup

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

const network = bitcoin.networks.testnet; // use bitcoin.networks.bitcoin for mainnet
const signWith = process.env.SIGN_WITH!;
const compressedPubKey = Buffer.from(
  process.env.BITCOIN_COMPRESSED_PUBLIC_KEY!,
  "hex"
);
```

## Fetch UTXOs and estimate fees

```typescript
// Testnet: blockstream.info/testnet; Mainnet: blockstream.info
const apiBase = "https://blockstream.info/testnet/api";

const utxoResponse = await fetch(`${apiBase}/address/${signWith}/utxo`);
const utxos: Array<{
  txid: string;
  vout: number;
  value: number;
  status: { confirmed: boolean };
}> = await utxoResponse.json();

const confirmedUtxos = utxos.filter((u) => u.status.confirmed);
if (confirmedUtxos.length === 0) throw new Error("No confirmed UTXOs found");

// Fee estimation from mempool.space
const feeResponse = await fetch(
  "https://mempool.space/testnet/api/v1/fees/recommended"
);
const fees: { fastestFee: number; halfHourFee: number; hourFee: number } =
  await feeResponse.json();
const feeRate = fees.halfHourFee; // sat/vB
```

## Send BTC with P2WPKH (SegWit)

<!-- compile-skip: the Build PSBT block depends on variables from "Fetch UTXOs" and the Sign-and-broadcast block depends on `psbt` from Build PSBT; reference-compiles.test.ts can't reconstruct this chain without per-section-wide scope, which would break other sections. Syntax is still checked. -->

### Build the PSBT

```typescript
const psbt = new bitcoin.Psbt({ network });

const payment = bitcoin.payments.p2wpkh({
  pubkey: compressedPubKey,
  network,
});

for (const utxo of confirmedUtxos) {
  // Fetch the full previous transaction (needed for nonWitnessUtxo)
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

const sendAmount = 1000; // satoshis
const inputTotal = confirmedUtxos.reduce((sum, u) => sum + u.value, 0);
const estimatedFee = feeRate * (90 * confirmedUtxos.length + 45 * 2);
const change = inputTotal - sendAmount - estimatedFee;
if (change < 0) throw new Error("Insufficient funds");

psbt.addOutput({
  address: "tb1qRecipientAddress", // recipient
  value: sendAmount,
});

if (change > 546) {
  // dust threshold
  psbt.addOutput({
    address: signWith, // change back to sender
    value: change,
  });
}
```

### Sign, finalize, and broadcast

```typescript
const unsignedPsbtHex = psbt.toHex();

const signResult = await client.signTransaction({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith,
  unsignedTransaction: unsignedPsbtHex,
  type: "TRANSACTION_TYPE_BITCOIN",
});

// signTransaction returns a signed-but-not-finalized PSBT
const signedPsbt = bitcoin.Psbt.fromHex(signResult.signedTransaction, {
  network,
});
signedPsbt.finalizeAllInputs();
const txHex = signedPsbt.extractTransaction().toHex();

// Broadcast
const broadcastResponse = await fetch(`${apiBase}/tx`, {
  method: "POST",
  body: txHex,
});
const txid = await broadcastResponse.text();
console.log("Broadcast txid:", txid);
```

## Send BTC with P2TR (Taproot)

<!-- compile-skip: written as a delta on top of "Send BTC with P2WPKH" — it reuses `confirmedUtxos` and `network` from earlier continuation sections. Syntax is still checked. -->

Taproot uses the x-only public key (32 bytes, without the prefix byte) as the `tapInternalKey`.

### Build the PSBT

Replace the input construction from the P2WPKH example:

```typescript
const tapInternalKey = compressedPubKey.slice(1, 33); // x-only (remove prefix byte)

const taprootPayment = bitcoin.payments.p2tr({
  internalPubkey: tapInternalKey,
  network,
});

const psbt = new bitcoin.Psbt({ network });

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

// Add outputs (same as P2WPKH — sendAmount, change)
```

The signing, finalization, and broadcast steps are identical to P2WPKH.

## Advanced: Per-input signing with signRawPayload

<!-- compile-skip: the class-definition block and the usage block share state within the section, which our per-block scope isolation breaks. Syntax is still checked. -->

Use this approach when you need per-input signing control or custom sighash types. You define a custom signer class that calls `signRawPayload` for each PSBT input.

```typescript
class TurnkeySigner {
  public publicKey: Buffer;

  constructor(
    private signWith: string,
    compressedPublicKey: Buffer
  ) {
    this.publicKey = compressedPublicKey;
  }

  // ECDSA signing for P2WPKH inputs
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

  // Schnorr signing for P2TR inputs
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
```

After building the PSBT, sign each input individually:

```typescript
const signer = new TurnkeySigner(
  process.env.SIGN_WITH!,
  Buffer.from(process.env.BITCOIN_COMPRESSED_PUBLIC_KEY!, "hex")
);

for (let i = 0; i < psbt.inputCount; i++) {
  await psbt.signInputAsync(i, signer);
}

psbt.finalizeAllInputs();
const txHex = psbt.extractTransaction().toHex();
```

`bitcoinjs-lib` calls `signSchnorr` automatically for Taproot inputs and `sign` for P2WPKH inputs.

## Troubleshooting

**No confirmed UTXOs found**
The address has no spendable outputs. Fund it first. For testnet, use a Bitcoin testnet faucet.

**`nonWitnessUtxo` mismatch**
The full previous transaction bytes must match the txid in the input. Ensure you're fetching the correct previous transaction hex.

**Insufficient funds**
The sum of input UTXOs must cover the send amount plus estimated fees.

**Invalid Schnorr signature (P2TR)**
Ensure `tapInternalKey` is the 32-byte x-only key (`compressedPubKey.slice(1, 33)`), not the full 33-byte compressed key.

**Policy rejection (`ACTIVITY_STATUS_REJECTED`)**
A policy denied the signing operation. Review policies in the Turnkey console.
