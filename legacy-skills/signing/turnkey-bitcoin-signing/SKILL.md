---
name: turnkey-bitcoin-signing
description: 'Signs and broadcasts Bitcoin transactions using Turnkey with bitcoinjs-lib. Supports P2WPKH (SegWit) and P2TR (Taproot) address types via signTransaction or signRawPayload. Use when asked to "send BTC", "sign a Bitcoin transaction", "create a PSBT", "sign with taproot", "sign with segwit", "transfer bitcoin", or build anything on the Bitcoin blockchain.'
compatibility: Requires Node.js. Install @turnkey/sdk-server, bitcoinjs-lib, ecpair, and tiny-secp256k1. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID, SIGN_WITH (Bitcoin bech32 address), and BITCOIN_COMPRESSED_PUBLIC_KEY env vars.
depends_on:
  - turnkey-wallet-management
  - turnkey-transaction-signing
metadata:
  version: "1.0.0"
  tags: ["turnkey", "bitcoin", "signing", "psbt", "taproot", "segwit", "p2wpkh", "p2tr", "blockchain", "utxo"]
  sdk_versions:
    "@turnkey/sdk-server": "^5.1.0"
    "@turnkey/http": "^3.17.0"
    "@turnkey/api-key-stamper": "^0.6.2"
---

# Turnkey Bitcoin Signing

## Overview

Use this skill to sign and broadcast Bitcoin transactions using Turnkey with `bitcoinjs-lib`. There is no `@turnkey/bitcoin` wrapper package — you construct PSBTs (Partially Signed Bitcoin Transactions) with `bitcoinjs-lib` and sign them via the Turnkey API.

Turnkey provides two Bitcoin signing paths. **Pick one based on your needs:**

| | `signTransaction` | `signRawPayload` |
|---|---|---|
| **Use if…** | you want the simplest approach — Turnkey handles PSBT parsing and signing internally | you need per-input signing control or custom sighash types |
| **How it works** | send the unsigned PSBT hex; Turnkey signs all inputs and returns a signed PSBT | hash each input yourself; call `signRawPayload` per input to get `(r, s)` signatures |
| **Complexity** | lower — one API call signs the entire transaction | higher — you manage per-input hashing and signature injection |
| **Recommendation** | **recommended** for most use cases | advanced — only when `signTransaction` doesn't support your use case |

Both paths support **P2WPKH** (SegWit) and **P2TR** (Taproot) address types on mainnet (`bc1q…` / `bc1p…`) and testnet (`tb1q…` / `tb1p…`).

The wallet account must have been created with `CURVE_SECP256K1`. If you haven't created a wallet yet, read `skills/core/turnkey-wallet-management/SKILL.md` first. Bitcoin wallets require TWO accounts at the same derivation path:
1. A Bitcoin address account — this gives you the `SIGN_WITH` address
   - Mainnet: `ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH` (path `m/84'/0'/0'/0/0`) or `ADDRESS_FORMAT_BITCOIN_MAINNET_P2TR` (path `m/86'/0'/0'/0/0`)
   - Testnet: `ADDRESS_FORMAT_BITCOIN_TESTNET_P2WPKH` (path `m/84'/1'/1'/0/0`) or `ADDRESS_FORMAT_BITCOIN_TESTNET_P2TR` (path `m/86'/1'/1'/0/0`)
2. A compressed public key account (`ADDRESS_FORMAT_COMPRESSED`) at the **same** path — this gives you `BITCOIN_COMPRESSED_PUBLIC_KEY`, needed for PSBT input construction

## Rules

- **Include complete setup unless you can see the user's existing code.** Always include all imports, client initialization, bitcoinjs-lib initialization, UTXO fetching, PSBT construction, and signing. Only omit setup when the user's existing code is visible and you can reference their variables directly.
- **Always construct a proper PSBT with real UTXOs.** Never create a PSBT with dummy or empty inputs. Fetch UTXOs from a block explorer API.
- **Default to testnet.** Use `bitcoin.networks.testnet` and testnet APIs unless the user explicitly requests mainnet.

## Prerequisites

**Load first if you don't have a wallet address:**
> `skills/core/turnkey-wallet-management/SKILL.md` — create a wallet and get the `SIGN_WITH` Bitcoin address (testnet: `ADDRESS_FORMAT_BITCOIN_TESTNET_P2WPKH` or `_P2TR`; mainnet: `ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH` or `_P2TR`) plus the `BITCOIN_COMPRESSED_PUBLIC_KEY` (`ADDRESS_FORMAT_COMPRESSED` at the same derivation path)

```bash
npm install @turnkey/sdk-server bitcoinjs-lib ecpair tiny-secp256k1
```

## Environment Variables

```env
TURNKEY_API_PUBLIC_KEY=         # Turnkey API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=        # Turnkey API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=        # Turnkey organization UUID
SIGN_WITH=                      # Bitcoin bech32 address (tb1q.../tb1p... testnet, bc1q.../bc1p... mainnet)
BITCOIN_COMPRESSED_PUBLIC_KEY=  # Compressed public key (hex, from ADDRESS_FORMAT_COMPRESSED account)
```

`SIGN_WITH` is the Bitcoin address derived when the wallet was created. Retrieve it using `getWalletAccounts` with the appropriate `addressFormat` (e.g., `ADDRESS_FORMAT_BITCOIN_TESTNET_P2WPKH` for testnet SegWit) — see `skills/core/turnkey-wallet-management/SKILL.md`.

`BITCOIN_COMPRESSED_PUBLIC_KEY` is the 33-byte compressed public key (hex) from the same wallet at the same derivation path, but with `addressFormat === "ADDRESS_FORMAT_COMPRESSED"`. It is needed to construct `witnessUtxo` payment scripts and (for Taproot) the `tapInternalKey`.

---

## Option A — signTransaction (recommended)

### Step 1: Initialize Turnkey client and bitcoinjs-lib

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

### Step 2: Fetch UTXOs and estimate fees

```typescript
// Testnet: use blockstream.info/testnet; mainnet: blockstream.info
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

### Step 3: Build PSBT

**P2WPKH (SegWit) inputs:**

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

**P2TR (Taproot) inputs** — replace the input construction:

```typescript
const tapInternalKey = compressedPubKey.slice(1, 33); // x-only (remove prefix byte)

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
```

### Step 4: Sign via signTransaction, finalize, and extract

```typescript
const unsignedPsbtHex = psbt.toHex();

const signResult = await client.signTransaction({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith,
  unsignedTransaction: unsignedPsbtHex,
  type: "TRANSACTION_TYPE_BITCOIN",
});

const signedPsbt = bitcoin.Psbt.fromHex(signResult.signedTransaction, {
  network,
});
signedPsbt.finalizeAllInputs();
const txHex = signedPsbt.extractTransaction().toHex();

console.log("Signed transaction hex:", txHex);

// Broadcast
const broadcastResponse = await fetch(`${apiBase}/tx`, {
  method: "POST",
  body: txHex,
});
const txid = await broadcastResponse.text();
console.log("Broadcast txid:", txid);
```

> **Note:** `signTransaction` returns a signed-but-not-finalized PSBT. You must call `finalizeAllInputs()` then `extractTransaction()` before broadcasting.

---

## Option B — signRawPayload (advanced)

Use this approach when you need per-input signing control. You define a custom signer class that calls `signRawPayload` for each input.

### TurnkeySigner class

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

### Per-input signing with PSBT

After building the PSBT (same as Option A — fetch UTXOs, construct inputs/outputs), sign each input individually:

```typescript
const signer = new TurnkeySigner(
  process.env.SIGN_WITH!,
  Buffer.from(process.env.BITCOIN_COMPRESSED_PUBLIC_KEY!, "hex")
);

// Sign each input
for (let i = 0; i < psbt.inputCount; i++) {
  await psbt.signInputAsync(i, signer);
}

psbt.finalizeAllInputs();
const txHex = psbt.extractTransaction().toHex();
console.log("Signed transaction hex:", txHex);
```

For P2TR inputs, `bitcoinjs-lib` calls `signSchnorr` automatically when it detects a Taproot input. For P2WPKH inputs, it calls `sign`.

---

## Examples

For complete, self-contained examples:

- **signTransaction path** (P2WPKH + P2TR) — see `references/signtransaction-examples.md`
- **signRawPayload path** (custom signer) — see `references/rawpayload-examples.md`

## Troubleshooting

**No confirmed UTXOs found**
The address has no spendable outputs. Fund the address first. For testnet, use a Bitcoin testnet faucet (search "bitcoin testnet faucet").

**`nonWitnessUtxo` mismatch**
The full previous transaction bytes must match the txid referenced in the input. Ensure you're fetching the correct previous transaction hex from the block explorer.

**Insufficient funds**
The sum of input UTXOs must cover the send amount plus estimated fees. Reduce the send amount or wait for more UTXOs to confirm.

**Invalid Schnorr signature (P2TR)**
Ensure you're using `signSchnorr` (not `sign`) for Taproot inputs, and that `tapInternalKey` is the 32-byte x-only key (`compressedPubKey.slice(1, 33)`), not the full 33-byte compressed key.

**Wrong `SIGN_WITH` address**
`SIGN_WITH` must be a Bitcoin bech32 address (`bc1q…` for P2WPKH, `bc1p…` for P2TR on mainnet; `tb1q…` / `tb1p…` on testnet) that exists as a wallet account in your Turnkey organization. Confirm with `getWalletAccounts`.

**Turnkey signing activity failure**
Check the Turnkey console for the activity status. Common causes: the key curve doesn't match (must be `CURVE_SECP256K1`), or the PSBT is malformed.

**Policy rejection (`ACTIVITY_STATUS_REJECTED`)**
A policy denied the signing operation. Review policies in the Turnkey console under **Policies**.

## Related Skills

- `skills/core/turnkey-wallet-management/SKILL.md` — create a Bitcoin wallet and get your `SIGN_WITH` address and compressed public key
- `skills/core/turnkey-transaction-signing/SKILL.md` — understand the stamping model; raw signing details
- `skills/signing/turnkey-ethereum-evm/SKILL.md` — EVM signing (ethers.js or viem)
- `skills/signing/turnkey-solana-signing/SKILL.md` — Solana transaction signing
