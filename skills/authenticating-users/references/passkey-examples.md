# Passkey / WebAuthn Examples

## Create Sub-Organization with Passkey

Register a new user with a WebAuthn passkey. The browser handles the biometric prompt.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();

// The attestation object comes from the browser's WebAuthn API:
// const credential = await navigator.credentials.create({ publicKey: options });
// Extract challenge and attestation from the credential response

const subOrg = await client.createSubOrganization({
  subOrganizationName: `user-${Date.now()}`,
  rootUsers: [
    {
      userName: "user@example.com",
      authenticators: [
        {
          authenticatorName: "my-passkey",
          challenge: "WEBAUTHN_CHALLENGE_BASE64",
          attestation: {
            credentialId: "CREDENTIAL_ID",
            clientDataJson: "CLIENT_DATA_JSON_BASE64",
            attestationObject: "ATTESTATION_OBJECT_BASE64",
            transports: ["AUTHENTICATOR_TRANSPORT_INTERNAL"],
          },
        },
      ],
      oauthProviders: [],
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

console.log("Sub-org created with passkey:", subOrg.subOrganizationId);
console.log("Wallet address:", subOrg.wallet?.addresses?.[0]);
```

## Passkey Authentication (Returning User)

For returning users, authenticate with their existing passkey.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();

// The assertion comes from the browser's WebAuthn API:
// const assertion = await navigator.credentials.get({ publicKey: options });

// For passkey login, the client uses the webauthn-stamper
// to stamp requests directly. The server does not need to
// handle the WebAuthn assertion - the stamper handles it.

// Server-side: create a session for the authenticated user
const session = await client.createReadWriteSession({
  targetPublicKey: "CLIENT_SESSION_PUBLIC_KEY",
  userId: "USER_ID",
});

console.log("Session created for passkey user");
```
