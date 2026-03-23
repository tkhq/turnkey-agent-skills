# Solana Examples

## SPL Token Transfer

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { TurnkeySigner } from "@turnkey/solana";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction } from "@solana/spl-token";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const signer = new TurnkeySigner({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  client: turnkey.apiClient(),
});

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const fromKey = new PublicKey(process.env.SIGN_WITH!);
const toKey = new PublicKey("RECIPIENT_ADDRESS");
const mint = new PublicKey("TOKEN_MINT_ADDRESS");

const fromAta = await getAssociatedTokenAddress(mint, fromKey);
const toAta = await getAssociatedTokenAddress(mint, toKey);

const tx = new Transaction().add(
  createTransferInstruction(fromAta, toAta, fromKey, 1_000_000) // amount in smallest unit
);

tx.feePayer = fromKey;
tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

await signer.addSignature(tx, process.env.SIGN_WITH!);
const sig = await connection.sendRawTransaction(tx.serialize());
console.log("SPL transfer signature:", sig);
```

## Sign a Message

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { TurnkeySigner } from "@turnkey/solana";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const signer = new TurnkeySigner({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  client: turnkey.apiClient(),
});

const message = Buffer.from("Hello from Turnkey!");
const signature = await signer.signMessage(message, process.env.SIGN_WITH!);
console.log("Message signature:", Buffer.from(signature).toString("hex"));
```

## Batch Send SOL to Multiple Recipients

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { TurnkeySigner } from "@turnkey/solana";
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const signer = new TurnkeySigner({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  client: turnkey.apiClient(),
});

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const fromKey = new PublicKey(process.env.SIGN_WITH!);

const recipients = [
  { address: "RECIPIENT_1", amount: 0.01 },
  { address: "RECIPIENT_2", amount: 0.02 },
  { address: "RECIPIENT_3", amount: 0.005 },
];

const tx = new Transaction();
for (const r of recipients) {
  tx.add(
    SystemProgram.transfer({
      fromPubkey: fromKey,
      toPubkey: new PublicKey(r.address),
      lamports: r.amount * LAMPORTS_PER_SOL,
    })
  );
}

tx.feePayer = fromKey;
tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

await signer.addSignature(tx, process.env.SIGN_WITH!);
const sig = await connection.sendRawTransaction(tx.serialize());
console.log("Batch transfer signature:", sig);
```
