---
name: signing-ethereum
description: "Signs and broadcasts Ethereum and EVM-compatible chain transactions using Turnkey with ethers.js or viem. Covers ETH transfers, ERC-20 tokens, contract interactions, and message signing (EIP-191, EIP-712). Use when asked to 'send ETH', 'sign an EVM transaction', 'transfer tokens', 'call a smart contract', 'deploy a contract', 'sign a message', or 'sign typed data'."
license: Apache-2.0
compatibility: "Requires Node.js. Install @turnkey/sdk-server and either @turnkey/ethers or @turnkey/viem. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID, SIGN_WITH env vars."
metadata:
  version: "1.0.0"
  tags: ["ethereum", "evm", "signing", "ethers", "viem", "transaction"]
---

# Signing Ethereum / EVM Transactions

## Quick Start

Use `@turnkey/ethers` or `@turnkey/viem` to sign and broadcast transactions on Ethereum and EVM-compatible chains (Polygon, Base, Arbitrum, Optimism, etc.).

## Prerequisites

**Option A: ethers.js**
```bash
npm install @turnkey/sdk-server @turnkey/ethers ethers
```

**Option B: viem**
```bash
npm install @turnkey/sdk-server @turnkey/viem viem
```

## Environment Variables

```env
TURNKEY_API_PUBLIC_KEY=    # required
TURNKEY_API_PRIVATE_KEY=   # required
TURNKEY_ORGANIZATION_ID=   # required
SIGN_WITH=                 # Ethereum address to sign with
```

## Choosing a library

| | ethers.js | viem |
|---|---|---|
| Best for | Familiar ethers.js users, legacy projects | New projects, TypeScript-first |
| Signing class | `TurnkeySigner` (extends `AbstractSigner`) | `createAccount` (returns viem `Account`) |
| Provider | `ethers.JsonRpcProvider` | `createWalletClient` with `http` transport |

Both integrate seamlessly with Turnkey. Pick whichever fits your existing codebase.

## Instructions

### Using ethers.js

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { TurnkeySigner } from "@turnkey/ethers";
import { ethers } from "ethers";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const provider = new ethers.JsonRpcProvider("https://rpc.ankr.com/eth_sepolia");
const signer = new TurnkeySigner({ client: turnkey.apiClient(), organizationId: process.env.TURNKEY_ORGANIZATION_ID!, signWith: process.env.SIGN_WITH! }).connect(provider);

const tx = await signer.sendTransaction({ to: "0xRECIPIENT", value: ethers.parseEther("0.01") });
console.log("TX hash:", tx.hash);
```

### Using viem

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, http, parseEther } from "viem";
import { sepolia } from "viem/chains";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const account = await createAccount({ client: turnkey.apiClient(), organizationId: process.env.TURNKEY_ORGANIZATION_ID!, signWith: process.env.SIGN_WITH! });
const walletClient = createWalletClient({ account, chain: sepolia, transport: http() });

const hash = await walletClient.sendTransaction({ to: "0xRECIPIENT", value: parseEther("0.01") });
console.log("TX hash:", hash);
```

For complete examples (ERC-20 transfers, message signing, typed data), see:
- [references/ethers-examples.md](references/ethers-examples.md)
- [references/viem-examples.md](references/viem-examples.md)

## Rules

- Always set a provider/transport with the correct chain RPC URL
- Use `SIGN_WITH` to specify which address signs (must be a derived address from a Turnkey wallet)
- Do not mix ethers and viem in the same code block

## Related Skills

- `creating-wallets` for wallet setup and address derivation
- `signing-solana` for Solana transactions
- `signing-bitcoin` for Bitcoin transactions
