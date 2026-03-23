# OAuth / OIDC Examples

## Google OAuth Flow (Server-Side)

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();

// Step 1: Client-side, user authenticates with Google and you receive an ID token
// The ID token comes from Google Sign-In, Firebase Auth, or your OAuth library
const googleIdToken = "eyJhbGciOiJSUzI1NiIs..."; // from Google

// Step 2: Authenticate with Turnkey using the Google ID token
const authResult = await client.oauth({
  oidcToken: googleIdToken,
  targetPublicKey: "CLIENT_SESSION_PUBLIC_KEY",
});

console.log("OAuth successful!");
console.log("Sub-org ID:", authResult.subOrganizationId);
console.log("User ID:", authResult.userId);
```

## Create Sub-Organization with OAuth Provider

For new users, set up a sub-org configured for OAuth.

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import crypto from "crypto";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();

// The nonce should be the sha256 hash of the client's public key
// This binds the OAuth credential to the session key
const clientPublicKey = "CLIENT_SESSION_PUBLIC_KEY";
const nonce = crypto.createHash("sha256").update(clientPublicKey).digest("hex");

const subOrg = await client.createSubOrganization({
  subOrganizationName: `user-${Date.now()}`,
  rootUsers: [
    {
      userName: "user@gmail.com",
      oauthProviders: [
        {
          providerName: "Google",
          oidcToken: "GOOGLE_ID_TOKEN",
        },
      ],
      authenticators: [],
    },
  ],
  wallet: {
    walletName: "default-wallet",
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

console.log("Sub-org with OAuth:", subOrg.subOrganizationId);
```

## Link Additional OAuth Provider

Add Apple login to an existing user who signed up with Google.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();

// Add Apple as an additional OAuth provider for the user
await client.createOauthProviders({
  userId: "EXISTING_USER_ID",
  oauthProviders: [
    {
      providerName: "Apple",
      oidcToken: "APPLE_ID_TOKEN",
    },
  ],
});
```
