# viem Examples

## Send ETH

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

console.log("TX hash:", hash);
```

## Transfer ERC-20 tokens

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, http, parseUnits } from "viem";
import { mainnet } from "viem/chains";

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
});

const walletClient = createWalletClient({
  account,
  chain: mainnet,
  transport: http(),
});

const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as const;

const hash = await walletClient.writeContract({
  address: USDC_ADDRESS,
  abi: [
    {
      name: "transfer",
      type: "function",
      inputs: [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ type: "bool" }],
    },
  ],
  functionName: "transfer",
  args: ["0xRECIPIENT_ADDRESS", parseUnits("10", 6)],
});

console.log("TX hash:", hash);
```

## Sign typed data (EIP-712)

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";

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
});

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(),
});

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

console.log("EIP-712 signature:", signature);
```

## Sign a message (EIP-191)

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";

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
});

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(),
});

const signature = await walletClient.signMessage({
  message: "Hello from Turnkey!",
});

console.log("Signature:", signature);
```
