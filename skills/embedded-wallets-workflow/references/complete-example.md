# Complete Embedded Wallet Example: Next.js App

This is a complete, file-by-file walkthrough of a Next.js app with Turnkey embedded wallets using the Auth Proxy (no backend) path. It provisions ETH + SOL wallets at signup and supports message signing and transaction sending.

## Project Structure

```
my-turnkey-app/
  .env.local
  package.json
  src/
    app/
      layout.tsx          # Root layout with TurnkeyProvider
      page.tsx            # Login page
      dashboard/
        page.tsx          # Post-auth: wallets, signing, sending
    constants.ts          # Turnkey config + sub-org params
```

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_ORGANIZATION_ID=<your-parent-org-id>
NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID=<from-turnkey-dashboard-auth-tab>
NEXT_PUBLIC_AUTH_PROXY_BASE_URL=https://authproxy.turnkey.com
NEXT_PUBLIC_BASE_URL=https://api.turnkey.com

# Optional: OAuth providers
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<from-google-cloud-console>

# Optional: RPC endpoints for transaction broadcasting
NEXT_PUBLIC_RPC_ETH=https://sepolia.infura.io/v3/<your-key>
NEXT_PUBLIC_RPC_SOL=https://api.devnet.solana.com
```

## Dependencies

```json
{
  "dependencies": {
    "@turnkey/react-wallet-kit": "latest",
    "@turnkey/sdk-types": "latest",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "viem": "^2.33.0",
    "@solana/web3.js": "^1.95.0"
  }
}
```

```bash
npm install @turnkey/react-wallet-kit @turnkey/sdk-types next react react-dom viem @solana/web3.js
```

## File: `src/constants.ts`

Centralize your Turnkey configuration. This is the single source of truth for auth methods, wallet accounts, and UI settings.

```typescript
import { CreateSubOrgParams, TurnkeyProviderConfig } from "@turnkey/react-wallet-kit";

// Wallets created for every new user at signup
const defaultWalletAccounts = [
  {
    addressFormat: "ADDRESS_FORMAT_ETHEREUM" as const,
    curve: "CURVE_SECP256K1" as const,
    pathFormat: "PATH_FORMAT_BIP32" as const,
    path: "m/44'/60'/0'/0/0",
  },
  {
    addressFormat: "ADDRESS_FORMAT_SOLANA" as const,
    curve: "CURVE_ED25519" as const,
    pathFormat: "PATH_FORMAT_BIP32" as const,
    path: "m/44'/501'/0'/0'",
  },
];

const createSuborgParams: CreateSubOrgParams = {
  customWallet: {
    walletName: "Default Wallet",
    walletAccounts: defaultWalletAccounts,
  },
};

export const turnkeyConfig: TurnkeyProviderConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_BASE_URL || "https://api.turnkey.com",
  authProxyUrl: process.env.NEXT_PUBLIC_AUTH_PROXY_BASE_URL || "https://authproxy.turnkey.com",
  authProxyConfigId: process.env.NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID!,
  organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
  auth: {
    methods: {
      emailOtpAuthEnabled: true,
      smsOtpAuthEnabled: false,
      passkeyAuthEnabled: true,
      walletAuthEnabled: false,
      googleOauthEnabled: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      appleOauthEnabled: false,
      facebookOauthEnabled: false,
    },
    oauthConfig: {
      googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    },
    createSuborgParams: {
      emailOtpAuth: createSuborgParams,
      passkeyAuth: createSuborgParams,
      oauth: createSuborgParams,
    },
    autoRefreshSession: true,
  },
};
```

## File: `src/app/layout.tsx`

Wrap the entire app with `TurnkeyProvider`. Import the stylesheet for the auth modal.

```tsx
import "@turnkey/react-wallet-kit/styles.css";
import { TurnkeyProvider } from "@turnkey/react-wallet-kit";
import { turnkeyConfig } from "@/constants";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TurnkeyProvider config={turnkeyConfig}>
          {children}
        </TurnkeyProvider>
      </body>
    </html>
  );
}
```

## File: `src/app/page.tsx`

Login page. Calls `handleLogin()` to open the auth modal. Redirects to dashboard on success.

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTurnkey, AuthState, ClientState } from "@turnkey/react-wallet-kit";

export default function LoginPage() {
  const router = useRouter();
  const { handleLogin, clientState, authState } = useTurnkey();

  useEffect(() => {
    if (authState === AuthState.Authenticated) {
      router.replace("/dashboard");
    }
  }, [authState, router]);

  if (clientState === ClientState.Loading) {
    return <div>Initializing Turnkey...</div>;
  }

  if (clientState === ClientState.Error) {
    return (
      <button onClick={() => window.location.reload()}>
        Something went wrong. Click to reload.
      </button>
    );
  }

  return (
    <main>
      <h1>Welcome</h1>
      <button onClick={() => handleLogin()}>Sign in</button>
    </main>
  );
}
```

## File: `src/app/dashboard/page.tsx`

Post-authentication dashboard. Shows wallet addresses, supports message signing and transaction sending.

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTurnkey, AuthState } from "@turnkey/react-wallet-kit";
import { serializeTransaction } from "viem";

export default function DashboardPage() {
  const router = useRouter();
  const {
    authState,
    logout,
    wallets,
    signMessage,
    signAndSendTransaction,
    createWallet,
    createWalletAccounts,
  } = useTurnkey();

  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (authState === AuthState.Unauthenticated) {
      router.replace("/");
    }
  }, [authState, router]);

  if (authState !== AuthState.Authenticated) {
    return <div>Loading...</div>;
  }

  // Flatten all accounts across all wallets
  const allAccounts = wallets?.flatMap((w) =>
    w.accounts.map((a) => ({ ...a, walletId: w.walletId, walletName: w.walletName }))
  ) ?? [];

  // Sign a message
  const handleSign = async () => {
    if (!selectedAccount) return;
    const isEvm = selectedAccount.addressFormat === "ADDRESS_FORMAT_ETHEREUM";
    const result = await signMessage({
      walletAccount: selectedAccount,
      message: "Hello from my Turnkey app!",
      addEthereumPrefix: isEvm,
    });
    console.log("Signature:", result);
  };

  // Send a transaction (EVM example)
  const handleSendEth = async () => {
    if (!selectedAccount) return;
    const txHash = await signAndSendTransaction({
      walletAccount: selectedAccount,
      transactionType: "TRANSACTION_TYPE_ETHEREUM",
      unsignedTransaction: "0x...", // your serialized transaction
      rpcUrl: process.env.NEXT_PUBLIC_RPC_ETH!,
    });
    console.log("Transaction hash:", txHash);
  };

  // Add a new chain to existing wallet
  const handleAddBitcoin = async () => {
    if (!wallets?.[0]) return;
    await createWalletAccounts({
      walletId: wallets[0].walletId,
      accounts: [{
        curve: "CURVE_SECP256K1",
        pathFormat: "PATH_FORMAT_BIP32",
        path: "m/84'/0'/0'/0/0",
        addressFormat: "ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH",
      }],
    });
  };

  return (
    <main>
      <h1>Dashboard</h1>
      <button onClick={logout}>Logout</button>

      <h2>Your Wallets</h2>
      {allAccounts.map((account) => (
        <div key={account.address}>
          <button onClick={() => setSelectedAccount(account)}>
            {account.addressFormat}: {account.address}
          </button>
        </div>
      ))}

      {selectedAccount && (
        <div>
          <h3>Selected: {selectedAccount.address}</h3>
          <button onClick={handleSign}>Sign Message</button>
          <button onClick={handleSendEth}>Send Transaction</button>
        </div>
      )}

      <button onClick={handleAddBitcoin}>Add Bitcoin to Wallet</button>
    </main>
  );
}
```

## Custom Backend Variant

If you chose the custom backend path, the main differences are:

1. **Remove** `authProxyConfigId` and `authProxyUrl` from the provider config
2. **Add** server-side environment variables:
```env
TURNKEY_API_PUBLIC_KEY=<starts-with-02-or-03>
TURNKEY_API_PRIVATE_KEY=<never-expose-to-client>
TURNKEY_ORGANIZATION_ID=<same-as-NEXT_PUBLIC_ORGANIZATION_ID>
```
3. **Create** Next.js Server Actions for auth operations. See `authenticating-users-sdk` reference files: [references/custom-backend-examples.md](../authenticating-users-sdk/references/custom-backend-examples.md)

## Delegated Access Variant

For hybrid custody where your backend can perform actions in a user's sub-org:

```typescript
// When creating the sub-org, include a delegated API key as a root user
const subOrg = await turnkeyClient.createSubOrganization({
  subOrganizationName: `user-${userId}`,
  rootUsers: [
    {
      userName: "Delegated Backend",
      apiKeys: [{
        apiKeyName: "backend-key",
        publicKey: process.env.DELEGATED_API_PUBLIC_KEY!,
        curveType: "API_KEY_CURVE_P256",
      }],
    },
    {
      userName: "End User",
      userEmail: userEmail,
      apiKeys: [],
      authenticators: [],
    },
  ],
  rootQuorumThreshold: 1,
  wallet: {
    walletName: "Default Wallet",
    accounts: [
      { curve: "CURVE_SECP256K1", pathFormat: "PATH_FORMAT_BIP32",
        path: "m/44'/60'/0'/0/0", addressFormat: "ADDRESS_FORMAT_ETHEREUM" },
    ],
  },
});

// Create a scoped policy for the delegated key
const delegatedClient = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPrivateKey: process.env.DELEGATED_API_PRIVATE_KEY!,
  apiPublicKey: process.env.DELEGATED_API_PUBLIC_KEY!,
  defaultOrganizationId: subOrg.subOrganizationId,
}).apiClient();

await delegatedClient.createPolicy({
  policyName: "Backend can only send to approved addresses",
  effect: "EFFECT_ALLOW",
  condition: `eth.tx.to in ['0xAPPROVED_ADDR_1', '0xAPPROVED_ADDR_2']`,
  consensus: `approvers.any(user, user.id == '${delegatedUserId}')`,
  notes: "Scoped delegated access for backend automation",
});

// Remove delegated key from root quorum so policies govern it
await delegatedClient.updateRootQuorum({
  threshold: 1,
  userIds: [endUserId], // Only the end user remains in root quorum
});
```

See `managing-policies-sdk` for the full policy language reference.

## Checklist Before Going to Production

- [ ] Switch RPC endpoints from testnet to mainnet
- [ ] Register your production domain in the Turnkey Dashboard (Auth Proxy requires it)
- [ ] Configure OAuth redirect URIs for production domain
- [ ] Add spending limit policies via `managing-policies-sdk`
- [ ] Enable `autoRefreshSession: true` to prevent session drops
- [ ] Test wallet import/export flows
- [ ] Verify passkeys work on all target devices (HTTPS required in production)
