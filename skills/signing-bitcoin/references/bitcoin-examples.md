# Bitcoin Examples

## P2WPKH (SegWit) with signTransaction

The simplest approach. Turnkey handles PSBT construction and signing.

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import * as bitcoin from "bitcoinjs-lib";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();
const network = bitcoin.networks.testnet;

// 1. Fetch UTXOs for your address (use a Bitcoin API like Blockstream, Mempool, etc.)
const utxos = [
  {
    txid: "previous_tx_hash",
    vout: 0,
    value: 50000, // satoshis
  },
];

// 2. Build the unsigned transaction
const psbt = new bitcoin.Psbt({ network });

for (const utxo of utxos) {
  psbt.addInput({
    hash: utxo.txid,
    index: utxo.vout,
    witnessUtxo: {
      script: bitcoin.address.toOutputScript(process.env.SIGN_WITH!, network),
      value: utxo.value,
    },
  });
}

psbt.addOutput({
  address: "RECIPIENT_BTC_ADDRESS",
  value: 10000, // satoshis to send
});

psbt.addOutput({
  address: process.env.SIGN_WITH!, // change back to self
  value: 50000 - 10000 - 500, // value minus send minus fee
});

// 3. Sign with Turnkey
const unsignedHex = psbt.toHex();
const result = await client.signTransaction({
  signWith: process.env.SIGN_WITH!,
  unsignedTransaction: unsignedHex,
  type: "TRANSACTION_TYPE_BITCOIN",
});

console.log("Signed transaction:", result.signedTransaction);

// 4. Broadcast (use a Bitcoin API)
// POST result.signedTransaction to a broadcast endpoint
```

## P2TR (Taproot) with signRawPayload

For Taproot addresses, use `signRawPayload` with Schnorr signatures.

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";

bitcoin.initEccLib(ecc);

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();
const network = bitcoin.networks.testnet;

// For Taproot, you need the internal public key (x-only, 32 bytes)
// This comes from your wallet account's compressedPublicKey, stripped of the prefix byte
const compressedPubKeyHex = "YOUR_COMPRESSED_PUBLIC_KEY"; // from wallet account
const internalPubKey = Buffer.from(compressedPubKeyHex, "hex").subarray(1); // remove prefix

const utxos = [
  {
    txid: "previous_tx_hash",
    vout: 0,
    value: 50000,
  },
];

const psbt = new bitcoin.Psbt({ network });

for (const utxo of utxos) {
  psbt.addInput({
    hash: utxo.txid,
    index: utxo.vout,
    witnessUtxo: {
      script: bitcoin.address.toOutputScript(process.env.SIGN_WITH!, network),
      value: utxo.value,
    },
    tapInternalKey: internalPubKey,
  });
}

psbt.addOutput({
  address: "RECIPIENT_BTC_ADDRESS",
  value: 10000,
});

psbt.addOutput({
  address: process.env.SIGN_WITH!,
  value: 50000 - 10000 - 500,
});

// Sign each input with signRawPayload
for (let i = 0; i < psbt.inputCount; i++) {
  const sigHash = psbt.getHashForWitness(i);
  const sigHashHex = sigHash.toString("hex");

  const signResult = await client.signRawPayload({
    signWith: process.env.SIGN_WITH!,
    payload: sigHashHex,
    encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
    hashFunction: "HASH_FUNCTION_NO_OP", // Taproot uses pre-hashed sighash
  });

  const signature = Buffer.from(signResult.r + signResult.s, "hex");
  psbt.updateInput(i, {
    tapKeySig: signature,
  });
}

psbt.finalizeAllInputs();
const txHex = psbt.extractTransaction().toHex();
console.log("Signed Taproot transaction:", txHex);
```
