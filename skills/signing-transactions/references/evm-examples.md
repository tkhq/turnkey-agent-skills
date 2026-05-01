# EVM Signing Examples

## Turnkey-managed (simplest)

Use `eth_send_transaction` when you want Turnkey to handle transaction construction, signing, broadcasting, and monitoring. Set `sponsor: true` for gasless transactions where Turnkey pays the fees.

### Send a sponsored (gasless) transaction

`POST https://api.turnkey.com/public/v1/submit/eth_send_transaction`

```json
{
  "from": "0xYOUR_SENDER_ADDRESS",
  "to": "0xRECIPIENT_ADDRESS",
  "caip2": "eip155:8453",
  "sponsor": true,
  "value": "1000000000000000",
  "data": ""
}
```

For contract calls, set `value` to `"0"` and encode the calldata in `data`:

```json
{
  "from": "0xYOUR_SENDER_ADDRESS",
  "to": "0xUSDC_CONTRACT_ADDRESS",
  "caip2": "eip155:8453",
  "sponsor": true,
  "value": "0",
  "data": "0xa9059cbb000000000000000000000000RECIPIENT_ADDRESS0000000000000000000000000000000000000000000000000000000000989680"
}
```

When `sponsor: true`, Turnkey handles gas estimation and fee parameters. Do not set `gasLimit`, `maxFeePerGas`, or `maxPriorityFeePerGas` for sponsored transactions.

### Send a non-sponsored transaction

You provide gas parameters. Use `get_nonces` to fetch the current on-chain nonce.

```json
{
  "from": "0xSENDER_ADDRESS",
  "to": "0xRECIPIENT_ADDRESS",
  "caip2": "eip155:1",
  "sponsor": false,
  "value": "1000000000000000000",
  "nonce": "5",
  "gasLimit": "21000",
  "maxFeePerGas": "30000000000",
  "maxPriorityFeePerGas": "2000000000"
}
```

### EVM request parameters

| Field | Required | Description |
|-------|----------|-------------|
| `from` | Yes | Sender wallet address |
| `to` | Yes | Recipient or contract address |
| `caip2` | Yes | Chain identifier (see table below) |
| `sponsor` | No | Set `true` for gasless. Default `false` |
| `data` | No | Hex-encoded calldata (for contract calls) |
| `value` | No | Amount in wei |
| `gasStationNonce` | No | From `get_nonces` with `gasStationNonce: true`, for replay protection with sponsored txs |
| `nonce` | No | Standard on-chain nonce (non-sponsored only) |
| `gasLimit` | No | Gas limit (non-sponsored only) |
| `maxFeePerGas` | No | EIP-1559 max fee (non-sponsored only) |
| `maxPriorityFeePerGas` | No | EIP-1559 priority fee (non-sponsored only) |

### Poll transaction status

Turnkey-managed transactions are async. Poll until confirmed or failed.

`POST https://api.turnkey.com/public/v1/query/get_send_transaction_status`

```json
{
  "organizationId": "<ORG_ID>",
  "sendTransactionStatusId": "<STATUS_ID>"
}
```

| Status | Meaning |
|--------|---------|
| `INITIALIZED` | Transaction submitted, not yet broadcast |
| `BROADCASTING` | Transaction sent to the network |
| `INCLUDED` | Transaction confirmed on-chain — extract `eth.txHash` |
| `FAILED` | Transaction failed — check `txError` and `error` fields |

Poll every 2 seconds. The `error` field contains decoded revert information for failed transactions.

### Check gas usage (sponsored transactions)

Before sending sponsored transactions, verify you're within your gas budget:

`POST https://api.turnkey.com/public/v1/query/get_gas_usage`

```json
{
  "organizationId": "<ORG_ID>"
}
```

Response: `{ "windowDurationMinutes": 1440, "windowLimitUsd": "100.00", "usageUsd": "12.34" }`

### Get nonces

`POST https://api.turnkey.com/public/v1/query/get_nonces`

```json
{
  "organizationId": "<ORG_ID>",
  "address": "0xYOUR_ADDRESS",
  "caip2": "eip155:8453"
}
```

Add `"gasStationNonce": true` to get the Turnkey gas station nonce (for sponsored replay protection). Add `"nonce": true` to get the on-chain nonce (for non-sponsored transactions).

### Supported EVM chains

| Chain | CAIP-2 |
|-------|--------|
| Ethereum Mainnet | `eip155:1` |
| Ethereum Sepolia | `eip155:11155111` |
| Base | `eip155:8453` |
| Base Sepolia | `eip155:84532` |
| Polygon | `eip155:137` |
| Polygon Amoy | `eip155:80002` |
| Arbitrum | `eip155:42161` |
| Arbitrum Sepolia | `eip155:421614` |

---

## SDK signing with ethers.js

Use `@turnkey/ethers` when you need full control over transactions — custom gas, contract interaction, message signing, or typed data. The `TurnkeySigner` wraps Turnkey into an ethers.js v6 `Signer`.

```bash
npm install @turnkey/sdk-server @turnkey/ethers ethers
```

### Setup

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

### Send ETH

```typescript
const tx = await connectedSigner.sendTransaction({
  to: "0xRecipientAddress",
  value: ethers.parseEther("0.001"),
});
const receipt = await tx.wait();
console.log("Confirmed in block:", receipt?.blockNumber);
```

### Sign a message (EIP-191)

```typescript
const signature = await connectedSigner.signMessage("Hello from Turnkey agent");
const recovered = ethers.verifyMessage("Hello from Turnkey agent", signature);
console.log("Recovered:", recovered); // should match SIGN_WITH address
```

### Sign EIP-712 typed data

```typescript
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

### Interact with a contract

```typescript
const contract = new ethers.Contract(
  "0xTokenAddress",
  ["function transfer(address to, uint256 amount) returns (bool)"],
  connectedSigner
);
const tx = await contract.transfer("0xRecipient", ethers.parseUnits("10", 6));
await tx.wait();
```

### Connect to a different EVM chain

Same `TurnkeySigner` instance, different provider — works across any EVM chain:

```typescript
const baseProvider = new ethers.JsonRpcProvider("https://mainnet.base.org");
const baseSigner = signer.connect(baseProvider);
```

---

## SDK signing with viem

Use `@turnkey/viem` when your project uses viem or you want fine-grained control over transaction types (supports legacy, EIP-2930, EIP-1559, EIP-4844, EIP-7702).

```bash
npm install @turnkey/sdk-server @turnkey/viem viem
```

### Setup

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

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

### Send ETH

```typescript
import { parseEther } from "viem";

const hash = await walletClient.sendTransaction({
  to: "0xRecipientAddress",
  value: parseEther("0.001"),
});
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log("Confirmed in block:", receipt.blockNumber);
```

### Explicit EIP-1559 fee parameters

```typescript
import { parseEther, parseGwei } from "viem";

const hash = await walletClient.sendTransaction({
  to: "0xRecipientAddress",
  value: parseEther("0.001"),
  maxFeePerGas: parseGwei("20"),
  maxPriorityFeePerGas: parseGwei("1"),
});
```

### Sign a message (EIP-191)

```typescript
const signature = await walletClient.signMessage({
  account,
  message: "Hello from Turnkey agent",
});
```

### Sign EIP-712 typed data

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

### Write to a contract

```typescript
import { parseAbi, parseUnits } from "viem";

const hash = await walletClient.writeContract({
  address: "0xTokenAddress",
  abi: parseAbi(["function transfer(address to, uint256 amount) returns (bool)"]),
  functionName: "transfer",
  args: ["0xRecipient", parseUnits("10", 6)],
});
```

### Connect to a different EVM chain

Same account, swap chain + transport:

```typescript
import { base } from "viem/chains";

const baseWalletClient = createWalletClient({
  account,
  chain: base,
  transport: http("https://mainnet.base.org"),
});
```

---

## Choosing ethers vs viem

| | ethers.js | viem |
|---|---|---|
| **Use if...** | your project uses ethers, Hardhat, or ethers-based libraries | your project uses viem, or you want EIP-4844/EIP-7702 support |
| **Interface** | ethers.js v6 `Signer` | viem `Account` + `WalletClient` |
| **Transaction types** | legacy, EIP-1559 | legacy, EIP-2930, EIP-1559, EIP-4844, EIP-7702 |
| **Setup** | `new TurnkeySigner(...)` (sync) | `await createAccount(...)` (async) |

Both work with the same Turnkey wallet account and the same environment variables. Pick one based on your stack.

## Troubleshooting

<!-- compile-skip: mixes ethers and viem snippets (distinct setups) and references `provider`, `address`, etc. that aren't bound in scope. Syntax is still checked. -->

**Insufficient ETH for value + gas**
Fund the address (`SIGN_WITH`). For Sepolia: faucets.chain.link/sepolia.

**Nonce conflict (`NONCE_EXPIRED` / `NonceTooLowError`)**
Another transaction consumed the nonce. Fetch the pending nonce:
```typescript
// ethers
const nonce = await provider.getTransactionCount(address, "pending");

// viem
const nonce = await publicClient.getTransactionCount({ address: account.address, blockTag: "pending" });
```

**Contract call reverted**
Simulate before sending:
```typescript
// ethers
await provider.call({ to, data });

// viem
await publicClient.simulateContract({ address, abi, functionName, args });
```

**Chain mismatch (viem)**
The `chain` in `createWalletClient` must match the chain ID of your RPC endpoint.
