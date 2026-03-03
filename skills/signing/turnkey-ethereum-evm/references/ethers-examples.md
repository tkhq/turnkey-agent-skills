# ethers.js Usage Examples

Each example below is fully self-contained — it includes all imports and setup so you can use it directly.

## Send ETH

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

const tx = await connectedSigner.sendTransaction({
  to: "0xRecipientAddress",
  value: ethers.parseEther("0.001"),
});
const receipt = await tx.wait();
console.log("Confirmed in block:", receipt?.blockNumber);
```

## Sign a message (EIP-191)

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

const signature = await connectedSigner.signMessage("Hello from Turnkey agent");
const recovered = ethers.verifyMessage("Hello from Turnkey agent", signature);
console.log("Recovered:", recovered); // should match SIGN_WITH address
```

## Sign EIP-712 typed data

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

const signature = await connectedSigner.signTypedData(
  {
    name: "MyApp",
    version: "1",
    chainId: 11155111,
    verifyingContract: "0xContractAddress",
  },
  {
    Order: [
      { name: "buyer", type: "address" },
      { name: "amount", type: "uint256" },
    ],
  },
  {
    buyer: await connectedSigner.getAddress(),
    amount: ethers.parseUnits("100", 18),
  }
);
```

## Interact with a contract

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

const contract = new ethers.Contract(
  "0xTokenAddress",
  ["function transfer(address to, uint256 amount) returns (bool)"],
  connectedSigner
);
const tx = await contract.transfer("0xRecipient", ethers.parseUnits("10", 6));
await tx.wait();
```

## Connect to a different chain

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

const baseProvider = new ethers.JsonRpcProvider("https://mainnet.base.org");
const baseSigner = signer.connect(baseProvider);
// Same TurnkeySigner instance, different provider — works across any EVM chain
```
