# ethers.js Examples

Complete examples for signing Ethereum/EVM transactions with `@turnkey/ethers`.

## Prerequisites

```bash
npm install @turnkey/sdk-server @turnkey/ethers ethers
```

## Send ETH

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
const signer = new TurnkeySigner({
  client: turnkey.apiClient(),
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
}).connect(provider);

const tx = await signer.sendTransaction({
  to: "0xRECIPIENT_ADDRESS",
  value: ethers.parseEther("0.01"),
});

console.log("TX hash:", tx.hash);
const receipt = await tx.wait();
console.log("Confirmed in block:", receipt?.blockNumber);
```

## Transfer ERC-20 Tokens

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
const signer = new TurnkeySigner({
  client: turnkey.apiClient(),
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
}).connect(provider);

const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const erc20Abi = ["function transfer(address to, uint256 amount) returns (bool)"];
const usdc = new ethers.Contract(USDC_ADDRESS, erc20Abi, signer);

const tx = await usdc.transfer("0xRECIPIENT", ethers.parseUnits("10", 6));
console.log("TX hash:", tx.hash);
```

## Sign a Message (EIP-191)

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
const signer = new TurnkeySigner({
  client: turnkey.apiClient(),
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
}).connect(provider);

const message = "Hello from Turnkey!";
const signature = await signer.signMessage(message);
console.log("Signature:", signature);

// Verify
const recovered = ethers.verifyMessage(message, signature);
console.log("Signer address:", await signer.getAddress());
console.log("Recovered address:", recovered);
```
