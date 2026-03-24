# Custom Backend Examples

These examples implement auth flows using Next.js Server Actions with `@turnkey/sdk-server`. Use this approach when you need server-side user data, custom validations, rate limiting, or co-signing.

## Server Setup

```typescript
// server/turnkey.ts
import { Turnkey } from "@turnkey/sdk-server";

export const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});

export const client = turnkey.apiClient();
```

## Email OTP Server Actions

```typescript
// server/actions/auth.ts
"use server";
import { client } from "../turnkey";

export async function initOtpAction(email: string) {
  const { otpId } = await client.initOtp({
    contact: email,
    otpType: "OTP_TYPE_EMAIL",
  });
  return otpId;
}

export async function verifyOtpAction(otpId: string, otpCode: string) {
  const { verificationToken } = await client.verifyOtp({ otpId, otpCode });
  return verificationToken;
}

export async function getOrCreateSubOrg(email: string) {
  // Check for existing sub-org
  const { organizationIds } = await client.getVerifiedSubOrgIds({
    filterType: "EMAIL",
    filterValue: email,
  });

  if (organizationIds.length > 0) {
    return organizationIds[0];
  }

  // Create new sub-org with embedded wallet
  const result = await client.createSubOrganization({
    subOrganizationName: `user-${Date.now()}`,
    rootQuorumThreshold: 1,
    rootUsers: [{
      userName: email,
      userEmail: email,
      apiKeys: [],
      authenticators: [],
      oauthProviders: [],
    }],
    wallet: {
      walletName: "Default Wallet",
      accounts: [
        { curve: "CURVE_SECP256K1", pathFormat: "PATH_FORMAT_BIP32",
          path: "m/44'/60'/0'/0/0", addressFormat: "ADDRESS_FORMAT_ETHEREUM" },
        { curve: "CURVE_ED25519", pathFormat: "PATH_FORMAT_BIP32",
          path: "m/44'/501'/0'/0'", addressFormat: "ADDRESS_FORMAT_SOLANA" },
      ],
    },
  });
  return result.subOrganizationId;
}

export async function otpLoginAction(
  subOrgId: string,
  verificationToken: string,
  publicKey: string
) {
  const session = await client.otpLogin({
    organizationId: subOrgId,
    verificationToken,
    publicKey,
  });
  return session;
}
```

## Email OTP Frontend

```tsx
// app/page.tsx
"use client";
import { useTurnkey, ClientState, AuthState } from "@turnkey/react-wallet-kit";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { initOtpAction, verifyOtpAction, getOrCreateSubOrg, otpLoginAction } from "../server/actions/auth";

export default function LoginPage() {
  const { createApiKeyPair, storeSession, authState, clientState } = useTurnkey();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otpId, setOtpId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");

  useEffect(() => {
    if (authState === AuthState.Authenticated) router.push("/dashboard");
  }, [authState, router]);

  async function handleSendCode() {
    const id = await initOtpAction(email);
    setOtpId(id);
    setStep("code");
  }

  async function handleVerify() {
    // Generate ephemeral session keypair
    const { publicKey } = await createApiKeyPair();

    // Verify OTP
    const verificationToken = await verifyOtpAction(otpId, otpCode);

    // Get or create sub-org
    const subOrgId = await getOrCreateSubOrg(email);

    // Complete login
    const session = await otpLoginAction(subOrgId, verificationToken, publicKey!);

    // Store session client-side
    await storeSession({ sessionToken: session });

    router.push("/dashboard");
  }

  if (clientState !== ClientState.Ready) return <p>Loading...</p>;

  return (
    <main>
      {step === "email" ? (
        <div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <button onClick={handleSendCode}>Send Code</button>
        </div>
      ) : (
        <div>
          <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} placeholder="Enter code" />
          <button onClick={handleVerify}>Verify</button>
        </div>
      )}
    </main>
  );
}
```

## OAuth Server Actions (Google)

```typescript
// server/actions/oauth.ts
"use server";
import { client } from "../turnkey";

export async function getSubOrgsForOAuth(oidcToken: string) {
  const { organizationIds } = await client.getSubOrgIds({
    filterType: "OIDC_TOKEN",
    filterValue: oidcToken,
  });
  return organizationIds;
}

export async function createSubOrgWithOAuth(oauthProviders: Array<{
  providerName: string;
  oidcToken: string;
}>) {
  const result = await client.createSubOrganization({
    subOrganizationName: `user-${Date.now()}`,
    rootQuorumThreshold: 1,
    rootUsers: [{
      userName: "OAuth User",
      userEmail: "",
      apiKeys: [],
      authenticators: [],
      oauthProviders,
    }],
    wallet: {
      walletName: "Default Wallet",
      accounts: [
        { curve: "CURVE_SECP256K1", pathFormat: "PATH_FORMAT_BIP32",
          path: "m/44'/60'/0'/0/0", addressFormat: "ADDRESS_FORMAT_ETHEREUM" },
        { curve: "CURVE_ED25519", pathFormat: "PATH_FORMAT_BIP32",
          path: "m/44'/501'/0'/0'", addressFormat: "ADDRESS_FORMAT_SOLANA" },
      ],
    },
  });
  return result.subOrganizationId;
}

export async function oauthLoginAction(
  subOrgId: string,
  oidcToken: string,
  publicKey: string
) {
  const session = await client.oauthLogin({
    organizationId: subOrgId,
    oidcToken,
    publicKey,
  });
  return session;
}
```

## OAuth Frontend (Google)

```tsx
// app/page.tsx
"use client";
import { useTurnkey, ClientState } from "@turnkey/react-wallet-kit";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import { useRef, useEffect } from "react";
import { getSubOrgsForOAuth, createSubOrgWithOAuth, oauthLoginAction } from "../server/actions/oauth";

export default function OAuthLogin() {
  const { createApiKeyPair, storeSession, clientState } = useTurnkey();
  const publicKeyRef = useRef<string | null>(null);
  const nonceRef = useRef<string | null>(null);

  useEffect(() => {
    if (clientState === ClientState.Ready) {
      createApiKeyPair().then(({ publicKey }) => {
        publicKeyRef.current = publicKey!;
        nonceRef.current = bytesToHex(sha256(publicKey!));
      });
    }
  }, [clientState, createApiKeyPair]);

  async function handleGoogleSuccess(response: { credential?: string }) {
    const oidcToken = response.credential!;
    const publicKey = publicKeyRef.current!;

    // Find or create sub-org
    const orgIds = await getSubOrgsForOAuth(oidcToken);
    const subOrgId = orgIds[0] ?? await createSubOrgWithOAuth([
      { providerName: "Google", oidcToken },
    ]);

    // Login
    const session = await oauthLoginAction(subOrgId, oidcToken, publicKey);
    await storeSession({ sessionToken: session });
  }

  if (!nonceRef.current) return <p>Loading...</p>;

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <GoogleLogin onSuccess={handleGoogleSuccess} nonce={nonceRef.current} />
    </GoogleOAuthProvider>
  );
}
```

## Wallet Auth Server Actions

```typescript
// server/actions/wallet.ts
"use server";
import { client } from "../turnkey";

export async function getSubOrgsForWallet(publicKey: string) {
  const { organizationIds } = await client.getSubOrgIds({
    filterType: "PUBLIC_KEY",
    filterValue: publicKey,
  });
  return organizationIds;
}

export async function createSubOrgWithWallet(
  publicKey: string,
  curveType: "API_KEY_CURVE_ED25519" | "API_KEY_CURVE_SECP256K1"
) {
  const result = await client.createSubOrganization({
    subOrganizationName: `wallet-user-${Date.now()}`,
    rootQuorumThreshold: 1,
    rootUsers: [{
      userName: "Wallet User",
      userEmail: "",
      apiKeys: [{
        apiKeyName: "wallet-key",
        publicKey,
        curveType,
      }],
      authenticators: [],
      oauthProviders: [],
    }],
    wallet: {
      walletName: "Default Wallet",
      accounts: [
        { curve: "CURVE_SECP256K1", pathFormat: "PATH_FORMAT_BIP32",
          path: "m/44'/60'/0'/0/0", addressFormat: "ADDRESS_FORMAT_ETHEREUM" },
        { curve: "CURVE_ED25519", pathFormat: "PATH_FORMAT_BIP32",
          path: "m/44'/501'/0'/0'", addressFormat: "ADDRESS_FORMAT_SOLANA" },
      ],
    },
  });
  return result.subOrganizationId;
}
```

## Wallet Auth Frontend

```tsx
// app/page.tsx
"use client";
import { useTurnkey, ClientState } from "@turnkey/react-wallet-kit";
import { useState, useEffect } from "react";
import { getSubOrgsForWallet, createSubOrgWithWallet } from "../server/actions/wallet";

export default function WalletLogin() {
  const {
    fetchWalletProviders, buildWalletLoginRequest,
    storeSession, clientState,
  } = useTurnkey();
  const [walletProviders, setWalletProviders] = useState<any[]>([]);

  useEffect(() => {
    if (clientState === ClientState.Ready) {
      fetchWalletProviders().then(setWalletProviders);
    }
  }, [clientState, fetchWalletProviders]);

  async function handleWalletLogin(provider: any) {
    // Build a signed login request using the external wallet
    const { signedRequest, publicKey } = await buildWalletLoginRequest({
      walletProvider: provider,
    });

    // Find or create sub-org
    const orgIds = await getSubOrgsForWallet(publicKey);
    if (orgIds.length === 0) {
      const curveType = provider.chain === "solana"
        ? "API_KEY_CURVE_ED25519"
        : "API_KEY_CURVE_SECP256K1";
      await createSubOrgWithWallet(publicKey, curveType);
    }

    // Submit the wallet-signed request to complete login
    const session = await fetch(signedRequest.url, {
      method: "POST",
      headers: signedRequest.headers,
      body: signedRequest.body,
    }).then(r => r.json());

    await storeSession({ sessionToken: session });
  }

  return (
    <div>
      <h2>Connect Wallet</h2>
      {walletProviders.map((provider) => (
        <button key={provider.name} onClick={() => handleWalletLogin(provider)}>
          {provider.name}
        </button>
      ))}
    </div>
  );
}
```

## Magic Link (OTP with Redirect)

Magic links embed the OTP code in a URL. When clicked, the app extracts the code and completes auth automatically.

```typescript
// server/actions/magic-link.ts
"use server";
import { client } from "../turnkey";

export async function sendMagicLink(email: string) {
  const { otpId } = await client.initOtp({
    contact: email,
    otpType: "OTP_TYPE_EMAIL",
    emailCustomization: {
      magicLinkTemplate: `${process.env.NEXT_PUBLIC_APP_URL}?otpCode=%s`,
    },
  });
  return otpId;
}
```

```tsx
// app/page.tsx - detect magic link on page load
"use client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function MagicLinkHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const otpCode = searchParams.get("otpCode");
    const otpId = localStorage.getItem("otpId");

    if (otpCode && otpId) {
      // Auto-complete auth with the code from the URL
      completeAuth(otpId, otpCode);
      localStorage.removeItem("otpId");
    }
  }, [searchParams]);

  async function handleSendLink(email: string) {
    const otpId = await sendMagicLink(email);
    localStorage.setItem("otpId", otpId);
    // Show "Check your email" message
  }

  // ... rest of the component
}
```

## Linking Additional OAuth Providers

```typescript
// server/actions/link.ts
"use server";
import { client } from "../turnkey";

export async function linkOAuthProvider(
  userId: string,
  organizationId: string,
  providerName: string,
  oidcToken: string
) {
  await client.createOauthProviders({
    userId,
    organizationId,
    oauthProviders: [{
      providerName,
      oidcToken,
    }],
  });
}
```
