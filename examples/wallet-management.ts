/**
 * Turnkey Wallet Management — Runnable Example
 *
 * Demonstrates the agent bootstrap flow:
 * 1. Initialize Turnkey client via @turnkey/sdk-server
 * 2. Check if a wallet already exists
 * 3. Create a wallet with ETH + Solana accounts if none exists
 * 4. Retrieve and display all derived addresses
 *
 * Required environment variables:
 *   TURNKEY_API_PUBLIC_KEY    — Turnkey API key public component
 *   TURNKEY_API_PRIVATE_KEY   — Turnkey API key private component
 *   TURNKEY_ORGANIZATION_ID   — Turnkey organization UUID
 *
 * Run with:
 *   npx tsx examples/wallet-management.ts
 */

import { Turnkey } from "@turnkey/sdk-server";

// ---------------------------------------------------------------------------
// Client initialization
// ---------------------------------------------------------------------------

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();
const ORGANIZATION_ID = process.env.TURNKEY_ORGANIZATION_ID!;

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
    // Step 2: Create a new wallet with ETH and Solana accounts.
    // @turnkey/sdk-server handles activity polling automatically.
    console.log("\nNo wallets found. Creating a new wallet...");

    const createResponse = await client.createWallet({
      organizationId: ORGANIZATION_ID,
      walletName: "Agent Wallet",
      accounts: [
        {
          curve: "CURVE_SECP256K1",
          pathFormat: "PATH_FORMAT_BIP32",
          path: "m/44'/60'/0'/0/0",
          addressFormat: "ADDRESS_FORMAT_ETHEREUM",
        },
        {
          curve: "CURVE_ED25519",
          pathFormat: "PATH_FORMAT_BIP32",
          path: "m/44'/501'/0'/0'",
          addressFormat: "ADDRESS_FORMAT_SOLANA",
        },
      ],
    });

    walletId = createResponse.walletId;

    console.log(`\nWallet created: ${walletId}`);
    console.log("Initial addresses:", createResponse.addresses);
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
