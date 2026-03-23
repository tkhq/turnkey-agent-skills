---
name: authenticating-users
description: "Implements user authentication for React apps using Turnkey's Embedded Wallet Kit (@turnkey/react-wallet-kit) with Auth Proxy or custom backend. Supports email OTP, SMS OTP, OAuth social login (Google, Apple, Facebook), passkeys/WebAuthn, and external wallet sign-in. Handles sub-organization creation, session management, and multi-method credential linking. Use when asked to 'add login', 'set up authentication', 'add email OTP', 'add Google login', 'add social login', 'implement passkey auth', 'create a signup flow', 'add wallet-based login', 'set up Turnkey auth', 'integrate Turnkey authentication', 'add SMS verification', 'connect wallet to log in', 'build a login page with Turnkey', or 'configure the auth proxy'. Do NOT use for signing transactions, sending funds, creating wallets outside of auth, or setting policies."
license: Apache-2.0
compatibility: "Requires Node.js and React. Install @turnkey/react-wallet-kit. For custom backends, also install @turnkey/sdk-server."
metadata:
  version: "2.0.0"
  tags: ["authentication", "react", "otp", "oauth", "passkey", "webauthn", "wallet-auth", "sub-organization", "embedded-wallet-kit"]
---

# Authenticating Users

## Quick Start

Use `@turnkey/react-wallet-kit` to add authentication to a React app. Wrap your app in `TurnkeyProvider`, call `handleLogin()`, and the SDK handles everything: modal UI, credential verification, sub-org creation, and session management.

## Two Architecture Paths

Choose your approach based on how much control you need:

```
Do you need custom server-side logic (rate limiting, custom user DB, co-signing)?
  |
  ├── No  → Auth Proxy (recommended)
  |         No backend needed. SDK talks to Turnkey's managed proxy.
  |         Packages: @turnkey/react-wallet-kit
  |
  └── Yes → Custom Backend
              Your server proxies auth calls with Next.js Server Actions.
              Packages: @turnkey/react-wallet-kit + @turnkey/sdk-server
```

**Auth Proxy** is the recommended path for most apps. It eliminates backend code entirely. Use a custom backend only when you need server-side user data, custom validations, or 2-of-2 signing.

To set up the Auth Proxy: go to **Turnkey Dashboard > AUTH**, toggle it ON, add your frontend domain to Allowed Origins, and copy the Config ID. For the full endpoint API and security details, see [references/auth-proxy-api.md](references/auth-proxy-api.md).

## Auth Methods

| Method | What users do | Best for |
|--------|---------------|----------|
| Email OTP | Enter email, receive code, type it in | Broadest reach, works everywhere |
| SMS OTP | Enter phone, receive code, type it in | Mobile-first apps |
| OAuth | Click "Sign in with Google/Apple/etc." | Consumer apps, familiar UX |
| Passkey | Tap Face ID / Touch ID / security key | Security-critical apps |
| Wallet Auth | Sign a message with MetaMask/Phantom | Crypto-native users |

All methods create a sub-organization per user, isolating their wallets and keys. Users can link multiple auth methods to the same account.

## Prerequisites

**Auth Proxy path (no backend):**
```bash
npm install @turnkey/react-wallet-kit
```

**Custom backend path:**
```bash
npm install @turnkey/react-wallet-kit @turnkey/sdk-server
```

## Environment Variables

**Auth Proxy (client-side only):**
```env
NEXT_PUBLIC_ORGANIZATION_ID=       # your parent org ID
NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID=   # from Turnkey Dashboard
NEXT_PUBLIC_AUTH_PROXY_BASE_URL=https://authproxy.turnkey.com
NEXT_PUBLIC_BASE_URL=https://api.turnkey.com
```

**Custom backend (add these server-side):**
```env
TURNKEY_API_PUBLIC_KEY=    # starts with 02 or 03
TURNKEY_API_PRIVATE_KEY=   # never expose to client
TURNKEY_ORGANIZATION_ID=   # same as NEXT_PUBLIC_ORGANIZATION_ID
```

**OAuth providers (if using social login):**
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=      # from Google Cloud Console
NEXT_PUBLIC_APPLE_CLIENT_ID=       # from Apple Developer
NEXT_PUBLIC_FACEBOOK_CLIENT_ID=    # from Meta Developer
```

## Instructions

### Step 1: Set up TurnkeyProvider

Wrap your app with the provider. This is the same for both architecture paths.

```tsx
// app/providers.tsx
"use client";
import { TurnkeyProvider } from "@turnkey/react-wallet-kit";
import "@turnkey/react-wallet-kit/styles";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TurnkeyProvider
      config={{
        organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
        // Auth Proxy config (omit these for custom backend)
        authProxyConfigId: process.env.NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID,
        authProxyUrl: process.env.NEXT_PUBLIC_AUTH_PROXY_BASE_URL,
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
        },
      }}
    >
      {children}
    </TurnkeyProvider>
  );
}
```

Import the provider in your root layout:

```tsx
// app/layout.tsx
import { Providers } from "./providers";
import "@turnkey/react-wallet-kit/styles";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html><body><Providers>{children}</Providers></body></html>;
}
```

### Step 2: Add the login trigger

```tsx
"use client";
import { useTurnkey, AuthState } from "@turnkey/react-wallet-kit";

export default function LoginPage() {
  const { handleLogin, authState, logout } = useTurnkey();

  if (authState === AuthState.Authenticated) {
    return <button onClick={logout}>Logout</button>;
  }

  return <button onClick={handleLogin}>Sign in</button>;
}
```

`handleLogin()` opens the SDK modal with all enabled auth methods. The modal handles the entire flow: credential input, verification, sub-org creation for new users, and session storage. No additional code needed for the Auth Proxy path.

### Step 3: Access authenticated state

After login, use the `useTurnkey` hook to access user data:

```tsx
const { authState, session, wallets, httpClient } = useTurnkey();

// session.organizationId - the user's sub-org ID
// session.userId - the authenticated user ID
// wallets - array of the user's embedded wallets
// httpClient - authenticated client for Turnkey API calls
```

### Custom Backend: Server Actions

If you need server-side control, implement these Next.js Server Actions. The frontend still uses `@turnkey/react-wallet-kit` for hooks and session management, but auth verification happens on your server.

**Email/SMS OTP flow:**
```typescript
// server/actions/auth.ts
"use server";
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

export async function sendOtp(email: string) {
  const { otpId } = await client.initOtp({
    contact: email,
    otpType: "OTP_TYPE_EMAIL",
  });
  return otpId;
}

export async function verifyAndLogin(otpId: string, otpCode: string, publicKey: string) {
  const { verificationToken } = await client.verifyOtp({ otpId, otpCode });
  // Look up or create sub-org for this user
  const { organizationIds } = await client.getVerifiedSubOrgIds({
    filterType: "EMAIL",
    filterValue: extractEmailFromToken(verificationToken),
  });
  const subOrgId = organizationIds[0] ?? await createSubOrg(email);
  // Complete login
  const session = await client.otpLogin({
    organizationId: subOrgId,
    verificationToken,
    publicKey,
  });
  return session;
}
```

For complete custom backend examples covering all auth methods, see [references/custom-backend-examples.md](references/custom-backend-examples.md).

## How Sub-Organizations Work

Every user gets their own sub-organization under your parent org:

- **Cryptographic isolation**: Parent org cannot access user private keys
- **Automatic creation**: Auth Proxy creates sub-orgs on first signup
- **Wallet provisioning**: Embedded wallets (ETH + SOL by default) are created at signup
- **Multi-method linking**: A user who signs up with Google can later add email OTP or passkeys to the same sub-org

To customize what gets created at signup (wallet accounts, user name), configure `createSuborgParams` in the provider config. See [references/provider-config.md](references/provider-config.md).

## Session Management

Sessions are JWT-based and stored client-side in IndexedDB.

- **Read-write sessions**: Created by all auth methods. Allow signing and API calls.
- **Auto-refresh**: Set `autoRefreshSession: true` in the provider config to refresh sessions before expiry.
- **Expiry**: Configurable via `sessionLengthSeconds` (default: 900 seconds / 15 minutes).
- **Logout**: Call `logout()` from the `useTurnkey` hook to clear the session.

## Linking Multiple Auth Methods

Users can add auth methods after initial signup:

```tsx
const { addPasskey, addEmail, addOauthProvider } = useTurnkey();

// Add a passkey to an existing account
await addPasskey();

// Add email to an existing account
await addEmail("user@example.com");

// Add another OAuth provider
await addOauthProvider({ providerName: "Apple", oidcToken: appleToken });
```

The user must always have at least one auth method. Removing the last method will fail.

## Important Considerations

- The `@turnkey/sdk-react` package is deprecated. Use `@turnkey/react-wallet-kit` for all new projects.
- OAuth requires configuring redirect URIs in both your OAuth provider (Google Cloud Console, etc.) and the Turnkey Dashboard.
- Passkeys require HTTPS in production. Use `rpId: "localhost"` for local development.
- Wallet auth detects installed browser extensions (MetaMask, Phantom) automatically.
- The Auth Proxy handles origin validation and CORS. Your domain must be registered in the Turnkey Dashboard.
- For OAuth, the nonce should be `sha256(clientPublicKey)` to bind the OIDC token to the session key, preventing replay attacks.

## Rules

- Never expose parent org API keys (`TURNKEY_API_PRIVATE_KEY`) to the browser
- Each user gets their own sub-organization (never share sub-orgs between users)
- Always verify credentials server-side before granting access (Auth Proxy does this automatically)
- Use `autoRefreshSession: true` to prevent session expiry during active use
- Register your domain in the Turnkey Dashboard before deploying (Auth Proxy requires it)

## Related Skills

- `creating-wallets` for adding wallets to existing sub-organizations
- `managing-policies` for access control within sub-organizations
- `signing-ethereum` for signing transactions after authentication
- `signing-solana` for Solana transaction signing
