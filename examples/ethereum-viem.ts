/**
 * Turnkey Ethereum Signing — viem Example
 *
 * Sends 0.001 ETH on Sepolia using @turnkey/viem createAccount with a viem WalletClient.
 *
 * Required environment variables:
 *   API_PUBLIC_KEY    — Turnkey API key public component
 *   API_PRIVATE_KEY   — Turnkey API key private component
 *   ORGANIZATION_ID   — Turnkey organization UUID
 *   SIGN_WITH         — Ethereum address of your Turnkey wallet account (0x...)
 *
 * Optional:
 *   ETHEREUM_RPC      — RPC endpoint (defaults to public Sepolia endpoint)
 *   RECIPIENT         — Recipient address
 *
 * Run with:
 *   npx tsx examples/ethereum-viem.ts
 */

import { TurnkeyClient } from "@turnkey/http";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { createAccount } from "@turnkey/viem";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  formatEther,
} from "viem";
import { sepolia } from "viem/chains";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RECIPIENT =
  (process.env.RECIPIENT as `0x${string}`) ??
  "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const AMOUNT_ETH = "0.001";

// ---------------------------------------------------------------------------
// Client setup
// ---------------------------------------------------------------------------

const turnkeyClient = new TurnkeyClient(
  { baseUrl: "https://api.turnkey.com" },
  new ApiKeyStamper({
    apiPublicKey: process.env.API_PUBLIC_KEY!,
    apiPrivateKey: process.env.API_PRIVATE_KEY!,
  })
);

const transport = http(
  process.env.ETHEREUM_RPC ?? "https://rpc.ankr.com/eth_sepolia"
);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Create the Turnkey-backed viem account
  const account = await createAccount({
    client: turnkeyClient,
    organizationId: process.env.ORGANIZATION_ID!,
    signWith: process.env.SIGN_WITH!, // Ethereum address
  });

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport,
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport,
  });

  const balance = await publicClient.getBalance({ address: account.address });

  console.log("Chain:   ", sepolia.name, `(chainId: ${sepolia.id})`);
  console.log("Sender:  ", account.address);
  console.log("Balance: ", formatEther(balance), "ETH");
  console.log("Send:    ", AMOUNT_ETH, "ETH →", RECIPIENT);

  if (balance < parseEther(AMOUNT_ETH)) {
    throw new Error(
      `Insufficient balance. Need at least ${AMOUNT_ETH} ETH. ` +
        `Fund your address at https://faucets.chain.link/sepolia`
    );
  }

  // Send EIP-1559 transaction
  console.log("\nSending transaction...");
  const hash = await walletClient.sendTransaction({
    to: RECIPIENT,
    value: parseEther(AMOUNT_ETH),
  });

  console.log("Transaction hash:", hash);
  console.log("Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("Confirmed in block:", receipt.blockNumber);
  console.log(
    "Explorer:          ",
    `https://sepolia.etherscan.io/tx/${hash}`
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
