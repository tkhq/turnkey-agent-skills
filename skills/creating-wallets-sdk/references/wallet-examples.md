# Wallet Examples

## Multi-chain wallet bootstrap

Creates a wallet with Ethereum, Solana, and Bitcoin addresses in one call.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();

// Check for existing wallets first
const { wallets } = await client.getWallets();
if (wallets.length > 0) {
  console.log("Using existing wallet:", wallets[0].walletId);
  // List accounts for the existing wallet
  const { accounts } = await client.getWalletAccounts({
    walletId: wallets[0].walletId,
  });
  console.log("Accounts:", accounts);
} else {
  // Create a new multi-chain wallet
  const wallet = await client.createWallet({
    walletName: "multi-chain-wallet",
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
      {
        curve: "CURVE_SECP256K1",
        pathFormat: "PATH_FORMAT_BIP32",
        path: "m/84'/0'/0'/0/0",
        addressFormat: "ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH",
      },
    ],
    mnemonicLength: 12, // 12, 15, 18, 21, or 24 words
  });

  console.log("Wallet ID:", wallet.walletId);
  console.log("Addresses:", wallet.addresses);
}
```

## Retrieve wallet accounts

List all accounts (addresses) for an existing wallet.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();

const { wallets } = await client.getWallets();

for (const wallet of wallets) {
  const { accounts } = await client.getWalletAccounts({
    walletId: wallet.walletId,
  });

  console.log(`Wallet: ${wallet.walletName} (${wallet.walletId})`);
  for (const account of accounts) {
    console.log(`  ${account.addressFormat}: ${account.address}`);
  }
}
```

## Add addresses to an existing wallet

Derive additional chain addresses after initial wallet creation.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();
const walletId = "your-wallet-id";

// Add Cosmos and Tron addresses to an existing wallet
const newAccounts = await client.createWalletAccounts({
  walletId,
  accounts: [
    {
      curve: "CURVE_SECP256K1",
      pathFormat: "PATH_FORMAT_BIP32",
      path: "m/44'/118'/0'/0/0",
      addressFormat: "ADDRESS_FORMAT_COSMOS",
    },
    {
      curve: "CURVE_SECP256K1",
      pathFormat: "PATH_FORMAT_BIP32",
      path: "m/44'/195'/0'/0/0",
      addressFormat: "ADDRESS_FORMAT_TRON",
    },
  ],
});

console.log("New addresses:", newAccounts);
```

## Create a sub-organization with a wallet (end-user wallets)

The recommended pattern for applications where each user gets their own wallet. Each user maps to a sub-organization with isolated wallet access.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();

// Create a sub-org with a wallet for a new user
const subOrg = await client.createSubOrganization({
  subOrganizationName: `user-${userId}`,
  rootUsers: [
    {
      userName: userName,
      userEmail: userEmail,
      apiKeys: [],
      authenticators: [], // Add passkey attestation here for WebAuthn
      oauthProviders: [], // Add OAuth provider info here
    },
  ],
  rootQuorumThreshold: 1,
  wallet: {
    walletName: "Default Wallet",
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
  },
});

console.log("Sub-org ID:", subOrg.subOrganizationId);
console.log("Wallet ID:", subOrg.wallet.walletId);
console.log("Addresses:", subOrg.wallet.addresses);
```

## Wallet with enhanced mnemonic security

Create a wallet with a 24-word mnemonic for maximum security.

```typescript
const wallet = await client.createWallet({
  walletName: "high-security-wallet",
  accounts: [
    {
      curve: "CURVE_SECP256K1",
      pathFormat: "PATH_FORMAT_BIP32",
      path: "m/44'/60'/0'/0/0",
      addressFormat: "ADDRESS_FORMAT_ETHEREUM",
    },
  ],
  mnemonicLength: 24, // 256 bits of entropy
});
```

## Export a wallet mnemonic

Export the wallet's seed phrase for backup. Uses an encrypted channel so the mnemonic is never exposed to the server.

```typescript
// Step 1: Initialize export
const exportResult = await client.exportWallet({
  walletId: "your-wallet-id",
  targetPublicKey: targetPublicKey, // Encryption key from the client-side iframe
});

// The encrypted bundle is decrypted client-side in the export iframe
// hosted at export.turnkey.com, ensuring the mnemonic never touches your server.
```

## TON, XRP, and Stellar wallet creation

Create wallets for newer supported chains.

```typescript
const wallet = await client.createWallet({
  walletName: "multi-chain-extended",
  accounts: [
    // TON (The Open Network) - V4R2 format
    {
      curve: "CURVE_ED25519",
      pathFormat: "PATH_FORMAT_BIP32",
      path: "m/44'/607'/0'/0/0",
      addressFormat: "ADDRESS_FORMAT_TON_V4R2",
    },
    // XRP Ledger
    {
      curve: "CURVE_SECP256K1",
      pathFormat: "PATH_FORMAT_BIP32",
      path: "m/44'/144'/0'/0/0",
      addressFormat: "ADDRESS_FORMAT_XRP",
    },
    // Stellar (XLM)
    {
      curve: "CURVE_ED25519",
      pathFormat: "PATH_FORMAT_BIP32",
      path: "m/44'/148'/0'/0'/0",
      addressFormat: "ADDRESS_FORMAT_XLM",
    },
  ],
});
```
