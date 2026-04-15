# `@turnkey/sdk-server` Sub-Org Examples

Each example below is fully self-contained — it includes all imports and setup so you can use it directly.

## Create a sub-org with one root user, one wallet, one ETH account

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: process.env.TURNKEY_API_URL ?? "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const result = await client.createSubOrganization({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  subOrganizationName: `Sub-Org ${new Date().toISOString().slice(0, 19)}`,
  rootUsers: [
    {
      userName: "Root User",
      userEmail: "user@example.com",
      apiKeys: [
        {
          apiKeyName: "Parent API Key",
          publicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
          curveType: "API_KEY_CURVE_P256",
        },
      ],
      authenticators: [],
      oauthProviders: [],
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
    ],
  },
});

console.log("Sub-Org ID:   ", result.subOrganizationId);
console.log("Wallet ID:    ", result.wallet?.walletId);
console.log("ETH Address:  ", result.wallet?.addresses?.[0]);
console.log("Root User ID: ", result.rootUserIds?.[0]);
```

## Create a sub-org with no wallet (wallet created later)

Sometimes you want to create the sub-org first and decide on wallet structure separately — for example, when wallet derivation paths depend on user input gathered after onboarding.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: process.env.TURNKEY_API_URL ?? "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const result = await client.createSubOrganization({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  subOrganizationName: "Sub-Org Without Wallet",
  rootUsers: [
    {
      userName: "Root User",
      apiKeys: [
        {
          apiKeyName: "Parent API Key",
          publicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
          curveType: "API_KEY_CURVE_P256",
        },
      ],
      authenticators: [],
      oauthProviders: [],
    },
  ],
  rootQuorumThreshold: 1,
  // wallet omitted — create it later via createWallet scoped to subOrganizationId
});

console.log("Sub-Org ID:", result.subOrganizationId);
console.log("Wallet:    ", result.wallet); // undefined — no wallet was created
```

## Create a sub-org with multiple chains in the initial wallet

The wallet's `accounts` array can mix curves and address formats — derive ETH, Solana, and a Bitcoin SegWit address in a single activity. Bitcoin requires two accounts at the same path: a compressed public key (for PSBT construction) and the actual address.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: process.env.TURNKEY_API_URL ?? "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const btcPath = "m/84'/1'/1'/0/0"; // testnet SegWit

const result = await client.createSubOrganization({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  subOrganizationName: "Multi-Chain Sub-Org",
  rootUsers: [
    {
      userName: "Root User",
      apiKeys: [
        {
          apiKeyName: "Parent API Key",
          publicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
          curveType: "API_KEY_CURVE_P256",
        },
      ],
      authenticators: [],
      oauthProviders: [],
    },
  ],
  rootQuorumThreshold: 1,
  wallet: {
    walletName: "Multi-Chain Wallet",
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
        path: btcPath,
        addressFormat: "ADDRESS_FORMAT_COMPRESSED",
      },
      {
        curve: "CURVE_SECP256K1",
        pathFormat: "PATH_FORMAT_BIP32",
        path: btcPath,
        addressFormat: "ADDRESS_FORMAT_BITCOIN_TESTNET_P2WPKH",
      },
    ],
  },
});

console.log("Sub-Org ID:", result.subOrganizationId);
console.log("Addresses :", result.wallet?.addresses);
```

## Create a sub-org with multiple root users and a quorum

When provisioning a sub-org for a team or multi-party setup, attach multiple root users and require N-of-M approvals on root activities.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: process.env.TURNKEY_API_URL ?? "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

// Each root user holds their own P-256 API key. The parent's key is NOT included —
// after creation, the parent cannot sign sub-org activities; only these root users can.
const rootUsers = [
  {
    userName: "Alice",
    userEmail: "alice@example.com",
    apiKeys: [
      {
        apiKeyName: "Alice's Key",
        publicKey: "04ALICE_PUBLIC_KEY_HEX_HERE",
        curveType: "API_KEY_CURVE_P256" as const,
      },
    ],
    authenticators: [],
    oauthProviders: [],
  },
  {
    userName: "Bob",
    userEmail: "bob@example.com",
    apiKeys: [
      {
        apiKeyName: "Bob's Key",
        publicKey: "04BOB_PUBLIC_KEY_HEX_HERE",
        curveType: "API_KEY_CURVE_P256" as const,
      },
    ],
    authenticators: [],
    oauthProviders: [],
  },
  {
    userName: "Carol",
    userEmail: "carol@example.com",
    apiKeys: [
      {
        apiKeyName: "Carol's Key",
        publicKey: "04CAROL_PUBLIC_KEY_HEX_HERE",
        curveType: "API_KEY_CURVE_P256" as const,
      },
    ],
    authenticators: [],
    oauthProviders: [],
  },
];

const result = await client.createSubOrganization({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  subOrganizationName: "Team Sub-Org",
  rootUsers,
  rootQuorumThreshold: 2, // 2-of-3 approvals required for root activities
  wallet: {
    walletName: "Team Wallet",
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

console.log("Sub-Org ID:    ", result.subOrganizationId);
console.log("Root User IDs: ", result.rootUserIds);
```
