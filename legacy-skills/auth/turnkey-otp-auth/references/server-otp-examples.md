# Server-side OTP Authentication Examples

Each example below is fully self-contained — it includes all imports and setup so you can use it directly.

## Full OTP login flow (send → verify → find-or-create suborg → login)

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

async function otpLoginFlow(
  userEmail: string,
  getCodeFromUser: () => Promise<string>,
  clientPublicKey: string
) {
  // Step 1: Send OTP
  const initResult = await client.initOtp({
    otpType: "OTP_TYPE_EMAIL",
    contact: userEmail,
    appName: "My App",
    organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  });
  const otpId = initResult.otpId;
  console.log("OTP sent to", userEmail);

  // Step 2: Verify OTP
  const otpCode = await getCodeFromUser();
  const verifyResult = await client.verifyOtp({
    otpId,
    otpCode,
    organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  });
  const verificationToken = verifyResult.verificationToken;
  console.log("OTP verified");

  // Step 3: Find or create sub-organization
  const { organizationIds } = await client.getSubOrgIds({
    organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
    filterType: "EMAIL",
    filterValue: userEmail,
  });

  let subOrgId: string;
  if (organizationIds.length > 0) {
    subOrgId = organizationIds[0]!;
    console.log("Found existing sub-org:", subOrgId);
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
    console.log("Created new sub-org:", subOrgId);
  }

  // Step 4: Complete login
  const loginResult = await client.otpLogin({
    organizationId: subOrgId,
    verificationToken,
    publicKey: clientPublicKey,
  });

  console.log("Login successful, session:", loginResult.session);
  return { subOrgId, session: loginResult.session };
}

otpLoginFlow(
  "user@example.com",
  async () => "123456",
  "04abcdef..."
).catch(console.error);
```

## Send OTP only (initiation step)

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

async function sendOtpCode(email: string) {
  const result = await client.initOtp({
    otpType: "OTP_TYPE_EMAIL",
    contact: email,
    appName: "My App",
    organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  });

  if (!result.otpId) throw new Error("Expected non-null otpId from initOtp");
  console.log("OTP sent, otpId:", result.otpId);
  return result.otpId;
}

sendOtpCode("user@example.com").catch(console.error);
```

## Verify OTP and complete login

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

async function verifyAndLogin(
  otpId: string,
  otpCode: string,
  subOrgId: string,
  clientPublicKey: string
) {
  const verifyResult = await client.verifyOtp({
    otpId,
    otpCode,
    organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  });

  if (!verifyResult.verificationToken) {
    throw new Error("OTP verification failed — no verificationToken returned");
  }

  const loginResult = await client.otpLogin({
    organizationId: subOrgId,
    verificationToken: verifyResult.verificationToken,
    publicKey: clientPublicKey,
  });

  if (!loginResult.session) {
    throw new Error("Login failed — no session returned");
  }

  console.log("Session JWT:", loginResult.session);
  return loginResult.session;
}

verifyAndLogin(
  "otp-id-from-init",
  "123456",
  "sub-org-id",
  "04abcdef..."
).catch(console.error);
```
