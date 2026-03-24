# Uniswap Examples

Complete examples for executing Uniswap V3 swaps with Turnkey using `@turnkey/ethers`.

Uniswap integration reuses the ethers.js signing pattern. The `TurnkeySigner` acts as a standard ethers signer for all Uniswap SDK interactions.

## Prerequisites

```bash
npm install @turnkey/sdk-server @turnkey/ethers ethers @uniswap/v3-sdk @uniswap/sdk-core
```

## Provider and Signer Setup

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

const provider = new ethers.InfuraProvider("goerli", process.env.INFURA_KEY);

const signer = new TurnkeySigner({
  client: turnkey.apiClient(),
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
}).connect(provider);

const address = await signer.getAddress();
console.log("Signer address:", address);
```

## Execute a Uniswap V3 Swap

Once the signer is set up, use it with the Uniswap V3 SDK to construct and execute trades. The signer handles all transaction signing through Turnkey.

```typescript
import { Token, CurrencyAmount, TradeType, Percent } from "@uniswap/sdk-core";
import { Pool, Route, Trade, SwapRouter } from "@uniswap/v3-sdk";

// Define tokens (example: WETH/USDC on Goerli)
const WETH = new Token(5, "0xWETH_ADDRESS", 18, "WETH");
const USDC = new Token(5, "0xUSDC_ADDRESS", 6, "USDC");

// Fetch pool data and construct trade (simplified)
// In production, fetch pool state from on-chain

// Execute the swap using the Turnkey signer
const swapParams = SwapRouter.swapCallParameters(trade, {
  slippageTolerance: new Percent(50, 10_000), // 0.5%
  deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes
  recipient: address,
});

const tx = await signer.sendTransaction({
  data: swapParams.calldata,
  to: SWAP_ROUTER_ADDRESS,
  value: swapParams.value,
  from: address,
});

console.log("Swap TX hash:", tx.hash);
```

The key pattern is that `TurnkeySigner` is a drop-in replacement for any ethers signer. Any DeFi protocol that works with ethers.js will work with Turnkey.
