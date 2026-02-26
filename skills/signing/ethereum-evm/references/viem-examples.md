# viem Usage Examples

Full setup is in the main SKILL.md. These examples assume `walletClient`, `publicClient`, and `account` are already initialized.

## Send ETH

```typescript
import { parseEther } from "viem";

const hash = await walletClient.sendTransaction({
  to: "0xRecipientAddress",
  value: parseEther("0.001"),
});
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log("Confirmed in block:", receipt.blockNumber);
```

## Explicit EIP-1559 fee parameters

```typescript
import { parseEther, parseGwei } from "viem";

const hash = await walletClient.sendTransaction({
  to: "0xRecipientAddress",
  value: parseEther("0.001"),
  maxFeePerGas: parseGwei("20"),
  maxPriorityFeePerGas: parseGwei("1"),
});
```

## Sign a message (EIP-191)

```typescript
const signature = await walletClient.signMessage({
  account,
  message: "Hello from Turnkey agent",
});
```

## Sign EIP-712 typed data

```typescript
import { parseUnits } from "viem";

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
import { parseAbi } from "viem";

const hash = await walletClient.writeContract({
  address: "0xTokenAddress",
  abi: parseAbi(["function transfer(address to, uint256 amount) returns (bool)"]),
  functionName: "transfer",
  args: ["0xRecipient", parseUnits("10", 6)],
});
```

## Connect to a different chain

```typescript
import { base, arbitrum } from "viem/chains";

// Same account, swap chain + transport
const baseWalletClient = createWalletClient({
  account,
  chain: base,
  transport: http("https://mainnet.base.org"),
});
```
