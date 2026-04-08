---
name: turnkey-oauth
description: 'Authenticates users via OAuth (Google, Apple, Facebook, etc.) using Turnkey sub-organizations and OIDC tokens. Supports server-side flows with @turnkey/sdk-server and frontend flows with @turnkey/sdk-react + Auth Proxy. Use when asked to "add Google login", "sign in with OAuth", "add social login", "authenticate with Google", "set up OAuth authentication", "link an OAuth provider", or implement any OAuth/OIDC-based authentication with Turnkey.'
compatibility: "Requires Node.js. Server-side: @turnkey/sdk-server. Frontend: @turnkey/sdk-react. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars for server-side."
depends_on:
  - turnkey-wallet-management
metadata:
  version: "1.0.0"
  tags: ["turnkey", "oauth", "authentication", "google", "oidc", "sub-organization", "session", "social-login"]
  sdk_versions:
    "@turnkey/sdk-server": "^5.1.0"
---

# Turnkey OAuth Authentication

## Overview

Use this skill to authenticate users via OAuth providers (Google, Apple, Facebook, Auth0, Cognito) with Turnkey. The OAuth flow exchanges an OIDC ID token from the provider for a Turnkey session, creating or accessing a sub-organization per user.

The flow has three core steps:
1. **Get OIDC token** — the user signs in with an OAuth provider (e.g., Google One Tap); the provider returns an OIDC ID token
2. **Find or create sub-organization** — look up the sub-org associated with the OIDC token, or create one with a default wallet
3. **OAuth login** — exchange the OIDC token + a client session public key for a Turnkey session JWT

Each user gets their own **sub-organization** under your parent organization. Sub-organizations are isolated tenants: each has its own wallets, policies, and users. The OAuth flow finds or creates a sub-organization for the user's OIDC identity automatically.

**Supported providers:**

| Provider | Token type | Notes |
|----------|-----------|-------|
| Google | OIDC ID token | Most common; use `@react-oauth/google` or Google Identity Services |
| Apple | OIDC ID token | Apple Sign In |
| Facebook | OIDC ID token | Facebook Login |
| Auth0 | OIDC ID token | Any Auth0 connection |
| Cognito | OIDC ID token | AWS Cognito User Pools |

Turnkey provides two integration paths. **Pick one based on your architecture:**

| | Server-side (`@turnkey/sdk-server`) | Frontend (`@turnkey/sdk-react` + Auth Proxy) |
|---|---|---|
| **Use if…** | you run your own backend (Next.js Server Actions, Express, etc.) and want full control | you want a managed auth flow with no backend |
| **Backend required** | yes — OAuth calls use your parent org API keys | no — Auth Proxy handles it |
| **Session management** | you manage session storage | SDK handles it automatically |
| **Recommendation** | full control, production apps with custom logic | fastest path to a working auth flow |

## Rules

- **Never expose parent organization API keys to the client.** The `getSubOrgIds`, `createSubOrganization`, `oauthLogin`, and `createOauthProviders` calls must run server-side because they use your parent organization's API credentials. Only the resulting session token goes to the client.
- **Use a nonce to bind the OIDC token to the session keypair.** Compute `nonce = sha256(clientPublicKey)` and pass it as the `nonce` parameter when requesting the OIDC token from the provider. This prevents token replay attacks.
- **Always use `OIDC_TOKEN` as the `filterType` when looking up sub-orgs for OAuth.** Do not use `EMAIL` — the OIDC token lookup verifies the provider identity, not just the email address.

## Prerequisites

```bash
# Server-side approach
npm install @turnkey/sdk-server

# Frontend approach (React/Next.js) — Google example
npm install @turnkey/sdk-react @react-oauth/google
```

## Environment Variables

**Server-side (Option A):**

```env
TURNKEY_API_PUBLIC_KEY=    # Turnkey API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # Turnkey API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Turnkey parent organization UUID
GOOGLE_CLIENT_ID=          # Google OAuth client ID (for Google provider)
```

**Frontend (Option B):**

```env
NEXT_PUBLIC_ORGANIZATION_ID=       # Turnkey parent organization UUID
NEXT_PUBLIC_BASE_URL=              # https://api.turnkey.com
NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID=  # Auth Proxy config ID from Turnkey Dashboard
NEXT_PUBLIC_AUTH_PROXY_BASE_URL=   # https://authproxy.turnkey.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=      # Google OAuth client ID
```

---

## Option A — Server-side with @turnkey/sdk-server

Use this approach when you run your own backend. All Turnkey API calls execute server-side using your parent organization's API keys. The client handles the OAuth provider interaction (e.g., Google One Tap) and sends the OIDC token to your backend.

### Step 1: Initialize the Turnkey server client

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();
```

### Step 2: Client-side — get the OIDC token from the OAuth provider

On the client, the user authenticates with the OAuth provider. Before initiating the OAuth flow, generate a session keypair and compute a nonce from the public key. Pass this nonce to the provider so the resulting OIDC token is bound to the keypair.

```typescript
// Client-side: generate keypair and compute nonce
// The specific implementation depends on your client SDK
// The nonce ties the OIDC token to this specific session keypair
const nonce = sha256(clientPublicKey);

// Pass nonce to Google One Tap, Apple Sign In, etc.
// The provider includes it in the OIDC ID token
```

After the user completes sign-in, the provider returns an OIDC ID token (a JWT). Send this token and the client public key to your backend.

### Step 3: Find or create a sub-organization

On the server, look up the sub-organization associated with the OIDC token. If none exists, create one with a default wallet and the OAuth provider attached to the root user.

```typescript
import {
  DEFAULT_ETHEREUM_ACCOUNTS,
  DEFAULT_SOLANA_ACCOUNTS,
} from "@turnkey/sdk-server";

const { organizationIds } = await client.getSubOrgIds({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  filterType: "OIDC_TOKEN",
  filterValue: oidcToken,
});

let subOrgId: string;

if (organizationIds.length > 0) {
  subOrgId = organizationIds[0]!;
} else {
  const createResult = await client.createSubOrganization({
    organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
    subOrganizationName: `oauth-suborg-${Date.now()}`,
    rootQuorumThreshold: 1,
    rootUsers: [
      {
        userName: `oauth-user-${Date.now()}`,
        userEmail: "",
        apiKeys: [],
        authenticators: [],
        oauthProviders: [
          {
            providerName: "Google",
            oidcToken,
          },
        ],
      },
    ],
    wallet: {
      walletName: "Default Wallet",
      accounts: [...DEFAULT_ETHEREUM_ACCOUNTS, ...DEFAULT_SOLANA_ACCOUNTS],
    },
  });
  subOrgId = createResult.subOrganizationId!;
}
```

### Step 4: Complete OAuth login

Exchange the OIDC token for a Turnkey session. The `publicKey` is the client-side session key generated in Step 2.

```typescript
const loginResult = await client.oauthLogin({
  organizationId: subOrgId,
  oidcToken,
  publicKey: clientPublicKey,
});

const session = loginResult.session;
```

The returned `session` is a JWT. Return it to the client along with the `subOrgId`. The client stores the session and uses the corresponding private key (from the keypair it generated) to stamp subsequent API requests.

### Step 5: Link additional OAuth providers (optional)

After a user is authenticated, you can link additional OAuth providers to their account using `createOauthProviders`. This lets users sign in with multiple providers (e.g., both Google and Apple).

```typescript
await client.createOauthProviders({
  organizationId: subOrgId,
  userId: targetUserId,
  oauthProviders: [
    {
      providerName: "Apple",
      oidcToken: appleOidcToken,
    },
  ],
});
```

**Restrictions:** When called by the parent organization targeting a sub-org, `createOauthProviders` requires that the OAuth issuer has verified the email in the token and the email matches the user's existing email.

---

## Option B — Frontend with @turnkey/sdk-react + Auth Proxy

Use this approach for a managed auth flow without a custom backend. The Turnkey Auth Proxy handles sub-organization lookup/creation and `oauthLogin` internally.

### Setup

1. Enable the **Auth Proxy** from your [Turnkey Dashboard](https://app.turnkey.com/dashboard/walletKit). Configure allowed origins, session lifetimes, and OAuth providers. Note the Auth Proxy Config ID.

2. Wrap your app with `TurnkeyProvider`:

```tsx
import { TurnkeyProvider } from "@turnkey/sdk-react";

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TurnkeyProvider
      config={{
        apiBaseUrl: process.env.NEXT_PUBLIC_BASE_URL!,
        defaultOrganizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
        authConfig: {
          authProxyUrl: process.env.NEXT_PUBLIC_AUTH_PROXY_BASE_URL!,
          authProxyConfigId: process.env.NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID!,
          googleOAuthEnabled: true,
        },
      }}
    >
      {children}
    </TurnkeyProvider>
  );
}
```

3. Trigger the OAuth flow in your login component:

```tsx
import { useTurnkey } from "@turnkey/sdk-react";

function LoginPage() {
  const { handleLogin } = useTurnkey();

  const onLogin = async () => {
    await handleLogin();
    // SDK opens a modal, user signs in with Google
    // On success, redirect to dashboard
  };

  return <button onClick={onLogin}>Sign in with Google</button>;
}
```

### How it works

When the user clicks "Sign in with Google":
1. The SDK generates a session keypair and computes a nonce from the public key
2. Google One Tap prompts the user to sign in; the nonce is embedded in the OIDC token
3. Auth Proxy receives the OIDC token and calls `getSubOrgIds` with `filterType: "OIDC_TOKEN"`
4. If no sub-org exists, Auth Proxy calls `createSubOrganization` with the Google provider attached
5. Auth Proxy calls `oauthLogin` with the OIDC token and client public key → returns a session JWT
6. The SDK stores the session automatically in `indexedDb`

After login, use `useTurnkey()` to access the authenticated state, wallets, and signing methods.

---

## Troubleshooting

**OIDC token expired**
OIDC ID tokens have a short TTL (typically 5–10 minutes). If the token expires before you call `oauthLogin`, the user must re-authenticate with the OAuth provider.

**`filterType: "OIDC_TOKEN"` returns empty organizationIds**
The user has never authenticated with this provider before. Create a new sub-organization with the OIDC token attached via `oauthProviders` in the root user.

**`oauthLogin` fails with "invalid oidcToken"**
The OIDC token may be malformed, expired, or issued by a provider not configured in your Turnkey organization. Verify the token is a valid JWT and the issuer matches a configured provider.

**`createOauthProviders` rejected by policy**
When the parent organization calls `createOauthProviders` targeting a sub-org, the provider must have a verified email matching the user's existing email. This restriction prevents unauthorized provider linking.

**Session JWT vs. session keypair confusion**
The session JWT is metadata — it cannot stamp API requests on its own. Only the client-side session keypair (generated before `oauthLogin`) can produce valid `x-stamp` signatures. The JWT is useful for server-side user identification.

**`403 Forbidden` on API calls**
The parent organization API key does not have permission, or the `organizationId` is wrong. Verify your `TURNKEY_API_PUBLIC_KEY` matches the key registered in the Turnkey console.

**Auth Proxy returns CORS errors (Option B)**
The request origin is not in the Auth Proxy's allowed origins list. Add your domain in the [Turnkey Dashboard](https://app.turnkey.com/dashboard/walletKit) under Auth Proxy settings.

**Google OIDC nonce mismatch**
The nonce in the OIDC token must match `sha256(clientPublicKey)`. Ensure you pass the nonce when configuring Google One Tap and that the public key hasn't changed between nonce computation and the `oauthLogin` call.

## Related Skills

- `skills/core/turnkey-wallet-management/SKILL.md` — manage wallets within a sub-organization after authentication
- `skills/auth/turnkey-otp-auth/SKILL.md` — email OTP authentication (alternative to OAuth)
- `skills/core/turnkey-transaction-signing/SKILL.md` — sign transactions using the authenticated session
- `skills/signing/turnkey-ethereum-evm/SKILL.md` — sign EVM transactions after login
- `skills/signing/turnkey-solana-signing/SKILL.md` — sign Solana transactions after login
