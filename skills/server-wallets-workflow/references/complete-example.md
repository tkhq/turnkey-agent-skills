# Complete Server Wallet Examples

## Example 1: EVM Payment Service (viem)

A complete Node.js service that creates a wallet, sends ETH payments, and enforces spending limits.

### Environment Variables

```env
# .env.local
API_PUBLIC_KEY=<starts-with-02-or-03>
API_PRIVATE_KEY=<your-api-private-key>
ORGANIZATION_ID=<your-org-id>
BASE_URL=https://api.turnkey.com
SIGN_WITH=<eth-address-from-wallet>
INFURA_KEY=<your-infura-key>
```

### Dependencies

```bash
npm install @turnkey/sdk-server @turnkey/viem viem dotenv
```

### Full Implementation

```typescript
// payment-service.ts
import { Turnkey } from "@turnkey/sdk-server";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from "viem";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Step 1: Initialize Turnkey client
const turnkey = new Turnkey({
  apiBaseUrl: process.env.BASE_URL || "https://api.turnkey.com",
  apiPublicKey: process.env.API_PUBLIC_KEY!,
  apiPrivateKey: process.env.API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.ORGANIZATION_ID!,
});

const client = turnkey.apiClient();

// Step 2: Set up wallet (create if needed)
async function ensureWallet(): Promise<string> {
  const { wallets } = await client.getWallets();

  if (wallets.length > 0) {
    const accounts = wallets[0].accounts;
    const ethAccount = accounts.find(
      (a: any) => a.addressFormat === "ADDRESS_FORMAT_ETHEREUM"
    );
    if (ethAccount) {
      console.log("Using existing wallet:", ethAccount.address);
      return ethAccount.address;
    }
  }

  // Create a new wallet with an ETH account
  const wallet = await client.createWallet({
    walletName: "payment-wallet",
    accounts: [
      {
        curve: "CURVE_SECP256K1",
        pathFormat: "PATH_FORMAT_BIP32",
        path: "m/44'/60'/0'/0/0",
        addressFormat: "ADDRESS_FORMAT_ETHEREUM",
      },
    ],
  });

  console.log("Created wallet:", wallet.walletId);
  console.log("ETH address:", wallet.addresses[0]);
  return wallet.addresses[0]!;
}

// Step 3: Set up policies
async function setupPolicies(serviceUserId: string) {
  const { policies } = await client.getPolicies();

  // Skip if policies already exist
  if (policies.length > 0) {
    console.log("Policies already configured, skipping setup.");
    return;
  }

  // Deny transfers over 0.1 ETH
  await client.createPolicy({
    policyName: "cap-transfer-value",
    effect: "EFFECT_DENY",
    condition: "eth.tx.value > 100000000000000000", // 0.1 ETH in wei
    notes: "Safety: block any single transfer over 0.1 ETH",
  });

  console.log("Policies configured.");
}

// Step 4: Send a payment
async function sendPayment(to: string, ethAmount: string) {
  const signWith = process.env.SIGN_WITH!;

  const account = await createAccount({
    client: turnkey.apiClient(),
    organizationId: process.env.ORGANIZATION_ID!,
    signWith,
  });

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(`https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`),
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(`https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`),
  });

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Balance: ${formatEther(balance)} ETH`);

  // Send transaction
  const hash = await walletClient.sendTransaction({
    to: to as `0x${string}`,
    value: parseEther(ethAmount),
  });

  console.log(`Transaction sent: ${hash}`);

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Confirmed in block ${receipt.blockNumber}`);

  return hash;
}

// Main
async function main() {
  const address = await ensureWallet();
  process.env.SIGN_WITH = address;

  // Get current user for policy setup
  const whoami = await client.getWhoami();
  await setupPolicies(whoami.userId);

  // Send a payment
  await sendPayment("0xRECIPIENT_ADDRESS", "0.01");
}

main().catch(console.error);
```

## Example 2: Multi-Chain Sweeper (ethSendTransaction + solSendTransaction)

Sweep funds from multiple addresses to a single destination using sponsored transactions.

```typescript
// sweeper.ts
import { Turnkey } from "@turnkey/sdk-server";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const turnkey = new Turnkey({
  apiBaseUrl: process.env.BASE_URL || "https://api.turnkey.com",
  apiPublicKey: process.env.API_PUBLIC_KEY!,
  apiPrivateKey: process.env.API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.ORGANIZATION_ID!,
});

const client = turnkey.apiClient();

// Poll for transaction completion
async function waitForTransaction(statusId: string): Promise<string> {
  const timeout = 60_000;
  const interval = 1_000;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const resp = await client.getSendTransactionStatus({
      sendTransactionStatusId: statusId,
    });

    if (resp.txStatus === "COMPLETED" || resp.txStatus === "INCLUDED") {
      return resp.eth?.txHash || resp.solana?.txSignature || "confirmed";
    }
    if (resp.txStatus === "FAILED" || resp.txStatus === "CANCELLED") {
      throw new Error(`Transaction failed: ${resp.txError || resp.txStatus}`);
    }

    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error("Transaction polling timed out");
}

// Sweep ETH with gas sponsorship
async function sweepEth(fromAddress: string, toAddress: string, valueWei: string) {
  // Get nonces
  const { gasStationNonce } = await client.getNonces({
    address: fromAddress,
    caip2: "eip155:11155111", // Sepolia
    gasStationNonce: true,
  });

  const { sendTransactionStatusId } = await client.ethSendTransaction({
    from: fromAddress,
    to: toAddress,
    caip2: "eip155:11155111",
    sponsor: true,
    gasStationNonce,
    value: valueWei,
  });

  const txHash = await waitForTransaction(sendTransactionStatusId);
  console.log(`ETH sweep: ${fromAddress} -> ${toAddress}, tx: ${txHash}`);
}

// Sweep SOL with gas sponsorship
async function sweepSol(fromAddress: string, toAddress: string, lamports: string) {
  // Build a Solana transfer instruction as hex
  // (In practice, use @solana/web3.js to construct this)
  const { sendTransactionStatusId } = await client.solSendTransaction({
    signWith: fromAddress,
    unsignedTransaction: "...", // hex-encoded Solana transaction
    caip2: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
    sponsor: true,
  });

  const txSig = await waitForTransaction(sendTransactionStatusId);
  console.log(`SOL sweep: ${fromAddress} -> ${toAddress}, sig: ${txSig}`);
}

async function main() {
  const destination = process.env.DESTINATION_ADDRESS!;

  // Get all wallet accounts
  const { wallets } = await client.getWallets();
  for (const wallet of wallets) {
    for (const account of wallet.accounts) {
      if (account.addressFormat === "ADDRESS_FORMAT_ETHEREUM") {
        await sweepEth(account.address, destination, "0");
      }
    }
  }
}

main().catch(console.error);
```

## Example 3: Rebalancer with Multi-Party Approval

Set up a rebalancer with role-based access and multi-party approval for large transfers.

```typescript
// rebalancer-setup.ts
import { Turnkey } from "@turnkey/sdk-server";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const turnkey = new Turnkey({
  apiBaseUrl: process.env.BASE_URL || "https://api.turnkey.com",
  apiPublicKey: process.env.API_PUBLIC_KEY!,
  apiPrivateKey: process.env.API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.ORGANIZATION_ID!,
});

const client = turnkey.apiClient();

async function setup() {
  // 1. Create user tags for roles
  const adminTag = await client.createUserTag({ tagName: "Admin" });
  const operatorTag = await client.createUserTag({ tagName: "Operator" });

  // 2. Create API-only users for each service
  await client.createApiOnlyUsers({
    apiOnlyUsers: [
      {
        userName: "rebalancer-service",
        userTags: [operatorTag.tagId],
        apiKeys: [{
          apiKeyName: "rebalancer-key",
          publicKey: process.env.REBALANCER_PUBLIC_KEY!,
        }],
      },
    ],
  });

  // 3. Create wallets for different purposes
  const hotWallet = await client.createWallet({
    walletName: "hot-wallet",
    accounts: [
      { curve: "CURVE_SECP256K1", pathFormat: "PATH_FORMAT_BIP32",
        path: "m/44'/60'/0'/0/0", addressFormat: "ADDRESS_FORMAT_ETHEREUM" },
    ],
  });

  const coldWallet = await client.createWallet({
    walletName: "cold-wallet",
    accounts: [
      { curve: "CURVE_SECP256K1", pathFormat: "PATH_FORMAT_BIP32",
        path: "m/44'/60'/0'/0/0", addressFormat: "ADDRESS_FORMAT_ETHEREUM" },
    ],
  });

  console.log("Hot wallet:", hotWallet.addresses[0]);
  console.log("Cold wallet:", coldWallet.addresses[0]);

  // 4. Policies

  // Admins can do everything
  await client.createPolicy({
    policyName: "admin-full-access",
    effect: "EFFECT_ALLOW",
    consensus: `approvers.any(user, user.tags.contains('${adminTag.tagId}'))`,
    condition: "true",
  });

  // Operators can sign small transfers (under 0.5 ETH)
  await client.createPolicy({
    policyName: "operator-small-transfers",
    effect: "EFFECT_ALLOW",
    consensus: `approvers.any(user, user.tags.contains('${operatorTag.tagId}'))`,
    condition: "eth.tx.value <= 500000000000000000",
  });

  // Large transfers need 2 admins
  await client.createPolicy({
    policyName: "large-transfer-multisig",
    effect: "EFFECT_ALLOW",
    consensus: `approvers.filter(user, user.tags.contains('${adminTag.tagId}')).count() >= 2`,
    condition: "eth.tx.value > 500000000000000000",
  });

  console.log("Rebalancer setup complete.");
}

setup().catch(console.error);
```

## Example 4: ERC-20 Token Transfers

```typescript
import { createAccount } from "@turnkey/viem";
import { createWalletClient, http, parseUnits } from "viem";
import { sepolia } from "viem/chains";

const account = await createAccount({
  client: turnkey.apiClient(),
  organizationId: process.env.ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
});

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(`https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`),
});

// Transfer USDC (6 decimals)
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const hash = await walletClient.writeContract({
  address: USDC,
  abi: [{
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  }],
  functionName: "transfer",
  args: ["0xRECIPIENT", parseUnits("100", 6)], // 100 USDC
});
```

## Checklist Before Going to Production

- [ ] Switch RPC endpoints and chain IDs from testnet to mainnet
- [ ] Add DENY policies for transfers above your risk threshold
- [ ] Add address allowlist policies for known recipients
- [ ] Configure multi-party approval for high-value operations
- [ ] Store API keys securely (secrets manager, not .env in production)
- [ ] Set up monitoring for transaction failures and consensus-needed events
- [ ] Test policy enforcement: verify that blocked transactions are actually denied
- [ ] Review root quorum configuration (remove unnecessary root users)
