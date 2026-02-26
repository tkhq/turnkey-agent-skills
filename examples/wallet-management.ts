/**
 * Turnkey Wallet Management — Runnable Example
 *
 * Demonstrates the agent bootstrap flow:
 * 1. Initialize TurnkeyClient with API key stamper
 * 2. Check if a wallet already exists
 * 3. Create a wallet with ETH + Solana accounts if none exists
 * 4. Retrieve and display all derived addresses
 *
 * Required environment variables:
 *   API_PUBLIC_KEY    — Turnkey API key public component
 *   API_PRIVATE_KEY   — Turnkey API key private component
 *   ORGANIZATION_ID   — Turnkey organization UUID
 *
 * Run with:
 *   npx tsx examples/wallet-management.ts
 */

import { TurnkeyClient } from "@turnkey/http";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";

// ---------------------------------------------------------------------------
// Client initialization
// ---------------------------------------------------------------------------

const client = new TurnkeyClient(
  { baseUrl: "https://api.turnkey.com" },
  new ApiKeyStamper({
    apiPublicKey: process.env.API_PUBLIC_KEY!,
    apiPrivateKey: process.env.API_PRIVATE_KEY!,
  })
);

const ORGANIZATION_ID = process.env.ORGANIZATION_ID!;

// ---------------------------------------------------------------------------
// Activity polling helper
// ---------------------------------------------------------------------------

async function pollUntilComplete(activityId: string) {
  while (true) {
    const { activity } = await client.getActivity({
      organizationId: ORGANIZATION_ID,
      activityId,
    });

    switch (activity.status) {
      case "ACTIVITY_STATUS_COMPLETED":
        return activity;

      case "ACTIVITY_STATUS_FAILED":
      case "ACTIVITY_STATUS_REJECTED":
        throw new Error(
          `Activity ${activityId} ended with status: ${activity.status}`
        );

      case "ACTIVITY_STATUS_CONSENSUS_NEEDED":
        throw new Error(
          `Activity ${activityId} requires consensus approval. ` +
            `Approve it in the Turnkey console, then re-run.`
        );

      default:
        // ACTIVITY_STATUS_PENDING — keep polling
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

// ---------------------------------------------------------------------------
// Main bootstrap function
// ---------------------------------------------------------------------------

async function bootstrapWallet() {
  console.log("Organization ID:", ORGANIZATION_ID);

  // Step 1: Check for existing wallets
  const { wallets } = await client.getWallets({
    organizationId: ORGANIZATION_ID,
  });

  let walletId: string;

  if (wallets.length > 0) {
    walletId = wallets[0].walletId;
    console.log(`\nFound existing wallet: ${walletId}`);
    console.log(`Wallet name: ${wallets[0].walletName}`);
  } else {
    // Step 2: Create a new wallet with ETH and Solana accounts
    console.log("\nNo wallets found. Creating a new wallet...");

    const createResponse = await client.createWallet({
      type: "ACTIVITY_TYPE_CREATE_WALLET",
      timestampMs: String(Date.now()),
      organizationId: ORGANIZATION_ID,
      parameters: {
        walletName: "Agent Wallet",
        accounts: [
          // Ethereum / EVM
          {
            curve: "CURVE_SECP256K1",
            pathFormat: "PATH_FORMAT_BIP32",
            path: "m/44'/60'/0'/0/0",
            addressFormat: "ADDRESS_FORMAT_ETHEREUM",
          },
          // Solana
          {
            curve: "CURVE_ED25519",
            pathFormat: "PATH_FORMAT_BIP32",
            path: "m/44'/501'/0'/0'",
            addressFormat: "ADDRESS_FORMAT_SOLANA",
          },
        ],
      },
    });

    const activity = await pollUntilComplete(createResponse.activity.id);
    const result = activity.result.createWalletResult!;
    walletId = result.walletId;

    console.log(`\nWallet created: ${walletId}`);
    console.log("Initial addresses:", result.addresses);
  }

  // Step 3: Fetch all accounts for the wallet
  const { accounts } = await client.getWalletAccounts({
    organizationId: ORGANIZATION_ID,
    walletId,
  });

  console.log(`\nDerived accounts (${accounts.length} total):`);
  for (const account of accounts) {
    console.log(`  ${account.addressFormat}: ${account.address}`);
    console.log(`    path: ${account.path}`);
  }

  const ethAddress = accounts.find(
    (a) => a.addressFormat === "ADDRESS_FORMAT_ETHEREUM"
  )?.address;
  const solanaAddress = accounts.find(
    (a) => a.addressFormat === "ADDRESS_FORMAT_SOLANA"
  )?.address;

  console.log("\nSummary:");
  console.log("  Wallet ID:     ", walletId);
  console.log("  ETH address:   ", ethAddress ?? "(not derived)");
  console.log("  Solana address:", solanaAddress ?? "(not derived)");

  return { walletId, ethAddress, solanaAddress };
}

bootstrapWallet().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
