# EVM Delegated Access Signing Examples

Each example below is fully self-contained — it includes all imports and setup so you can use it directly. These demonstrate the backend Delegated Access signing pattern where your server signs transactions within a user's sub-organization.

## DA signing with viem — swap on whitelisted router

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, createPublicClient, http, type Hex } from "viem";
import { arbitrum } from "viem/chains";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const userSubOrgId = process.env.USER_SUB_ORG_ID!;
const userEvmAddress = process.env.SIGN_WITH!;
const UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

const account = await createAccount({
  client,
  organizationId: userSubOrgId,
  signWith: userEvmAddress,
});

const transport = http(process.env.EVM_RPC_URL ?? "https://arb1.arbitrum.io/rpc");
const walletClient = createWalletClient({ account, chain: arbitrum, transport });
const publicClient = createPublicClient({ chain: arbitrum, transport });

const swapCalldata: Hex = "0x414bf389" as Hex;

const hash = await walletClient.sendTransaction({
  to: UNISWAP_V3_ROUTER as `0x${string}`,
  data: swapCalldata,
  value: 0n,
});

const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log("Swap confirmed in block:", receipt.blockNumber);
```

## DA signing with ethers — swap on whitelisted router

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
const client = turnkey.apiClient();

const userSubOrgId = process.env.USER_SUB_ORG_ID!;
const userEvmAddress = process.env.SIGN_WITH!;
const UNISWAP_V3_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

const signer = new TurnkeySigner({
  client,
  organizationId: userSubOrgId,
  signWith: userEvmAddress,
});

const provider = new ethers.JsonRpcProvider(
  process.env.EVM_RPC_URL ?? "https://arb1.arbitrum.io/rpc"
);
const connectedSigner = signer.connect(provider);

const swapCalldata = "0x414bf389";

const tx = await connectedSigner.sendTransaction({
  to: UNISWAP_V3_ROUTER,
  data: swapCalldata,
  value: 0,
});

console.log("Transaction hash:", tx.hash);
const receipt = await tx.wait();
console.log("Confirmed in block:", receipt?.blockNumber);
```

## DA signing with viem — multi-chain (Base + Arbitrum)

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, http, type Hex } from "viem";
import { base, arbitrum } from "viem/chains";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const userSubOrgId = process.env.USER_SUB_ORG_ID!;
const userEvmAddress = process.env.SIGN_WITH!;

const account = await createAccount({
  client,
  organizationId: userSubOrgId,
  signWith: userEvmAddress,
});

const baseClient = createWalletClient({
  account,
  chain: base,
  transport: http("https://mainnet.base.org"),
});

const arbClient = createWalletClient({
  account,
  chain: arbitrum,
  transport: http("https://arb1.arbitrum.io/rpc"),
});

const VAULT_CONTRACT = "0x1234567890abcdef1234567890abcdef12345678";
const depositSelector: Hex = "0xd0e30db0" as Hex;

const baseHash = await baseClient.sendTransaction({
  to: VAULT_CONTRACT as `0x${string}`,
  data: depositSelector,
  value: 0n,
});
console.log("Base tx:", baseHash);

const arbHash = await arbClient.sendTransaction({
  to: VAULT_CONTRACT as `0x${string}`,
  data: depositSelector,
  value: 0n,
});
console.log("Arbitrum tx:", arbHash);
```

## Policy validation — positive and negative tests with viem

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

const userSubOrgId = process.env.USER_SUB_ORG_ID!;
const userEvmAddress = process.env.SIGN_WITH!;
const WHITELISTED_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

const account = await createAccount({
  client,
  organizationId: userSubOrgId,
  signWith: userEvmAddress,
});

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(process.env.EVM_RPC_URL ?? "https://rpc.ankr.com/eth_sepolia"),
});

try {
  const hash = await walletClient.sendTransaction({
    to: WHITELISTED_ROUTER as `0x${string}`,
    data: "0x414bf389" as `0x${string}`,
    value: 0n,
  });
  console.log("PASS: Allowed transaction signed", hash);
} catch (e) {
  console.error("FAIL: Allowed transaction rejected", e);
}

try {
  const hash = await walletClient.sendTransaction({
    to: "0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF" as `0x${string}`,
    data: "0x" as `0x${string}`,
    value: 0n,
  });
  console.error("FAIL: Unauthorized transaction was signed!");
} catch (e) {
  console.log("PASS: Unauthorized transaction correctly denied");
}
```
