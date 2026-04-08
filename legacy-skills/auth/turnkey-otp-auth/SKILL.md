---
name: turnkey-otp-auth
description: 'Authenticates users via email OTP using Turnkey sub-organizations. Supports server-side flows with @turnkey/sdk-server and frontend flows with @turnkey/react-wallet-kit + Auth Proxy. Use when asked to "add OTP login", "authenticate with email code", "sign in with OTP", "set up email authentication", "create a login flow", "add passwordless auth", or implement any email-based one-time-password authentication with Turnkey.'
compatibility: "Requires Node.js. Server-side: @turnkey/sdk-server. Frontend: @turnkey/react-wallet-kit. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars for server-side."
depends_on:
  - turnkey-wallet-management
metadata:
  version: "1.0.0"
  tags: ["turnkey", "otp", "authentication", "email", "sub-organization", "session", "passwordless"]
  sdk_versions:
    "@turnkey/sdk-server": "^5.1.0"
---

# Turnkey OTP Authentication

## Overview

Use this skill to authenticate users via email one-time passwords (OTP) with Turnkey. The OTP flow creates or accesses a Turnkey sub-organization per user, then issues a session that the user can use for subsequent authenticated requests (signing, wallet access, etc.).

The flow has three core steps:
1. **Send OTP** — Turnkey sends a one-time code to the user's email
2. **Verify OTP** — the user submits the code; Turnkey returns a `verificationToken`
3. **Login** — exchange the `verificationToken` for a session (JWT + client keypair)

Each user gets their own **sub-organization** under your parent organization. Sub-organizations are isolated tenants: each has its own wallets, policies, and users. The OTP flow finds or creates a sub-organization for the user's email automatically.

Turnkey provides two integration paths. **Pick one based on your architecture:**

| | Server-side (`@turnkey/sdk-server`) | Frontend (`@turnkey/react-wallet-kit` + Auth Proxy) |
|---|---|---|
| **Use if…** | you run your own backend (Next.js Server Actions, Express, etc.) and want full control | you want a managed auth flow with no backend |
| **Backend required** | yes — OTP calls use your parent org API keys | no — Auth Proxy handles it |
| **Session management** | you manage session storage | SDK handles it automatically |
| **Recommendation** | full control, production apps with custom logic | fastest path to a working auth flow |

## Rules

- **Never expose parent organization API keys to the client.** The `initOtp`, `verifyOtp`, and `otpLogin` calls must run server-side (e.g., Next.js Server Actions, API routes) because they use your parent organization's API credentials. Only the resulting session token goes to the client.
- **Always verify the OTP before creating a sub-organization.** Call `verifyOtp` before `getSubOrgIds`/`createSubOrganization` to prevent sub-organization spam from unverified email addresses.

## Prerequisites

```bash
# Server-side approach
npm install @turnkey/sdk-server

# Frontend approach (React/Next.js)
npm install @turnkey/sdk-react
```

## Environment Variables

**Server-side (Option A):**

```env
TURNKEY_API_PUBLIC_KEY=    # Turnkey API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # Turnkey API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Turnkey parent organization UUID
```

**Frontend (Option B):**

```env
NEXT_PUBLIC_ORGANIZATION_ID=       # Turnkey parent organization UUID
NEXT_PUBLIC_BASE_URL=              # https://api.turnkey.com
NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID=  # Auth Proxy config ID from Turnkey Dashboard
NEXT_PUBLIC_AUTH_PROXY_BASE_URL=   # https://authproxy.turnkey.com
```

---

## Option A — Server-side with @turnkey/sdk-server

Use this approach when you run your own backend. All OTP API calls execute server-side using your parent organization's API keys.

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

### Step 2: Send the OTP code

Call `initOtp` to send a one-time code to the user's email. This returns an `otpId` you'll need for verification.

```typescript
const initResult = await client.initOtp({
  otpType: "OTP_TYPE_EMAIL",
  contact: userEmail,
  appName: "My App",
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const otpId = initResult.otpId;
```

### Step 3: Verify the OTP code

When the user submits the code, call `verifyOtp` to confirm ownership. This returns a `verificationToken` needed for login.

```typescript
const verifyResult = await client.verifyOtp({
  otpId,
  otpCode: codeFromUser,
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const verificationToken = verifyResult.verificationToken;
```

### Step 4: Find or create a sub-organization

After verification, look up the sub-organization for the user's email. If none exists, create one with a default wallet.

```typescript
import {
  DEFAULT_ETHEREUM_ACCOUNTS,
  DEFAULT_SOLANA_ACCOUNTS,
} from "@turnkey/sdk-server";

const { organizationIds } = await client.getSubOrgIds({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  filterType: "EMAIL",
  filterValue: userEmail,
});

let subOrgId: string;

if (organizationIds.length > 0) {
  subOrgId = organizationIds[0]!;
} else {
  const createResult = await client.createSubOrganization({
    organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
    subOrganizationName: `otp-suborg-${Date.now()}`,
    rootQuorumThreshold: 1,
    rootUsers: [
      {
        userName: `otp-user-${Date.now()}`,
        userEmail: userEmail,
        apiKeys: [],
        authenticators: [],
        oauthProviders: [],
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

### Step 5: Complete login (otpLogin)

Exchange the `verificationToken` for a session. The `publicKey` is a client-side session key that the user's browser generates (see the SDK example for the client-side keypair generation pattern).

```typescript
const loginResult = await client.otpLogin({
  organizationId: subOrgId,
  verificationToken,
  publicKey: clientPublicKey,
});

const session = loginResult.session;
```

The returned `session` is a JWT. Return it to the client along with the `subOrgId`. The client stores the session and uses the corresponding private key (from the keypair it generated) to stamp subsequent API requests.

### Step 6: Use the authenticated session

Once logged in, the user can make Turnkey API calls authenticated against their sub-organization — signing transactions, listing wallets, etc. The client's session keypair (stored in `indexedDb` in browser contexts) produces the `x-stamp` signatures required by the Turnkey API.

---

## Option B — Frontend with @turnkey/react-wallet-kit + Auth Proxy

Use this approach for a managed auth flow without a custom backend. The Turnkey Auth Proxy handles `initOtp`, `verifyOtp`, and `otpLogin` internally.

### Setup

1. Enable the **Auth Proxy** from your [Turnkey Dashboard](https://app.turnkey.com/dashboard/walletKit). Configure allowed origins, session lifetimes, and email templates. Note the Auth Proxy Config ID.

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
          emailOtpAuthEnabled: true,
        },
      }}
    >
      {children}
    </TurnkeyProvider>
  );
}
```

3. Trigger the OTP flow in your login component:

```tsx
import { useTurnkey } from "@turnkey/sdk-react";

function LoginPage() {
  const { handleLogin } = useTurnkey();

  const onLogin = async () => {
    await handleLogin();
    // SDK opens a modal, sends OTP, verifies code, creates session
    // On success, redirect to dashboard
  };

  return <button onClick={onLogin}>Sign in with Email</button>;
}
```

### How it works

When the user clicks "Sign in with Email":
1. The SDK opens a modal and prompts for the user's email
2. Auth Proxy calls `initOtp` → user receives an email with a code
3. User enters the code → Auth Proxy calls `verifyOtp`
4. Auth Proxy finds or creates a sub-organization for the email
5. Auth Proxy calls `otpLogin` with a client-generated session key → returns a session JWT
6. The SDK stores the session automatically in `indexedDb`

After login, use `useTurnkey()` to access the authenticated state, wallets, and signing methods.

---

## Troubleshooting

**OTP code expired or invalid**
OTP codes have a short TTL (typically 10 minutes). If the user takes too long, call `initOtp` again to send a fresh code. Ensure the `otpId` and `otpCode` are paired correctly.

**`verificationToken` missing from `verifyOtp` response**
The OTP code was incorrect. Prompt the user to re-enter. The `verifyOtp` call will throw or return without a token on mismatch.

**Sub-organization not found after verification**
The user may not have an existing sub-organization. Always handle the "create new sub-org" case when `getSubOrgIds` returns an empty array.

**Session JWT vs. session keypair confusion**
The session JWT is metadata — it cannot stamp API requests on its own. Only the client-side session keypair (generated before `otpLogin`) can produce valid `x-stamp` signatures. The JWT is useful for server-side user identification.

**`403 Forbidden` on OTP calls**
The parent organization API key does not have permission, or the `organizationId` is wrong. Verify your `TURNKEY_API_PUBLIC_KEY` matches the key registered in the Turnkey console.

**Auth Proxy returns CORS errors (Option B)**
The request origin is not in the Auth Proxy's allowed origins list. Add your domain in the [Turnkey Dashboard](https://app.turnkey.com/dashboard/walletKit) under Auth Proxy settings.

**Sub-organization creation fails with policy rejection**
A policy on the parent organization is blocking sub-organization creation. Review policies in the Turnkey console under **Policies**.

## Related Skills

- `skills/core/turnkey-wallet-management/SKILL.md` — manage wallets within a sub-organization after authentication
- `skills/core/turnkey-transaction-signing/SKILL.md` — sign transactions using the authenticated session
- `skills/signing/turnkey-ethereum-evm/SKILL.md` — sign EVM transactions after login
- `skills/signing/turnkey-solana-signing/SKILL.md` — sign Solana transactions after login
