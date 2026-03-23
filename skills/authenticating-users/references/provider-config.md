# TurnkeyProvider Configuration Reference

## Full Configuration Object

```tsx
import { TurnkeyProvider } from "@turnkey/react-wallet-kit";

<TurnkeyProvider
  config={{
    // Required
    organizationId: "your-org-id",

    // Auth Proxy (omit for custom backend)
    authProxyConfigId: "your-auth-proxy-config-id",
    authProxyUrl: "https://authproxy.turnkey.com",

    // Auth methods
    auth: {
      methods: {
        emailOtpAuthEnabled: true,
        phoneOtpAuthEnabled: false,
        passkeyAuthEnabled: true,
        googleAuthEnabled: true,
        appleAuthEnabled: false,
        facebookAuthEnabled: false,
        walletAuthEnabled: false,
      },
      autoRefreshSession: true,
      sessionLengthSeconds: 900, // 15 minutes

      // Sub-org customization (what gets created on first signup)
      createSuborgParams: {
        emailOtpAuth: {
          userName: "Email User",
          customWallet: {
            walletName: "Default Wallet",
            walletAccounts: [
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
        },
        // Same structure for phoneOtpAuth, oAuth, passkey, walletAuth
      },
    },

    // External wallet connections (for wallet auth)
    walletConfig: {
      features: { auth: true },
      chains: {
        ethereum: { native: true },  // MetaMask, etc.
        solana: { native: true },    // Phantom, etc.
      },
    },

    // UI customization
    theme: {
      mode: "dark", // or "light"
      primaryColor: "#4F46E5",
      borderRadius: "8px",
    },
  }}
  callbacks={{
    onAuthenticationSuccess: ({ session }) => {
      console.log("Authenticated:", session);
      // router.push("/dashboard");
    },
    onError: (error) => {
      console.error("Auth error:", error);
    },
  }}
>
  {children}
</TurnkeyProvider>
```

## Auth Method Configuration per Path

### Email OTP Only (simplest)

```tsx
auth: {
  methods: { emailOtpAuthEnabled: true },
  autoRefreshSession: true,
}
```

### Social Login (Google + Apple)

```tsx
auth: {
  methods: {
    googleAuthEnabled: true,
    appleAuthEnabled: true,
  },
  autoRefreshSession: true,
}
```

Requires `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `NEXT_PUBLIC_APPLE_CLIENT_ID` env vars. OAuth redirect URIs must be configured in your provider dashboard and the Turnkey Dashboard.

### Crypto-Native (Wallet + Passkey)

```tsx
auth: {
  methods: {
    passkeyAuthEnabled: true,
    walletAuthEnabled: true,
  },
  autoRefreshSession: true,
},
walletConfig: {
  features: { auth: true },
  chains: {
    ethereum: { native: true },
    solana: { native: true },
  },
},
```

### All Methods Enabled

```tsx
auth: {
  methods: {
    emailOtpAuthEnabled: true,
    phoneOtpAuthEnabled: true,
    passkeyAuthEnabled: true,
    googleAuthEnabled: true,
    appleAuthEnabled: true,
    facebookAuthEnabled: true,
    walletAuthEnabled: true,
  },
  autoRefreshSession: true,
},
walletConfig: {
  features: { auth: true },
  chains: {
    ethereum: { native: true },
    solana: { native: true },
  },
},
```

## Customizing Sub-Org Creation

Control what wallets and accounts get created when a new user signs up:

```tsx
createSuborgParams: {
  emailOtpAuth: {
    userName: "Email User",
    customWallet: {
      walletName: "My Wallet",
      walletAccounts: [
        // Ethereum
        { curve: "CURVE_SECP256K1", pathFormat: "PATH_FORMAT_BIP32",
          path: "m/44'/60'/0'/0/0", addressFormat: "ADDRESS_FORMAT_ETHEREUM" },
        // Solana
        { curve: "CURVE_ED25519", pathFormat: "PATH_FORMAT_BIP32",
          path: "m/44'/501'/0'/0'", addressFormat: "ADDRESS_FORMAT_SOLANA" },
        // Bitcoin (SegWit)
        { curve: "CURVE_SECP256K1", pathFormat: "PATH_FORMAT_BIP32",
          path: "m/84'/0'/0'/0/0", addressFormat: "ADDRESS_FORMAT_BITCOIN_MAINNET_P2WPKH" },
      ],
    },
  },
}
```

Each auth method (`emailOtpAuth`, `phoneOtpAuth`, `oAuth`, `passkey`, `walletAuth`) has its own `createSuborgParams` entry. They share the same structure. If omitted, the SDK uses sensible defaults (ETH + SOL accounts).

## useTurnkey Hook Reference

```tsx
const {
  // State
  authState,        // AuthState.Authenticated | Unauthenticated
  clientState,      // ClientState.Loading | Ready | Error
  session,          // { organizationId, userId, ... }
  wallets,          // Array of user's wallets

  // Auth actions
  handleLogin,      // Opens the auth modal
  logout,           // Clears session

  // Manual auth (for custom backend flows)
  createApiKeyPair, // Generate ephemeral session keypair
  storeSession,     // Store JWT after custom auth
  fetchWalletProviders,    // Detect installed wallet extensions
  buildWalletLoginRequest, // Build signed wallet auth request

  // Credential management
  addPasskey,              // Add passkey to existing account
  addEmail,                // Add email to existing account
  addPhone,                // Add phone to existing account
  addOauthProvider,        // Add OAuth provider to existing account

  // Signing
  httpClient,       // Authenticated HTTP client for Turnkey API
  signMessage,      // Sign arbitrary messages
  signAndSendTransaction, // Sign and optionally broadcast
} = useTurnkey();
```
