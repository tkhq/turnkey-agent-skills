---
name: turnkey-ethereum-evm
version: "1.0.0"
description: 'Signs and broadcasts EVM transactions on Ethereum, Polygon, Base, Arbitrum, Optimism, and any EVM chain using Turnkey. Supports ethers.js and viem. Use when asked to "send ETH", "sign an EVM transaction", "transfer tokens", "call a smart contract", "deploy a contract", "sign a message", "sign typed data", "swap tokens", "interact with a DeFi protocol", or interact with any EVM-compatible network.'
tags: ["turnkey", "ethereum", "evm", "signing", "ethers", "viem", "polygon", "base", "arbitrum", "blockchain", "defi"]
compatibility: Requires Node.js. Choose @turnkey/ethers + ethers, or @turnkey/viem + viem. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID, SIGN_WITH env vars.
---

# Turnkey EVM Signing

## Overview

Use this skill to sign and broadcast transactions on any EVM-compatible chain (Ethereum, Polygon, Base, Arbitrum, Optimism, and others) using Turnkey.

Turnkey provides two EVM signing integrations. **Pick one based on your stack:**

| | `@turnkey/ethers` | `@turnkey/viem` |
|---|---|---|
| **Use if…** | your project already uses ethers.js, or you need compatibility with ethers-based libraries (Hardhat, wagmi v1, OpenZeppelin Defender) | your project uses viem, or you want fine-grained control over transaction types |
| **Interface** | ethers.js v6 `Signer` | viem `Account` + `WalletClient` |
| **Transaction types** | legacy, EIP-1559 | legacy, EIP-2930, EIP-1559, EIP-4844, EIP-7702 |
| **Setup** | `new TurnkeySigner(...)` | `await createAccount(...)` |

Both work with the same Turnkey wallet account and the same three environment variables. You do not need both — choose one.

## Prerequisites

Install only the package for your chosen library:

```bash
# ethers.js
npm install @turnkey/http @turnkey/api-key-stamper @turnkey/ethers ethers

# viem
npm install @turnkey/http @turnkey/api-key-stamper @turnkey/viem viem
```

## Environment Variables

```env
TURNKEY_API_PUBLIC_KEY=    # Turnkey API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # Turnkey API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Turnkey organization UUID
SIGN_WITH=                 # Ethereum address of the wallet account (0x...)
ETHEREUM_RPC=              # Optional. Defaults to Sepolia public endpoint
```

`SIGN_WITH` is the Ethereum address derived when the wallet was created. Retrieve it using `getWalletAccounts` with `addressFormat === "ADDRESS_FORMAT_ETHEREUM"` — see `skills/core/wallet-management/SKILL.md`.

---

## Option A — ethers.js

### Setup

```typescript
import { TurnkeyClient } from "@turnkey/http";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { TurnkeySigner } from "@turnkey/ethers";
import { ethers } from "ethers";

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
  signWith: process.env.SIGN_WITH!,
});

const provider = new ethers.JsonRpcProvider(
  process.env.ETHEREUM_RPC ?? "https://rpc.ankr.com/eth_sepolia"
);

const connectedSigner = signer.connect(provider);
```

For usage examples (send ETH, EIP-191 message signing, EIP-712 typed data, contract interaction, multi-chain), see `references/ethers-examples.md`.

---

## Option B — viem

### Setup

```typescript
import { TurnkeyClient } from "@turnkey/http";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const client = new TurnkeyClient(
  { baseUrl: "https://api.turnkey.com" },
  new ApiKeyStamper({
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  })
);

// createAccount is async — it fetches the address from Turnkey if not provided
const account = await createAccount({
  client,
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
});

const transport = http(
  process.env.ETHEREUM_RPC ?? "https://rpc.ankr.com/eth_sepolia"
);

const walletClient = createWalletClient({ account, chain: sepolia, transport });
const publicClient = createPublicClient({ chain: sepolia, transport });
```

For usage examples (send ETH, EIP-1559 fees, EIP-191 signing, EIP-712 typed data, contract writes, multi-chain), see `references/viem-examples.md`.

---

## Troubleshooting

**Insufficient ETH for value + gas**
Fund the address (`SIGN_WITH`). For Sepolia: [faucets.chain.link/sepolia](https://faucets.chain.link/sepolia).

**Nonce conflict** (`NONCE_EXPIRED` / `NonceTooLowError`)
Another transaction consumed the nonce. Fetch the pending nonce explicitly:
```typescript
// ethers
const nonce = await provider.getTransactionCount(address, "pending");
await connectedSigner.sendTransaction({ to, value, nonce });

// viem
const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });
await walletClient.sendTransaction({ to, value, nonce });
```

**Contract call reverted**
Simulate before sending to get the revert reason:
```typescript
// ethers
await provider.call({ to, data });

// viem
await publicClient.simulateContract({ address, abi, functionName, args });
```

**Wrong `SIGN_WITH` address**
`SIGN_WITH` must be an `ADDRESS_FORMAT_ETHEREUM` account in your Turnkey org. Confirm with `getWalletAccounts`.

**Chain mismatch (viem)**
The `chain` in `createWalletClient` must match the actual chain ID of your RPC endpoint. Use the correct chain object from `viem/chains`.

**Turnkey signing activity failure**
Both `TurnkeySigner` and `createAccount` throw with the Turnkey activity status on failure. Check the error message for the activity ID, then inspect in the Turnkey console.

**RPC endpoint unreachable**
Try a public fallback — Sepolia: `https://rpc.ankr.com/eth_sepolia`, Mainnet: `https://rpc.ankr.com/eth`.

## Related Skills

- `skills/core/wallet-management/SKILL.md` — create a wallet and get your `SIGN_WITH` address
- `skills/core/transaction-signing/SKILL.md` — understand the stamping model; raw signing for unsupported chains
- `skills/signing/solana-signing/SKILL.md` — Solana transaction signing
