# SVM Delegated Access Signing Examples

Each example below is fully self-contained — it includes all imports and setup so you can use it directly. These demonstrate the backend Delegated Access signing pattern for Solana transactions.

## DA signing — swap via Jupiter (policy-scoped)

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { TurnkeySigner } from "@turnkey/solana";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const userSubOrgId = process.env.USER_SUB_ORG_ID!;
const userSolanaAddress = process.env.SIGN_WITH!;
const JUPITER_PROGRAM_ID = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

const signer = new TurnkeySigner({
  client,
  organizationId: userSubOrgId,
});

const connection = new Connection(
  process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com",
  "confirmed"
);

const userPublicKey = new PublicKey(userSolanaAddress);
const jupiterProgramKey = new PublicKey(JUPITER_PROGRAM_ID);

const swapInstruction = new TransactionInstruction({
  keys: [{ pubkey: userPublicKey, isSigner: true, isWritable: true }],
  programId: jupiterProgramKey,
  data: Buffer.from([]),
});

const { blockhash, lastValidBlockHeight } =
  await connection.getLatestBlockhash();

const tx = new Transaction().add(swapInstruction);
tx.recentBlockhash = blockhash;
tx.feePayer = userPublicKey;

const signedTx = await signer.signTransaction(tx, userSolanaAddress);
const signature = await connection.sendRawTransaction(
  (signedTx as Transaction).serialize()
);

await connection.confirmTransaction(
  { signature, blockhash, lastValidBlockHeight },
  "confirmed"
);
console.log("Jupiter swap confirmed:", signature);
```

## DA signing — gasless transaction with platform fee payer

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { TurnkeySigner } from "@turnkey/solana";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const userSubOrgId = process.env.USER_SUB_ORG_ID!;
const userSolanaAddress = process.env.SIGN_WITH!;
const PLATFORM_FEE_PAYER = process.env.PLATFORM_FEE_PAYER_ADDRESS!;

const signer = new TurnkeySigner({
  client,
  organizationId: userSubOrgId,
});

const connection = new Connection(
  process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com",
  "confirmed"
);

const userPublicKey = new PublicKey(userSolanaAddress);
const feePayerPublicKey = new PublicKey(PLATFORM_FEE_PAYER);

const instruction = new TransactionInstruction({
  keys: [{ pubkey: userPublicKey, isSigner: true, isWritable: true }],
  programId: new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"),
  data: Buffer.from([]),
});

const { blockhash, lastValidBlockHeight } =
  await connection.getLatestBlockhash();

const tx = new Transaction().add(instruction);
tx.feePayer = feePayerPublicKey;
tx.recentBlockhash = blockhash;

const signedTx = await signer.signTransaction(tx, userSolanaAddress);

const signature = await connection.sendRawTransaction(
  (signedTx as Transaction).serialize()
);
await connection.confirmTransaction(
  { signature, blockhash, lastValidBlockHeight },
  "confirmed"
);
console.log("Gasless swap confirmed:", signature);
```

## DA signing — transfer to treasury with policy validation

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

const userSubOrgId = process.env.USER_SUB_ORG_ID!;
const userSolanaAddress = process.env.SIGN_WITH!;
const TREASURY_ADDRESS = "TreasuryBase58Address";

const signer = new TurnkeySigner({
  client,
  organizationId: userSubOrgId,
});

const connection = new Connection(
  process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com",
  "confirmed"
);

const userPublicKey = new PublicKey(userSolanaAddress);

const { blockhash, lastValidBlockHeight } =
  await connection.getLatestBlockhash();

const tx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: userPublicKey,
    toPubkey: new PublicKey(TREASURY_ADDRESS),
    lamports: Math.round(0.1 * LAMPORTS_PER_SOL),
  })
);
tx.recentBlockhash = blockhash;
tx.feePayer = userPublicKey;

const signedTx = await signer.signTransaction(tx, userSolanaAddress);
const signature = await connection.sendRawTransaction(
  (signedTx as Transaction).serialize()
);

await connection.confirmTransaction(
  { signature, blockhash, lastValidBlockHeight },
  "confirmed"
);
console.log("Treasury transfer confirmed:", signature);
```
