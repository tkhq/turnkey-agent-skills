/**
 * Turnkey Ethereum Signing — ethers.js Example
 *
 * Sends 0.001 ETH on Sepolia using TurnkeySigner from @turnkey/ethers.
 *
 * Required environment variables:
 *   TURNKEY_API_PUBLIC_KEY    — Turnkey API key public component
 *   TURNKEY_API_PRIVATE_KEY   — Turnkey API key private component
 *   TURNKEY_ORGANIZATION_ID   — Turnkey organization UUID
 *   SIGN_WITH                 — Ethereum address of your Turnkey wallet account (0x...)
 *
 * Optional:
 *   ETHEREUM_RPC      — RPC endpoint (defaults to public Sepolia endpoint)
 *   RECIPIENT         — Recipient address (defaults to a well-known Sepolia faucet)
 *
 * Run with:
 *   npx tsx examples/ethereum-ethers.ts
 */

import { Turnkey } from "@turnkey/sdk-server";
import { TurnkeySigner } from "@turnkey/ethers";
import { ethers } from "ethers";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RECIPIENT =
  process.env.RECIPIENT ?? "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const AMOUNT_ETH = "0.001";

// ---------------------------------------------------------------------------
// Client + signer setup
// ---------------------------------------------------------------------------

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
  signWith: process.env.SIGN_WITH!, // Ethereum address, e.g. "0xAbCd..."
});

const provider = new ethers.JsonRpcProvider(
  process.env.ETHEREUM_RPC ?? "https://rpc.ankr.com/eth_sepolia"
);

const connectedSigner = signer.connect(provider);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const address = await connectedSigner.getAddress();
  const balance = await provider.getBalance(address);
  const network = await provider.getNetwork();

  console.log("Chain:   ", network.name, `(chainId: ${network.chainId})`);
  console.log("Sender:  ", address);
  console.log("Balance: ", ethers.formatEther(balance), "ETH");
  console.log("Send:    ", AMOUNT_ETH, "ETH →", RECIPIENT);

  if (balance < ethers.parseEther(AMOUNT_ETH)) {
    throw new Error(
      `Insufficient balance. Need at least ${AMOUNT_ETH} ETH. ` +
        `Fund your address at https://faucets.chain.link/sepolia`
    );
  }

  // Send transaction
  console.log("\nSending transaction...");
  const tx = await connectedSigner.sendTransaction({
    to: RECIPIENT,
    value: ethers.parseEther(AMOUNT_ETH),
  });

  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log("Confirmed in block:", receipt?.blockNumber);
  console.log(
    "Explorer:          ",
    `https://sepolia.etherscan.io/tx/${tx.hash}`
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
