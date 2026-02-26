# Solana Usage Examples

Full setup is in the main SKILL.md. These examples assume `signer`, `connection`, `solanaAddress`, and `senderPublicKey` are already initialized.

## Send SOL

```typescript
async function sendSol(to: string, amountSol: number) {
  const balance = await connection.getBalance(senderPublicKey);
  console.log("Sender:", solanaAddress);
  console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL");

  const { blockhash } = await connection.getLatestBlockhash();

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

  await connection.confirmTransaction(signature, "confirmed");
  console.log("Confirmed:", signature);
  return signature;
}

sendSol("RecipientBase58Address", 0.001).catch(console.error);
```

## Batch sign multiple transactions

```typescript
const transactions = await Promise.all(
  recipients.map(async (recipient) => {
    const { blockhash } = await connection.getLatestBlockhash();
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
  })
);

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
  signatures.map((sig) => connection.confirmTransaction(sig, "confirmed"))
);
console.log("All confirmed:", signatures);
```

## Sign a message

```typescript
const message = new TextEncoder().encode("Hello from Turnkey agent");
const signedMessage = await signer.signMessage(message, solanaAddress);
console.log("Signed message bytes:", signedMessage);
```

## Versioned transactions

```typescript
import {
  VersionedTransaction,
  TransactionMessage,
} from "@solana/web3.js";

const { blockhash } = await connection.getLatestBlockhash();

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
await connection.confirmTransaction(signature, "confirmed");
```
