---
name: signing-transactions
description: "Signs and broadcasts blockchain transactions using Turnkey. Supports Ethereum/EVM (viem, ethers), Bitcoin (P2WPKH, P2TR), Solana, Cosmos (CosmJS), Uniswap, Sui, TON, TRON, x402 payments, and sponsored/gasless transactions via paymaster. Use when asked to 'send ETH', 'send BTC', 'send SOL', 'sign a transaction', 'transfer tokens', 'sign a message', 'sign typed data', 'deploy a contract', 'swap on Uniswap', 'send a Cosmos transaction', 'sign on Sui', 'send TON', 'send TRX', 'pay with x402', 'use sponsored transactions', 'gasless transaction', 'sign a PSBT', 'sign with taproot', 'transfer ERC-20', 'transfer SPL tokens', 'sign EIP-712', or 'broadcast a transaction'. Do NOT use for creating wallets (use creating-wallets), managing policies (use managing-policies), or authenticating users (use authenticating-users)."
license: Apache-2.0
compatibility: "Requires Node.js and TypeScript. Install @turnkey/sdk-server plus chain-specific packages. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID, SIGN_WITH env vars."
metadata:
  version: "1.0.0"
  tags: ["signing", "transactions", "ethereum", "bitcoin", "solana", "viem", "ethers", "cosmos", "sui", "ton", "tron", "uniswap", "x402", "paymaster", "multichain"]
---

# Signing Transactions

## Quick Start

Use Turnkey to sign and broadcast transactions across multiple blockchains. The default integration is **viem** for Ethereum/EVM chains. For other chains or libraries, see the decision tree below.

## Prerequisites

```bash
npm install @turnkey/sdk-server @turnkey/viem viem
```

## Environment Variables

```env
TURNKEY_API_PUBLIC_KEY=    # required
TURNKEY_API_PRIVATE_KEY=   # required
TURNKEY_ORGANIZATION_ID=   # required
SIGN_WITH=                 # address or key ID to sign with
```

## Choosing Your Integration

| What are you building? | Chain | Package | Reference |
|---|---|---|---|
| EVM app (new project) | Ethereum, Polygon, Base, Arbitrum, Optimism | `@turnkey/viem` | This file (below) |
| EVM app (existing ethers codebase) | Same as above | `@turnkey/ethers` | [ethers-examples.md](references/ethers-examples.md) |
| Bitcoin payments | Bitcoin | `bitcoinjs-lib` + `@turnkey/sdk-server` | [bitcoin-examples.md](references/bitcoin-examples.md) |
| Solana app | Solana | `@turnkey/solana` | [solana-examples.md](references/solana-examples.md) |
| Cosmos/Celestia app | Cosmos ecosystem | `@turnkey/cosmjs` | [cosmjs-examples.md](references/cosmjs-examples.md) |
| DEX trading (Uniswap) | Ethereum | `@turnkey/ethers` + Uniswap SDK | [uniswap-examples.md](references/uniswap-examples.md) |
| Sui app | Sui | `@mysten/sui` + `@turnkey/sdk-server` | [sui-examples.md](references/sui-examples.md) |
| TON app | TON | `@ton/ton` + `@turnkey/sdk-server` | [ton-examples.md](references/ton-examples.md) |
| TRON app | TRON | `tronweb` + `@turnkey/sdk-server` | [tron-examples.md](references/tron-examples.md) |
| HTTP payments (x402) | Base (EVM) | `x402` + `@turnkey/viem` | [x402-examples.md](references/x402-examples.md) |
| Gasless EVM transactions | EVM | `@turnkey/sdk-server` (ethSendTransaction) | [paymaster-examples.md](references/paymaster-examples.md) |
| Gasless Solana transactions | Solana | `@turnkey/sdk-server` (solSendTransaction) | [solana-paymaster-examples.md](references/solana-paymaster-examples.md) |

## Common Initialization

Every chain starts with the same Turnkey client setup:

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
```

## Default: Signing with viem (Ethereum/EVM)

### Send ETH

```typescript
import { createAccount } from "@turnkey/viem";
import { createWalletClient, http, parseEther } from "viem";
import { sepolia } from "viem/chains";

const account = await createAccount({
  client: turnkey.apiClient(),
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
});

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(),
});

const hash = await walletClient.sendTransaction({
  to: "0xRECIPIENT_ADDRESS",
  value: parseEther("0.01"),
});
```

### Transfer ERC-20 Tokens

```typescript
import { parseUnits } from "viem";

const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const;

const hash = await walletClient.writeContract({
  address: USDC,
  abi: [{
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  }],
  functionName: "transfer",
  args: ["0xRECIPIENT_ADDRESS", parseUnits("10", 6)],
});
```

### Sign a Message (EIP-191)

```typescript
const signature = await walletClient.signMessage({
  message: "Hello from Turnkey!",
});
```

### Sign Typed Data (EIP-712)

```typescript
const signature = await walletClient.signTypedData({
  domain: {
    name: "MyDApp",
    version: "1",
    chainId: 11155111,
    verifyingContract: "0xCONTRACT_ADDRESS",
  },
  types: {
    Order: [
      { name: "maker", type: "address" },
      { name: "amount", type: "uint256" },
    ],
  },
  primaryType: "Order",
  message: {
    maker: account.address,
    amount: 1000000n,
  },
});
```

For more viem examples (EIP-1559, EIP-4844, consensus handling), see [references/viem-examples.md](references/viem-examples.md).

## Quick Reference: Other Chains

### ethers.js (Ethereum/EVM)

```typescript
import { TurnkeySigner } from "@turnkey/ethers";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.ankr.com/eth_sepolia");
const signer = new TurnkeySigner({
  client: turnkey.apiClient(),
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
}).connect(provider);

const tx = await signer.sendTransaction({ to: "0xRECIPIENT", value: ethers.parseEther("0.01") });
```

Full examples: [references/ethers-examples.md](references/ethers-examples.md)

### Bitcoin

For P2WPKH (SegWit), use `signTransaction` (simplest path):

```typescript
const result = await turnkey.apiClient().signTransaction({
  signWith: process.env.SIGN_WITH!,
  unsignedTransaction: psbtHex,
  type: "TRANSACTION_TYPE_BITCOIN",
});
```

For P2TR (Taproot), use `signRawPayload` with Schnorr signatures. Full examples: [references/bitcoin-examples.md](references/bitcoin-examples.md)

### Solana

```typescript
import { TurnkeySigner } from "@turnkey/solana";

const signer = new TurnkeySigner({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  client: turnkey.apiClient(),
});

// Build your transaction, then sign. Always pass the address explicitly.
await signer.addSignature(tx, process.env.SIGN_WITH!);
const sig = await connection.sendRawTransaction(tx.serialize());
```

Full examples: [references/solana-examples.md](references/solana-examples.md)

### Cosmos (CosmJS)

```typescript
import { TurnkeyDirectWallet } from "@turnkey/cosmjs";
import { SigningStargateClient } from "@cosmjs/stargate";

const wallet = await TurnkeyDirectWallet.init({
  config: { client: turnkey.apiClient(), organizationId: process.env.TURNKEY_ORGANIZATION_ID!, signWith: process.env.SIGN_WITH! },
  prefix: "celestia",
});
const signingClient = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet);
```

Full examples: [references/cosmjs-examples.md](references/cosmjs-examples.md)

### Sui, TON, TRON (signRawPayload)

These chains use `signRawPayload` directly because they lack dedicated Turnkey SDK signers. Each chain has different hashing and serialization requirements. See:
- [references/sui-examples.md](references/sui-examples.md) (blake2b, Ed25519)
- [references/ton-examples.md](references/ton-examples.md) (WalletContractV4, Ed25519)
- [references/tron-examples.md](references/tron-examples.md) (SHA256, secp256k1)

### Sponsored/Gasless Transactions (Paymaster)

Turnkey can sponsor gas fees so users pay nothing. Instead of signing locally, Turnkey constructs, signs, and broadcasts the transaction:

```typescript
// EVM (Base, Ethereum, etc.)
const { sendTransactionStatusId } = await turnkey.apiClient().ethSendTransaction({
  organizationId, from: senderAddress, to: contractAddress,
  caip2: "eip155:8453", sponsor: true, data, value: "0", gasStationNonce,
});

// Solana
const { sendTransactionStatusId } = await turnkey.apiClient().solSendTransaction({
  organizationId, unsignedTransaction, signWith: senderAddress,
  caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", sponsor: true,
});
```

Full examples: [references/paymaster-examples.md](references/paymaster-examples.md), [references/solana-paymaster-examples.md](references/solana-paymaster-examples.md)

## Signing Methods Overview

Turnkey offers several signing approaches depending on the chain and use case:

| Method | When to use | Chains |
|---|---|---|
| **SDK signers** (viem `createAccount`, ethers `TurnkeySigner`, solana `TurnkeySigner`, cosmjs `TurnkeyDirectWallet`) | High-level, handles serialization. Preferred when available. | EVM, Solana, Cosmos |
| **signRawPayload** | Low-level. You hash and serialize, Turnkey signs the raw bytes. Required when no SDK signer exists. | Bitcoin (Taproot), Sui, TON, TRON, any chain |
| **signTransaction** | Mid-level. Turnkey handles PSBT construction and signing. | Bitcoin (P2WPKH) |
| **ethSendTransaction / solSendTransaction** | Turnkey constructs, signs, and broadcasts. Supports `sponsor: true` for gasless transactions. | EVM, Solana |

## Important Gotchas

- **Solana TurnkeySigner does not store the address.** Always pass the signing address explicitly to `addSignature(tx, address)`. This is the most common Solana mistake.
- **Bitcoin address types matter.** Use `signTransaction` for P2WPKH (SegWit). Use `signRawPayload` for P2TR (Taproot) with Schnorr signatures.
- **Sui uses blake2b hashing**, not SHA256. The payload must be hashed with `blake2b(messageWithIntent("TransactionData", txBytes), { dkLen: 32 })` before signing.
- **TRON uses SHA256.** Set `hashFunction: "HASH_FUNCTION_SHA256"` in `signRawPayload`.
- **TON requires BOC construction.** Build the signing message with `WalletContractV4` and `beginCell()` before signing with `signRawPayload`.
- **Paymaster transactions are async.** After calling `ethSendTransaction` or `solSendTransaction` with `sponsor: true`, poll `getSendTransactionStatus()` until the transaction is confirmed.
- **SIGN_WITH must be a derived address** from a Turnkey wallet, not an arbitrary address. Use the `creating-wallets` skill to set up wallets first.
- **Chain-specific units:** wei (ETH), lamports (SOL), satoshis (BTC), SUN (TRX), utia (Celestia).
- **signRawPayload hash functions** vary by chain: `HASH_FUNCTION_NO_OP` (Bitcoin Taproot, pre-hashed), `HASH_FUNCTION_NOT_APPLICABLE` (Sui, TON, pre-hashed), `HASH_FUNCTION_SHA256` (TRON).

## Rules

- Set the correct chain RPC URL for your target network
- Use `SIGN_WITH` to specify which derived address signs the transaction
- Do not mix libraries (e.g., ethers + viem) in the same signing flow
- Use testnet for development, mainnet for production
- For `signRawPayload`, verify the hash function and encoding match the chain's requirements
- Always set `feePayer` and `recentBlockhash` on Solana transactions before signing

## Related Skills

- `creating-wallets` for wallet setup and address derivation
- `managing-policies` for transaction governance and spending limits
- `authenticating-users` for user management and auth flows
