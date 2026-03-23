# Email OTP Examples

## Complete Server-Side OTP Flow

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();

// Step 1: Send OTP to user's email
const email = "user@example.com";
const initResponse = await client.initOtpAuth({
  contact: email,
  otpType: "OTP_TYPE_EMAIL",
});

console.log("OTP sent. OTP ID:", initResponse.otpId);

// Step 2: User enters the 6-digit code from their email
const userCode = "123456"; // from user input

// Step 3: Verify OTP and create session
const authResult = await client.otpAuth({
  otpId: initResponse.otpId,
  otpCode: userCode,
  targetPublicKey: "CLIENT_SESSION_PUBLIC_KEY",
});

console.log("Auth successful!");
console.log("Sub-org ID:", authResult.subOrganizationId);
console.log("User ID:", authResult.userId);
```

## OTP with Sub-Organization and Wallet Creation

For new users, create a sub-organization with a wallet during the OTP signup flow.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();

// For new users: create sub-org with OTP auth and an embedded wallet
const subOrg = await client.createSubOrganization({
  subOrganizationName: `user-${Date.now()}`,
  rootUsers: [
    {
      userName: "user@example.com",
      oauthProviders: [],
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

console.log("Sub-org created:", subOrg.subOrganizationId);
console.log("Wallet ID:", subOrg.wallet?.walletId);
console.log("ETH address:", subOrg.wallet?.addresses?.[0]);
```

## SMS OTP

Same flow as email, but with SMS delivery.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

const client = turnkey.apiClient();

// Send SMS OTP
const initResponse = await client.initOtpAuth({
  contact: "+15551234567",
  otpType: "OTP_TYPE_SMS",
});

// Verify (same as email)
const authResult = await client.otpAuth({
  otpId: initResponse.otpId,
  otpCode: "123456",
  targetPublicKey: "CLIENT_SESSION_PUBLIC_KEY",
});
```
