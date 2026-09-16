# Solana Signing Examples

> **Migration boundary:** This chain reference remains an SDK-based construction/broadcast example. It is not a completed CLI-backed workflow. Use the root CLI for auth and supported `tk sign payload` / `tk sign transaction` calls; retain the chain SDK only where construction or external broadcast is needed. Managed sends and full conversion remain future work.


## Turnkey-managed (simplest)

Use `sol_send_transaction` when you want Turnkey to handle the fee payer, signing, and broadcasting. Unlike the EVM Turnkey-managed flow, you must still construct and serialize the unsigned transaction.

### Send a sponsored (gasless) transaction

`POST https://api.turnkey.com/public/v1/submit/sol_send_transaction`

```json
{
  "unsignedTransaction": "<BASE64_ENCODED_SERIALIZED_TX>",
  "signWith": "<SOLANA_ADDRESS>",
  "caip2": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "sponsor": true
}
```

When `sponsor: true`, Turnkey handles the fee payer and provides a recent blockhash if you omit one.

### SDK equivalent

Every Turnkey SDK client exposes this endpoint as `solSendTransaction` (same request shape as the HTTP body above):

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const { activity } = await client.solSendTransaction({
  unsignedTransaction: "<BASE64_ENCODED_SERIALIZED_TX>",
  signWith: "<SOLANA_ADDRESS>",
  caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  sponsor: true,
});

// Poll until terminal
const status = await client.getSendTransactionStatus({
  sendTransactionStatusId: activity.result.solSendTransactionResult!.sendTransactionStatusId,
});
```

Use this path (no `@turnkey/solana`, no `TurnkeySigner`) when the user wants the simplest setup or asks to avoid extra packages.

### Solana request parameters

| Field | Required | Description |
|-------|----------|-------------|
| `unsignedTransaction` | Yes | Base64-encoded serialized unsigned transaction |
| `signWith` | Yes | Solana wallet address (base58) |
| `caip2` | Yes | Chain identifier (see table below) |
| `sponsor` | No | Set `true` for gasless. Default `false` |
| `recentBlockhash` | No | For deadline control. Turnkey provides one if omitted |

### Poll transaction status

`POST https://api.turnkey.com/public/v1/query/get_send_transaction_status`

```json
{
  "organizationId": "<ORG_ID>",
  "sendTransactionStatusId": "<STATUS_ID>"
}
```

| Status | Meaning |
|--------|---------|
| `INITIALIZED` | Transaction submitted, not yet broadcast |
| `BROADCASTING` | Transaction sent to the network |
| `INCLUDED` | Transaction confirmed — extract `solana.signature` |
| `FAILED` | Transaction failed — check `error.solana` for program logs |

Poll every 2 seconds until status is `INCLUDED` or `FAILED`.

### Supported Solana chains

| Chain | CAIP-2 |
|-------|--------|
| Solana Mainnet | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` |
| Solana Devnet | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG` |
| Solana Testnet | `solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY` |

---

## SDK signing with @turnkey/solana

Use `@turnkey/solana` when you need full control — custom programs, versioned transactions, batch signing, or message signing. `TurnkeySigner` wraps Turnkey into a signer compatible with `@solana/web3.js`.

```bash
npm install @turnkey/sdk-server @turnkey/solana @solana/web3.js
```

**Important:** Unlike the EVM signers, `TurnkeySigner` from `@turnkey/solana` does **not** store the address internally. You pass the Solana address (base58) as an argument to each signing call.

### Setup

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { TurnkeySigner } from "@turnkey/solana";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const signer = new TurnkeySigner({
  client,
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

// Address is managed by the caller, not stored on the signer
const solanaAddress = process.env.SIGN_WITH!;
const senderPublicKey = new PublicKey(solanaAddress);

const connection = new Connection(
  process.env.SOLANA_RPC ?? "https://api.devnet.solana.com",
  "confirmed"
);
```

### Send SOL

Always fetch a fresh blockhash immediately before signing — Solana blockhashes expire after ~60 seconds.

```typescript
const { blockhash, lastValidBlockHeight } =
  await connection.getLatestBlockhash();

const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: senderPublicKey,
    toPubkey: new PublicKey("RecipientBase58Address"),
    lamports: Math.round(0.001 * LAMPORTS_PER_SOL),
  })
);
transaction.recentBlockhash = blockhash;
transaction.feePayer = senderPublicKey;

const signedTx = await signer.signTransaction(transaction, solanaAddress);
const signature = await connection.sendRawTransaction(
  (signedTx as Transaction).serialize()
);

await connection.confirmTransaction(
  { signature, blockhash, lastValidBlockHeight },
  "confirmed"
);
console.log("Confirmed:", signature);
```

### Batch sign multiple transactions

`signAllTransactions` signs an array of transactions in one call.

```typescript
const recipients = [
  "Recipient1Base58Address",
  "Recipient2Base58Address",
  "Recipient3Base58Address",
];

const { blockhash, lastValidBlockHeight } =
  await connection.getLatestBlockhash();

const transactions = recipients.map((recipient) => {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: senderPublicKey,
      toPubkey: new PublicKey(recipient),
      lamports: Math.round(0.001 * LAMPORTS_PER_SOL),
    })
  );
  tx.recentBlockhash = blockhash;
  tx.feePayer = senderPublicKey;
  return tx;
});

const signedTransactions = await signer.signAllTransactions(
  transactions,
  solanaAddress
);

const signatures = await Promise.all(
  signedTransactions.map((tx) =>
    connection.sendRawTransaction((tx as Transaction).serialize())
  )
);

await Promise.all(
  signatures.map((sig) =>
    connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      "confirmed"
    )
  )
);
console.log("All confirmed:", signatures);
```

### Sign a message

```typescript
const message = new TextEncoder().encode("Hello from Turnkey agent");
const signedMessage = await signer.signMessage(message, solanaAddress);
console.log("Signed message bytes:", signedMessage);
```

### Versioned transactions

```typescript
import {
  VersionedTransaction,
  TransactionMessage,
} from "@solana/web3.js";

const { blockhash, lastValidBlockHeight } =
  await connection.getLatestBlockhash();

const instructions = [
  SystemProgram.transfer({
    fromPubkey: senderPublicKey,
    toPubkey: new PublicKey("RecipientAddress"),
    lamports: Math.round(0.001 * LAMPORTS_PER_SOL),
  }),
];

const messageV0 = new TransactionMessage({
  payerKey: senderPublicKey,
  recentBlockhash: blockhash,
  instructions,
}).compileToV0Message();

const versionedTx = new VersionedTransaction(messageV0);

// signTransaction works with both Transaction and VersionedTransaction
const signedTx = await signer.signTransaction(versionedTx, solanaAddress);
const signature = await connection.sendRawTransaction(
  (signedTx as VersionedTransaction).serialize()
);
await connection.confirmTransaction(
  { signature, blockhash, lastValidBlockHeight },
  "confirmed"
);
```

## Troubleshooting

<!-- compile-skip: the log-inspection snippet references `signedTx` from an earlier continuation section that our compile harness doesn't chain. Syntax is still checked. -->

**`Blockhash not found` / blockhash expiry**
Solana blockhashes expire after ~150 slots (~60 seconds). Always fetch a fresh blockhash immediately before signing. Do not reuse blockhashes across retries.

**`Insufficient lamports`**
The account does not have enough SOL for the transfer plus transaction fee (~5000 lamports). Fund the address. On devnet: `solana airdrop 1 <address> --url devnet`

**`Signature verification failed`**
The `feePayer` or signer in the transaction does not match the key that signed. Ensure `transaction.feePayer = senderPublicKey` and that the address passed to `signTransaction` matches.

**`SendTransactionError` with program logs**
The Solana program rejected the transaction. Inspect `error.logs`:
```typescript
try {
  await connection.sendRawTransaction((signedTx as Transaction).serialize());
} catch (err: any) {
  if (err.logs) console.error("Program logs:", err.logs);
  throw err;
}
```
