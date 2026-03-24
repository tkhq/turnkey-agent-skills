---
name: embedded-wallets-workflow
description: "End-to-end workflow for building React apps with Turnkey embedded wallets. Covers architecture decisions, authentication, wallet provisioning, transaction signing, and security hardening using the sub-organization model. Use when asked to 'build an app with embedded wallets', 'create a wallet app for users', 'integrate Turnkey into my React app', 'set up non-custodial wallets for users', 'build a crypto app with login', 'add Turnkey wallets to my app', 'build a dapp with user wallets', 'set up embedded wallets from scratch', 'full Turnkey React integration', or 'walk me through building with Turnkey embedded wallets'. Do NOT use for individual tasks like creating a single wallet (use creating-wallets-sdk), signing one transaction (use signing-transactions-sdk), adding a login page (use authenticating-users-sdk), or server-side/backend-only wallet operations (use server-wallets-workflow)."
license: Apache-2.0
compatibility: "Requires Node.js and React (Next.js recommended). Uses @turnkey/react-wallet-kit and optionally @turnkey/sdk-server."
metadata:
  author: turnkey
  version: "1.0.0"
  tags: ["workflow", "embedded-wallets", "react", "sub-organization", "end-to-end", "integration"]
---

# Embedded Wallets Workflow

Build a React app where each user gets their own isolated wallet, secured by Turnkey's sub-organization model. This workflow orchestrates four primitive skills in sequence to take you from zero to a working embedded wallet application.

## Architecture Overview

Every embedded wallet app follows this model:

```
Your React App (Next.js)
  |
  ├── TurnkeyProvider (wraps entire app)
  |     ├── Auth: email OTP, passkey, OAuth, wallet auth
  |     ├── Session: JWT in IndexedDB, auto-refresh
  |     └── Sub-org: one per user, created at signup
  |
  ├── Wallet Operations (via useTurnkey hook)
  |     ├── Wallets provisioned at signup (ETH + SOL default)
  |     ├── Add chains to existing wallets on demand
  |     └── Import/export for portability
  |
  └── Signing (via useTurnkey hook or chain-specific signers)
        ├── signMessage for off-chain signatures
        ├── signAndSendTransaction for on-chain operations
        └── Chain-specific signers (viem, ethers, solana) for advanced use
```

## First Decision: Choose Your Architecture

```
Do you need custom server-side logic (user DB, rate limiting, co-signing)?
  |
  ├── No  --> Auth Proxy (recommended, no backend needed)
  |           SDK talks directly to Turnkey's managed proxy.
  |           Packages: @turnkey/react-wallet-kit
  |
  └── Yes --> Custom Backend
                Your Next.js server proxies auth calls.
                Packages: @turnkey/react-wallet-kit + @turnkey/sdk-server
```

## Second Decision: Custody Model

```
Who controls the user's private keys?
  |
  ├── User controls keys (non-custodial, most common)
  |     Sub-org root user = the end user
  |     User authenticates and signs directly
  |
  ├── App controls keys (custodial)
  |     Sub-org root user = your backend API key
  |     Backend signs on behalf of users
  |
  └── Hybrid (delegated access)
        Both user and backend have access
        Backend gets scoped API key in user's sub-org
        Policies restrict what backend can do
```

Most apps should use **Auth Proxy + non-custodial**. This is the simplest path with the strongest security guarantees.

## Phase 1: Authentication

**Skill:** Follow `authenticating-users-sdk` for detailed implementation.

**For this workflow, use these specific settings:**

1. Install `@turnkey/react-wallet-kit`
2. Set up `TurnkeyProvider` in your root layout
3. Choose auth methods based on your audience:
   - Consumer app: email OTP + OAuth (Google, Apple)
   - Crypto-native: passkey + wallet auth
   - Broadest reach: email OTP + passkey + OAuth
4. Configure `createSuborgParams` to provision wallets at signup (see Phase 2)
5. Use `handleLogin()` from `useTurnkey()` to trigger the auth modal
6. Handle auth state with `authState` and `clientState` from the hook

**Environment variables (Auth Proxy path):**
```env
NEXT_PUBLIC_ORGANIZATION_ID=       # your parent org ID
NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID=   # from Turnkey Dashboard > AUTH
NEXT_PUBLIC_AUTH_PROXY_BASE_URL=https://authproxy.turnkey.com
NEXT_PUBLIC_BASE_URL=https://api.turnkey.com
```

**Wallet provisioning at signup** (configured in the provider, not a separate step):
```typescript
const suborgParams: CreateSubOrgParams = {
  customWallet: {
    walletName: "Default Wallet",
    walletAccounts: [
      { curve: "CURVE_SECP256K1", pathFormat: "PATH_FORMAT_BIP32",
        path: "m/44'/60'/0'/0/0", addressFormat: "ADDRESS_FORMAT_ETHEREUM" },
      { curve: "CURVE_ED25519", pathFormat: "PATH_FORMAT_BIP32",
        path: "m/44'/501'/0'/0'", addressFormat: "ADDRESS_FORMAT_SOLANA" },
    ],
  },
};

// In your TurnkeyProvider config:
auth: {
  createSuborgParams: {
    emailOtpAuth: suborgParams,
    passkeyAuth: suborgParams,
    oauth: suborgParams,
    walletAuth: suborgParams,
  },
}
```

This creates ETH + SOL wallets for every new user at signup. Adjust the accounts array for your target chains. See the chain table in `creating-wallets-sdk` for all supported chains.

## Phase 2: Wallet Management

**Skill:** Follow `creating-wallets-sdk` for detailed implementation.

**For this workflow, wallets are typically created in two ways:**

1. **At signup** (recommended): Configure `createSuborgParams` in Phase 1. The wallet is created atomically with the sub-organization. No additional code needed.

2. **On demand**: Use the `useTurnkey()` hook after authentication:
```typescript
const { createWallet, createWalletAccounts, wallets } = useTurnkey();

// Create a new wallet
const walletId = await createWallet({
  walletName: "Trading Wallet",
  accounts: ["ADDRESS_FORMAT_ETHEREUM", "ADDRESS_FORMAT_SOLANA"],
});

// Add a chain to an existing wallet
await createWalletAccounts({
  walletId: existingWallet.walletId,
  accounts: [{ curve: "CURVE_SECP256K1", pathFormat: "PATH_FORMAT_BIP32",
    path: "m/84'/0'/0'/0/0", addressFormat: "ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH" }],
});
```

**Import/export** for wallet portability:
```typescript
const { handleExportWallet, handleImportWallet } = useTurnkey();

// Export (opens secure iframe with mnemonic)
await handleExportWallet({ walletId: wallet.walletId });

// Import (opens secure iframe for seed phrase entry)
await handleImportWallet({
  defaultWalletAccounts: ["ADDRESS_FORMAT_ETHEREUM", "ADDRESS_FORMAT_SOLANA"],
});
```

## Phase 3: Transaction Signing

**Skill:** Follow `signing-transactions-sdk` for detailed implementation.

**For embedded wallets, you have two signing approaches:**

### Approach A: Built-in signing (simplest)

Use the `useTurnkey()` hook directly. Best for simple send and sign operations:

```typescript
const { signMessage, signAndSendTransaction } = useTurnkey();

// Sign a message
const sig = await signMessage({
  walletAccount: selectedAccount,
  message: "Hello from my app",
  addEthereumPrefix: true, // for EVM accounts
});

// Sign and broadcast a transaction
const txHash = await signAndSendTransaction({
  walletAccount: selectedAccount,
  transactionType: "TRANSACTION_TYPE_ETHEREUM",
  unsignedTransaction: serializedTx,
  rpcUrl: "https://sepolia.infura.io/v3/YOUR_KEY",
});
```

### Approach B: Chain-specific signers (advanced)

For complex interactions (DeFi, smart contracts, multi-step transactions), use the chain-specific signer packages. These plug into the chain's native library:

- **EVM (viem):** `@turnkey/viem` with `createAccount()` for a viem wallet client
- **EVM (ethers):** `@turnkey/ethers` with `TurnkeySigner` for an ethers signer
- **Solana:** `@turnkey/solana` with `TurnkeySigner` for signing Solana transactions
- **Cosmos:** `@turnkey/cosmjs` with `TurnkeyDirectWallet` for CosmJS

See the integration table in `signing-transactions-sdk` for all supported chains and packages.

**For server-side signing on behalf of authenticated users** (custom backend path only):

```typescript
// Server action that signs with the user's sub-org credentials
const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: userSubOrgId, // the user's sub-org
});
```

This requires a delegated access policy. See Phase 4.

## Phase 4: Security Hardening (Optional)

**Skill:** Follow `managing-policies-sdk` for detailed implementation.

**For embedded wallets, common policies include:**

| Goal | When to add |
|------|-------------|
| Spending limits per transaction | Before going to mainnet |
| Address allowlist for transfers | When restricting where users can send |
| Block specific contract interactions | When limiting DeFi exposure |
| Delegated access scoping | When backend needs to co-sign or automate |

**Delegated access pattern** (hybrid custody): If your backend needs to perform actions in a user's sub-org (automated trades, scheduled transfers), create a scoped API user:

1. Create the sub-org with both the end user and a delegated API key as root users
2. Create policies that restrict what the delegated key can do
3. Remove the delegated key from root quorum so it is governed by policies

See `managing-policies-sdk` for policy syntax and examples. See [references/complete-example.md](references/complete-example.md) for a full delegated access setup.

## Rules

- Always use the sub-organization model for embedded wallets (one sub-org per user)
- Never expose parent org API keys to the browser
- Provision default wallets at signup via `createSuborgParams`, not as a separate step
- Use Auth Proxy unless you specifically need server-side logic
- Test on testnet before deploying to mainnet
- Add spending limit policies before handling real funds

## Related Skills

- `authenticating-users-sdk` for auth method details and custom backend examples
- `creating-wallets-sdk` for chain support table and advanced wallet patterns
- `signing-transactions-sdk` for chain-specific signing and broadcasting
- `managing-policies-sdk` for policy language reference and governance patterns
- `server-wallets-workflow` for backend-only wallet operations without user authentication
