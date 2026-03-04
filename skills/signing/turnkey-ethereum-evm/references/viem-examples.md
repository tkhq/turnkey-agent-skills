# viem Usage Examples

Each example below is fully self-contained — it includes all imports and setup so you can use it directly.

## Send ETH

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, createPublicClient, http, parseEther } from "viem";
import { sepolia } from "viem/chains";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

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

const hash = await walletClient.sendTransaction({
  to: "0xRecipientAddress",
  value: parseEther("0.001"),
});
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log("Confirmed in block:", receipt.blockNumber);
```

## Explicit EIP-1559 fee parameters

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, http, parseEther, parseGwei } from "viem";
import { sepolia } from "viem/chains";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const account = await createAccount({
  client,
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
});

const transport = http(
  process.env.ETHEREUM_RPC ?? "https://rpc.ankr.com/eth_sepolia"
);

const walletClient = createWalletClient({ account, chain: sepolia, transport });

const hash = await walletClient.sendTransaction({
  to: "0xRecipientAddress",
  value: parseEther("0.001"),
  maxFeePerGas: parseGwei("20"),
  maxPriorityFeePerGas: parseGwei("1"),
});
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
const client = turnkey.apiClient();

const account = await createAccount({
  client,
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
});

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(process.env.ETHEREUM_RPC ?? "https://rpc.ankr.com/eth_sepolia"),
});

const signature = await walletClient.signMessage({
  account,
  message: "Hello from Turnkey agent",
});
```

## Sign EIP-712 typed data

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, http, parseUnits } from "viem";
import { sepolia } from "viem/chains";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const account = await createAccount({
  client,
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
});

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(process.env.ETHEREUM_RPC ?? "https://rpc.ankr.com/eth_sepolia"),
});

const signature = await walletClient.signTypedData({
  account,
  domain: { name: "MyApp", version: "1", chainId: 11155111, verifyingContract: "0xContractAddress" },
  types: {
    Order: [
      { name: "buyer", type: "address" },
      { name: "amount", type: "uint256" },
    ],
  },
  primaryType: "Order",
  message: { buyer: account.address, amount: parseUnits("100", 18) },
});
```

## Write to a contract

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, http, parseAbi, parseUnits } from "viem";
import { sepolia } from "viem/chains";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const account = await createAccount({
  client,
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
});

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(process.env.ETHEREUM_RPC ?? "https://rpc.ankr.com/eth_sepolia"),
});

const hash = await walletClient.writeContract({
  address: "0xTokenAddress",
  abi: parseAbi(["function transfer(address to, uint256 amount) returns (bool)"]),
  functionName: "transfer",
  args: ["0xRecipient", parseUnits("10", 6)],
});
```

## Connect to a different chain

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, http } from "viem";
import { base, arbitrum } from "viem/chains";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const account = await createAccount({
  client,
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
});

// Same account, swap chain + transport
const baseWalletClient = createWalletClient({
  account,
  chain: base,
  transport: http("https://mainnet.base.org"),
});
```
