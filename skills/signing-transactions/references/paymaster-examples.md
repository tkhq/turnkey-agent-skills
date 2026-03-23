# Paymaster Examples (Gasless EVM Transactions)

Complete examples for sending sponsored/gasless EVM transactions using Turnkey's gas station.

With the paymaster, Turnkey constructs, signs, and broadcasts the transaction on behalf of the user. The user pays no gas fees.

## Prerequisites

```bash
npm install @turnkey/sdk-server ethers
```

## Send Sponsored ERC-20 Transfer (Base)

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { ethers } from "ethers";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const organizationId = process.env.TURNKEY_ORGANIZATION_ID!;
const senderAddress = process.env.SIGN_WITH!;
const recipientAddress = "0xRECIPIENT_ADDRESS";
const CAIP2_BASE = "eip155:8453"; // Base mainnet

// Encode the ERC-20 transfer
const ERC20_INTERFACE = new ethers.Interface([
  "function transfer(address to, uint256 amount) returns (bool)",
]);

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base
const data = ERC20_INTERFACE.encodeFunctionData("transfer", [
  recipientAddress,
  ethers.parseUnits("10", 6), // 10 USDC
]);

// Get gas station nonce
const { gasStationNonce } = await turnkey.apiClient().getNonces({
  organizationId,
  address: senderAddress,
  caip2: CAIP2_BASE,
  gasStationNonce: true,
});

if (!gasStationNonce) throw new Error("Failed to get gas station nonce");

// Send sponsored transaction
const { sendTransactionStatusId } = await turnkey.apiClient().ethSendTransaction({
  organizationId,
  from: senderAddress,
  to: USDC_ADDRESS,
  caip2: CAIP2_BASE,
  sponsor: true,
  data,
  value: "0",
  gasStationNonce,
});

// Poll for transaction status
const txHash = await pollTransactionStatus(turnkey, organizationId, sendTransactionStatusId);
console.log("TX hash:", txHash);
```

## Poll Transaction Status Helper

Paymaster transactions are async. After submitting, poll until the transaction is confirmed:

```typescript
async function pollTransactionStatus(
  turnkey: Turnkey,
  organizationId: string,
  sendTransactionStatusId: string,
  maxAttempts = 30,
  intervalMs = 2000,
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await turnkey.apiClient().getSendTransactionStatus({
      organizationId,
      sendTransactionStatusId,
    });

    if (status.eth?.txHash) {
      return status.eth.txHash;
    }

    if (status.status === "FAILED") {
      throw new Error(`Transaction failed: ${JSON.stringify(status)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Transaction status polling timed out");
}
```

## CAIP-2 Chain Identifiers

Use the correct CAIP-2 identifier for your target chain:

| Chain | CAIP-2 |
|---|---|
| Ethereum Mainnet | `eip155:1` |
| Base | `eip155:8453` |
| Polygon | `eip155:137` |
| Arbitrum | `eip155:42161` |
| Optimism | `eip155:10` |
| Sepolia (testnet) | `eip155:11155111` |
| Base Sepolia (testnet) | `eip155:84532` |
