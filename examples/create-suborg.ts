/**
 * Turnkey Create Sub-Organization — Runnable Example
 *
 * Creates a sub-organization under the parent org defined by TURNKEY_ORGANIZATION_ID,
 * attaches the parent's API key to a single root user, and creates an initial wallet
 * with one Ethereum account.
 *
 * Required environment variables:
 *   TURNKEY_API_PUBLIC_KEY    — Parent org API key public component
 *   TURNKEY_API_PRIVATE_KEY   — Parent org API key private component
 *   TURNKEY_ORGANIZATION_ID   — Parent organization UUID
 *
 * Optional:
 *   TURNKEY_API_URL           — Defaults to https://api.turnkey.com.
 *                               Set to http://localhost:8081 for a local mono coordinator.
 *   SUBORG_NAME               — Defaults to "Sub-Org <timestamp>"
 *   SUBORG_USER_EMAIL         — Defaults to ""
 *   SUBORG_WALLET_NAME        — Defaults to "Default Wallet"
 *
 * Run with:
 *   npx tsx examples/create-suborg.ts
 */

import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: process.env.TURNKEY_API_URL ?? "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();
const ORGANIZATION_ID = process.env.TURNKEY_ORGANIZATION_ID!;

async function createSubOrg() {
  const subOrgName =
    process.env.SUBORG_NAME ?? `Sub-Org ${new Date().toISOString().slice(0, 19)}`;
  const userEmail = process.env.SUBORG_USER_EMAIL ?? "";
  const walletName = process.env.SUBORG_WALLET_NAME ?? "Default Wallet";

  console.log(`Parent organization:   ${ORGANIZATION_ID}`);
  console.log(`Sub-org name:          ${subOrgName}`);
  console.log(`Coordinator URL:       ${process.env.TURNKEY_API_URL ?? "https://api.turnkey.com"}`);
  console.log("\nCreating sub-organization...");

  const result = await client.createSubOrganization({
    organizationId: ORGANIZATION_ID,
    subOrganizationName: subOrgName,
    rootUsers: [
      {
        userName: "Root User",
        userEmail,
        apiKeys: [
          {
            apiKeyName: "Parent API Key",
            publicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
            curveType: "API_KEY_CURVE_P256",
          },
        ],
        authenticators: [],
        oauthProviders: [],
      },
    ],
    rootQuorumThreshold: 1,
    wallet: {
      walletName,
      accounts: [
        {
          curve: "CURVE_SECP256K1",
          pathFormat: "PATH_FORMAT_BIP32",
          path: "m/44'/60'/0'/0/0",
          addressFormat: "ADDRESS_FORMAT_ETHEREUM",
        },
      ],
    },
  });

  console.log("\nResult:");
  console.log("  Sub-Org ID:    ", result.subOrganizationId);
  console.log("  Wallet ID:     ", result.wallet?.walletId);
  console.log("  ETH Address:   ", result.wallet?.addresses?.[0]);
  console.log("  Root User ID:  ", result.rootUserIds?.[0]);

  return result;
}

createSubOrg().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
