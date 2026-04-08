# Server-side OAuth Authentication Examples

Each example below is fully self-contained — it includes all imports and setup so you can use it directly.

## Full OAuth login flow (Google OIDC → find-or-create suborg → login)

```typescript
import {
  Turnkey,
  DEFAULT_ETHEREUM_ACCOUNTS,
  DEFAULT_SOLANA_ACCOUNTS,
} from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

async function oauthLoginFlow(
  oidcToken: string,
  clientPublicKey: string
) {
  // Step 1: Find existing sub-organization by OIDC token
  const { organizationIds } = await client.getSubOrgIds({
    organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
    filterType: "OIDC_TOKEN",
    filterValue: oidcToken,
  });

  let subOrgId: string;

  if (organizationIds.length > 0) {
    subOrgId = organizationIds[0]!;
    console.log("Found existing sub-org:", subOrgId);
  } else {
    // Step 2: Create a new sub-organization with OAuth provider
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
    console.log("Created new sub-org:", subOrgId);
  }

  // Step 3: Complete OAuth login
  const loginResult = await client.oauthLogin({
    organizationId: subOrgId,
    oidcToken,
    publicKey: clientPublicKey,
  });

  console.log("Login successful, session:", loginResult.session);
  return { subOrgId, session: loginResult.session };
}

oauthLoginFlow(
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "04abcdef..."
).catch(console.error);
```

## Find or create sub-organization only

```typescript
import {
  Turnkey,
  DEFAULT_ETHEREUM_ACCOUNTS,
  DEFAULT_SOLANA_ACCOUNTS,
} from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

async function findOrCreateOAuthSubOrg(
  oidcToken: string,
  providerName: string
): Promise<string> {
  const { organizationIds } = await client.getSubOrgIds({
    organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
    filterType: "OIDC_TOKEN",
    filterValue: oidcToken,
  });

  if (organizationIds.length > 0) {
    return organizationIds[0]!;
  }

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
            providerName,
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

  if (!createResult.subOrganizationId) {
    throw new Error("Sub-organization creation failed");
  }

  return createResult.subOrganizationId;
}

findOrCreateOAuthSubOrg(
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "Google"
).catch(console.error);
```

## OAuth login only (sub-org already known)

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

async function completeOauthLogin(
  subOrgId: string,
  oidcToken: string,
  clientPublicKey: string
) {
  const loginResult = await client.oauthLogin({
    organizationId: subOrgId,
    oidcToken,
    publicKey: clientPublicKey,
  });

  if (!loginResult.session) {
    throw new Error("OAuth login failed — no session returned");
  }

  console.log("Session JWT:", loginResult.session);
  return loginResult.session;
}

completeOauthLogin(
  "sub-org-id",
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "04abcdef..."
).catch(console.error);
```

## Link an additional OAuth provider to an existing user

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

async function linkOauthProvider(
  subOrgId: string,
  userId: string,
  providerName: string,
  oidcToken: string
) {
  const result = await client.createOauthProviders({
    organizationId: subOrgId,
    userId,
    oauthProviders: [
      {
        providerName,
        oidcToken,
      },
    ],
  });

  console.log("OAuth provider linked:", providerName);
  return result;
}

linkOauthProvider(
  "sub-org-id",
  "user-id",
  "Apple",
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
).catch(console.error);
```
