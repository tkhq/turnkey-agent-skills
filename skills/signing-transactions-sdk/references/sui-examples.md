# Sui Examples

Complete examples for signing Sui transactions with Turnkey using `signRawPayload`.

Sui uses Ed25519 signatures and blake2b hashing. There is no dedicated Turnkey SDK signer for Sui, so you sign raw payloads directly.

## Prerequisites

```bash
npm install @turnkey/sdk-server @mysten/sui @noble/hashes
```

## Transfer SUI

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519PublicKey } from "@mysten/sui/keypairs/ed25519";
import { messageWithIntent } from "@mysten/sui/cryptography";
import { blake2b } from "@noble/hashes/blake2b";
import { bytesToHex } from "@noble/hashes/utils";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

// Your Sui address and public key (from Turnkey wallet)
const suiAddress = process.env.SUI_ADDRESS!;
const suiPublicKeyHex = process.env.SUI_PUBLIC_KEY!;

const publicKey = new Ed25519PublicKey(Buffer.from(suiPublicKeyHex, "hex"));
const provider = new SuiClient({ url: getFullnodeUrl("testnet") });

// Fetch SUI coins for gas
const coins = await provider.getCoins({ owner: suiAddress, coinType: "0x2::sui::SUI" });
if (!coins.data.length) throw new Error("No SUI coins found");

// Build the transaction
const tx = new Transaction();
tx.setSender(suiAddress);
tx.setGasPrice(await provider.getReferenceGasPrice());
tx.setGasBudget(5_000_000n);
tx.setGasPayment([{
  objectId: coins.data[0].coinObjectId,
  version: coins.data[0].version,
  digest: coins.data[0].digest,
}]);

const coin = tx.splitCoins(tx.gas, [tx.pure.u64(1_000_000n)]); // 0.001 SUI
tx.transferObjects([coin], tx.pure.address("RECIPIENT_SUI_ADDRESS"));

const txBytes = await tx.build();

// Hash with blake2b (Sui-specific)
const intentMsg = messageWithIntent("TransactionData", txBytes);
const digest = blake2b(intentMsg, { dkLen: 32 });

// Sign with Turnkey
const { r, s } = await turnkey.apiClient().signRawPayload({
  signWith: suiAddress,
  payload: bytesToHex(digest),
  encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
  hashFunction: "HASH_FUNCTION_NOT_APPLICABLE",
});

// Serialize the signature (ED25519 flag + signature + public key)
const signature = Buffer.from(r + s, "hex");
const scheme = new Uint8Array([0x00]); // ED25519
const pubKeyBytes = publicKey.toRawBytes();
const serialized = new Uint8Array(scheme.length + signature.length + pubKeyBytes.length);
serialized.set(scheme, 0);
serialized.set(signature, scheme.length);
serialized.set(pubKeyBytes, scheme.length + signature.length);
const serializedSignature = Buffer.from(serialized).toString("base64");

// Execute
const result = await provider.executeTransactionBlock({
  transactionBlock: Buffer.from(txBytes).toString("base64"),
  signature: serializedSignature,
  requestType: "WaitForEffectsCert",
  options: { showEffects: true },
});

console.log("Transaction digest:", result.digest);
```
