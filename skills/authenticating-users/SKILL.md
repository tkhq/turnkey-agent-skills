---
name: authenticating-users
description: "Implements user authentication flows with Turnkey including email OTP, OAuth/OIDC (Google, Apple, Facebook), and passkeys/WebAuthn. Handles sub-organization creation, session management, and credential registration. Use when asked to 'add login', 'set up authentication', 'add email OTP', 'add Google login', 'add social login', 'implement passkey auth', or 'create a signup flow'."
license: Apache-2.0
compatibility: "Requires Node.js. Install @turnkey/sdk-server. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars."
metadata:
  version: "1.0.0"
  tags: ["authentication", "otp", "oauth", "passkey", "webauthn", "sub-organization"]
---

# Authenticating Users

## Quick Start

Turnkey supports three authentication methods. Each creates a sub-organization per user, isolating their wallets and keys.

| Method | Best for | Setup complexity |
|--------|----------|-----------------|
| Email OTP | Passwordless email login | Low |
| OAuth/OIDC | Social login (Google, Apple, etc.) | Medium |
| Passkeys | WebAuthn biometric auth | Medium |

## Prerequisites

```bash
npm install @turnkey/sdk-server
```

## Environment Variables

```env
TURNKEY_API_PUBLIC_KEY=    # required (parent org API key)
TURNKEY_API_PRIVATE_KEY=   # required (parent org API key)
TURNKEY_ORGANIZATION_ID=   # required (parent org ID)
```

## How Auth Works

1. User initiates auth (enters email, clicks Google, taps passkey)
2. Turnkey verifies the credential
3. A sub-organization is created for new users (or looked up for returning users)
4. A session is returned for subsequent API calls

**Sub-organizations** isolate each user's wallets, keys, and policies. The parent organization cannot access user keys directly.

## Auth Methods

### Email OTP

Send a one-time code to the user's email, verify it, and create a session.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();

// Send OTP
const otpResponse = await client.initOtpAuth({
  contact: "user@example.com",
  otpType: "OTP_TYPE_EMAIL",
});

// After user enters the code:
const authResult = await client.otpAuth({
  otpId: otpResponse.otpId,
  otpCode: "123456", // from user input
  targetPublicKey: "SESSION_PUBLIC_KEY", // client-generated session key
});
```

For complete server-side OTP flow, see [references/otp-examples.md](references/otp-examples.md).

### OAuth / OIDC

Authenticate via Google, Apple, Facebook, or any OIDC provider.

```typescript
// After receiving the OAuth credential (ID token) from the provider:
const authResult = await client.oauth({
  oidcToken: "GOOGLE_ID_TOKEN",
  targetPublicKey: "SESSION_PUBLIC_KEY",
});
```

The `oidcToken` is the ID token from the OAuth provider. The `targetPublicKey` is a client-generated session key.

For complete OAuth flow with provider setup, see [references/oauth-examples.md](references/oauth-examples.md).

### Passkeys / WebAuthn

Register and authenticate using biometric passkeys. This requires a browser environment for the WebAuthn API.

```typescript
// Server-side: create a sub-org with a passkey credential
const subOrg = await client.createSubOrganization({
  subOrganizationName: "user-suborg",
  rootUsers: [
    {
      userName: "user@example.com",
      authenticators: [
        {
          authenticatorName: "passkey",
          challenge: "WEBAUTHN_CHALLENGE",
          attestation: { /* WebAuthn attestation from browser */ },
        },
      ],
    },
  ],
  wallet: {
    walletName: "user-wallet",
    accounts: [
      { curve: "CURVE_SECP256K1", pathFormat: "PATH_FORMAT_BIP32", path: "m/44'/60'/0'/0/0", addressFormat: "ADDRESS_FORMAT_ETHEREUM" },
    ],
  },
});
```

For complete passkey flow, see [references/passkey-examples.md](references/passkey-examples.md).

## Rules

- Never expose parent organization API keys to the client/browser
- Always verify OTP/OAuth credentials before granting access
- Each user gets their own sub-organization (do not share sub-orgs between users)
- Use session keys (targetPublicKey) for client-side operations after auth

## Related Skills

- `creating-wallets` for setting up wallets within sub-organizations
- `managing-policies` for access control within sub-organizations
