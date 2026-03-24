# TRON Examples

Complete examples for signing TRON transactions with Turnkey using `signRawPayload`.

TRON uses secp256k1 (same curve as Ethereum) with SHA256 hashing. You build transactions with TronWeb, sign the raw data hex with Turnkey, then broadcast.

## Prerequisites

```bash
npm install @turnkey/sdk-server tronweb
```

## Transfer TRX

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { TronWeb } from "tronweb";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

// Initialize TronWeb without a private key (Turnkey handles signing)
const tronWeb = new TronWeb({
  fullHost: "https://nile.trongrid.io/", // Testnet
});

const senderAddress = process.env.TRON_ADDRESS!;
const recipientAddress = "RECIPIENT_TRON_ADDRESS";
const amount = 1_000_000; // 1 TRX (in SUN, 1 TRX = 1,000,000 SUN)

// Build the unsigned transaction
const unsignedTx = await tronWeb.transactionBuilder.sendTrx(
  recipientAddress,
  amount,
  senderAddress,
);

// Sign with Turnkey using SHA256
const { r, s, v } = await turnkey.apiClient().signRawPayload({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: senderAddress,
  payload: unsignedTx.raw_data_hex,
  encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
  hashFunction: "HASH_FUNCTION_SHA256",
});

// Attach signature to the transaction
const signedTx = {
  ...unsignedTx,
  signature: [r + s + v],
};

// Broadcast
const result = await tronWeb.trx.sendRawTransaction(signedTx);
console.log("Transaction ID:", result.txid);
```
