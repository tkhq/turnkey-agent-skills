import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

async function bootstrapWallet() {
  // 1. Check for existing wallets
  const { wallets } = await client.getWallets({
    organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  });

  let walletId: string;

  if (wallets.length > 0) {
    walletId = wallets[0].walletId;
    console.log("Using existing wallet:", walletId);
  } else {
    // 2. Create wallet with ETH + Solana accounts.
    // @turnkey/sdk-server handles activity polling automatically.
    const createResponse = await client.createWallet({
      organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
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
    console.log("Created wallet:", walletId);
    console.log("Initial addresses:", createResponse.addresses);
  }

  // 3. Fetch all accounts for this wallet
  const { accounts } = await client.getWalletAccounts({
    organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
    walletId,
  });

  const ethAddress = accounts.find(
    (a) => a.addressFormat === "ADDRESS_FORMAT_ETHEREUM"
  )?.address;
  const solanaAddress = accounts.find(
    (a) => a.addressFormat === "ADDRESS_FORMAT_SOLANA"
  )?.address;

  console.log("ETH address:", ethAddress);
  console.log("Solana address:", solanaAddress);

  return { walletId, ethAddress, solanaAddress };
}

bootstrapWallet().catch(console.error);
