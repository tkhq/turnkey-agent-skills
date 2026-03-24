# TON Examples

Complete examples for signing TON transactions with Turnkey using `signRawPayload`.

TON uses Ed25519 signatures. You construct a wallet transfer message using `@ton/ton`, hash it, sign with Turnkey, then broadcast as an external message.

## Prerequisites

```bash
npm install @turnkey/sdk-server @ton/ton @ton/core @noble/hashes
```

## Send TON

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import {
  TonClient, Address, beginCell, WalletContractV4, internal,
  storeMessageRelaxed, SendMode, external, storeMessage,
} from "@ton/ton";
import { bytesToHex } from "@noble/hashes/utils";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = new TonClient({
  endpoint: process.env.TON_RPC_URL!,
  apiKey: process.env.TON_API_KEY!,
});

const walletAddress = process.env.TON_ADDRESS!;
const walletPublicKey = process.env.TON_PUBLIC_KEY!;

// Create the wallet contract
const tonWallet = WalletContractV4.create({
  workchain: 0,
  publicKey: Buffer.from(walletPublicKey, "hex"),
});

const tonAddress = Address.parse(walletAddress);
const opened = client.open(tonWallet);
const seqno = await opened.getSeqno();

// Build the internal message
const message = internal({
  value: "0.015",
  to: "RECIPIENT_TON_ADDRESS",
  body: "Transfer body",
});

// Construct the signing message
const walletId = tonWallet.walletId;
let signingMessageBuilder = beginCell().storeUint(walletId, 32);

if (seqno === 0) {
  for (let i = 0; i < 32; i++) signingMessageBuilder.storeBit(1);
} else {
  signingMessageBuilder.storeUint(Math.floor(Date.now() / 1e3) + 60, 32);
}

signingMessageBuilder.storeUint(seqno, 32);
signingMessageBuilder.storeUint(0, 8); // Simple order
signingMessageBuilder.storeUint(SendMode.PAY_GAS_SEPARATELY, 8);
signingMessageBuilder.storeRef(beginCell().store(storeMessageRelaxed(message)));

const signingMessage = signingMessageBuilder.endCell().hash();

// Sign with Turnkey
const { r, s } = await turnkey.apiClient().signRawPayload({
  signWith: walletAddress,
  payload: bytesToHex(signingMessage),
  encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
  hashFunction: "HASH_FUNCTION_NOT_APPLICABLE",
});

const signatureBytes = Buffer.from(r + s, "hex");

// Build the signed body
const body = beginCell()
  .storeBuffer(signatureBytes)
  .storeBuilder(signingMessageBuilder)
  .endCell();

// Check if wallet needs initialization
const init = opened.init && !(await client.isContractDeployed(tonAddress))
  ? opened.init
  : null;

// Create and send external message
const ext = external({
  to: tonAddress,
  init: init ? { code: init.code, data: init.data } : null,
  body,
});

const boc = beginCell().store(storeMessage(ext)).endCell().toBoc();
await client.sendFile(boc);

console.log("Transaction sent successfully.");
```
