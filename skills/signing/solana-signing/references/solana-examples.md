# Solana Usage Examples

Each example below is fully self-contained — it includes all imports and setup so you can use it directly.

## Send SOL

```typescript
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

const client = new TurnkeyClient(
  { baseUrl: "https://api.turnkey.com" },
  new ApiKeyStamper({
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  })
);

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

async function sendSol(to: string, amountSol: number) {
  const balance = await connection.getBalance(senderPublicKey);
  console.log("Sender:", solanaAddress);
  console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL");

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: senderPublicKey,
      toPubkey: new PublicKey(to),
      lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
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
  return signature;
}

sendSol("RecipientBase58Address", 0.001).catch(console.error);
```

## Batch sign multiple transactions

```typescript
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

const client = new TurnkeyClient(
  { baseUrl: "https://api.turnkey.com" },
  new ApiKeyStamper({
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  })
);

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

// signAllTransactions returns an array of signed transactions
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

## Sign a message

```typescript
import { TurnkeyClient } from "@turnkey/http";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { TurnkeySigner } from "@turnkey/solana";

const client = new TurnkeyClient(
  { baseUrl: "https://api.turnkey.com" },
  new ApiKeyStamper({
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  })
);

const signer = new TurnkeySigner({
  client,
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const solanaAddress = process.env.SIGN_WITH!;

const message = new TextEncoder().encode("Hello from Turnkey agent");
const signedMessage = await signer.signMessage(message, solanaAddress);
console.log("Signed message bytes:", signedMessage);
```

## Versioned transactions

```typescript
import { TurnkeyClient } from "@turnkey/http";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { TurnkeySigner } from "@turnkey/solana";
import {
  Connection,
  PublicKey,
  SystemProgram,
  VersionedTransaction,
  TransactionMessage,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const client = new TurnkeyClient(
  { baseUrl: "https://api.turnkey.com" },
  new ApiKeyStamper({
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  })
);

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
