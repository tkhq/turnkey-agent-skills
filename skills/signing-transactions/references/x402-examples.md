# x402 Payment Examples

Complete examples for implementing HTTP 402 payments with Turnkey and the x402 protocol.

x402 enables pay-per-request APIs using EIP-3009 `TransferWithAuthorization` signatures. Turnkey signs the payment authorization, and a facilitator settles it on-chain.

## Prerequisites

```bash
npm install @turnkey/sdk-server @turnkey/viem viem x402
```

## Sign a Payment Authorization (Server-Side)

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, http, sha256 } from "viem";
import { baseSepolia } from "viem/chains";
import { exact } from "x402/schemes";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const account = await createAccount({
  client: turnkey.apiClient(),
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
  ethereumAddress: process.env.SIGN_WITH!,
});

const client = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(),
});

const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC

// Sign EIP-3009 TransferWithAuthorization
const nonce = sha256(crypto.getRandomValues(new Uint8Array(32)));
const payToAddress = "0xRESOURCE_WALLET_ADDRESS";
const paymentAmount = 10000n; // 0.01 USDC (6 decimals)

const signature = await client.signTypedData({
  domain: {
    name: "USDC",
    version: "2",
    chainId: baseSepolia.id,
    verifyingContract: USDC_ADDRESS as `0x${string}`,
  },
  types: {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  },
  primaryType: "TransferWithAuthorization",
  message: {
    from: process.env.SIGN_WITH! as `0x${string}`,
    to: payToAddress as `0x${string}`,
    value: paymentAmount,
    validAfter: 0n,
    validBefore: BigInt(Math.floor(Date.now() / 1000) + 300),
    nonce,
  },
});

// Encode as x402 payment header
const encodedPayment = exact.evm.encodePayment({
  scheme: "exact",
  network: "base-sepolia",
  x402Version: 1,
  payload: {
    signature,
    authorization: {
      from: process.env.SIGN_WITH!,
      to: payToAddress,
      value: paymentAmount.toString(),
      validAfter: "0",
      validBefore: String(Math.floor(Date.now() / 1000) + 300),
      nonce,
    },
  },
});

console.log("Payment header:", encodedPayment);
```

## Verify Payment (Server-Side)

```typescript
import { exact } from "x402/schemes";

const FACILITATOR_URL = "https://www.x402.org/facilitator";
const PAYMENT_REQUIREMENTS = {
  scheme: "exact",
  network: "base-sepolia",
  maxAmountRequired: "10000",
  resource: "https://your-api.com/protected-resource",
  description: "Access to premium content",
  mimeType: "application/json",
  payTo: "0xRESOURCE_WALLET_ADDRESS",
  maxTimeoutSeconds: 300,
  asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC on Base Sepolia
};

// Decode incoming payment header
const decodedPayment = exact.evm.decodePayment(paymentHeader);

// Verify with facilitator
const verifyResponse = await fetch(`${FACILITATOR_URL}/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    paymentPayload: decodedPayment,
    paymentRequirements: PAYMENT_REQUIREMENTS,
  }),
});

const { isValid, invalidReason } = await verifyResponse.json();

if (isValid) {
  // Settle the payment
  const settleResponse = await fetch(`${FACILITATOR_URL}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentPayload: decodedPayment,
      paymentRequirements: PAYMENT_REQUIREMENTS,
    }),
  });
  const { success } = await settleResponse.json();
  console.log("Payment settled:", success);
}
```
