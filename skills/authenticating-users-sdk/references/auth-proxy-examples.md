# Auth Proxy Examples (No Backend Required)

These examples use Turnkey's managed Auth Proxy, so no backend server is needed. The SDK handles OTP delivery, OAuth verification, and sub-org management automatically.

## Complete Next.js App: Email OTP + Google + Passkey

### 1. Install dependencies

```bash
npm install @turnkey/react-wallet-kit next react react-dom
```

### 2. Environment variables (.env.local)

```env
NEXT_PUBLIC_ORGANIZATION_ID=your-org-id
NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID=your-auth-proxy-config-id
NEXT_PUBLIC_AUTH_PROXY_BASE_URL=https://authproxy.turnkey.com
NEXT_PUBLIC_BASE_URL=https://api.turnkey.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

### 3. Providers (app/providers.tsx)

```tsx
"use client";
import { TurnkeyProvider } from "@turnkey/react-wallet-kit";
import "@turnkey/react-wallet-kit/styles";
import { useRouter } from "next/navigation";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <TurnkeyProvider
      config={{
        organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
        authProxyConfigId: process.env.NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID!,
        authProxyUrl: process.env.NEXT_PUBLIC_AUTH_PROXY_BASE_URL!,
        auth: {
          methods: {
            emailOtpAuthEnabled: true,
            passkeyAuthEnabled: true,
            googleAuthEnabled: true,
          },
          autoRefreshSession: true,
        },
      }}
      callbacks={{
        onAuthenticationSuccess: () => router.push("/dashboard"),
        onError: (error) => console.error("Auth error:", error),
      }}
    >
      {children}
    </TurnkeyProvider>
  );
}
```

### 4. Root layout (app/layout.tsx)

```tsx
import { Providers } from "./providers";
import "@turnkey/react-wallet-kit/styles";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 5. Login page (app/page.tsx)

```tsx
"use client";
import { useTurnkey, AuthState, ClientState } from "@turnkey/react-wallet-kit";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { handleLogin, authState, clientState } = useTurnkey();
  const router = useRouter();

  useEffect(() => {
    if (authState === AuthState.Authenticated) {
      router.push("/dashboard");
    }
  }, [authState, router]);

  return (
    <main>
      <h1>Welcome</h1>
      <button
        onClick={handleLogin}
        disabled={clientState !== ClientState.Ready}
      >
        Sign in
      </button>
    </main>
  );
}
```

### 6. Dashboard (app/dashboard/page.tsx)

```tsx
"use client";
import { useTurnkey, AuthState } from "@turnkey/react-wallet-kit";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
  const { authState, session, wallets, logout } = useTurnkey();
  const router = useRouter();

  useEffect(() => {
    if (authState !== AuthState.Authenticated) {
      router.push("/");
    }
  }, [authState, router]);

  if (authState !== AuthState.Authenticated) return null;

  return (
    <main>
      <h1>Dashboard</h1>
      <p>Sub-org: {session?.organizationId}</p>
      <p>User: {session?.userId}</p>

      <h2>Wallets</h2>
      {wallets?.map((wallet) => (
        <div key={wallet.walletId}>
          <h3>{wallet.walletName}</h3>
          {wallet.accounts?.map((account) => (
            <p key={account.address}>
              {account.addressFormat}: {account.address}
            </p>
          ))}
        </div>
      ))}

      <button onClick={logout}>Logout</button>
    </main>
  );
}
```

## Wallet Auth (External Wallet Sign-In)

Enable users to sign in with MetaMask, Phantom, or other browser wallets.

### Providers with wallet auth

```tsx
"use client";
import { TurnkeyProvider } from "@turnkey/react-wallet-kit";
import "@turnkey/react-wallet-kit/styles";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TurnkeyProvider
      config={{
        organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
        authProxyConfigId: process.env.NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID!,
        authProxyUrl: process.env.NEXT_PUBLIC_AUTH_PROXY_BASE_URL!,
        auth: {
          methods: {
            walletAuthEnabled: true,
            emailOtpAuthEnabled: true, // optional fallback
          },
          autoRefreshSession: true,
        },
        walletConfig: {
          features: { auth: true },
          chains: {
            ethereum: { native: true },
            solana: { native: true },
          },
        },
      }}
    >
      {children}
    </TurnkeyProvider>
  );
}
```

The login page is identical to the email OTP example. `handleLogin()` shows a modal that auto-detects installed wallet extensions and lets users choose.

## SMS OTP

```tsx
auth: {
  methods: {
    phoneOtpAuthEnabled: true,
  },
  autoRefreshSession: true,
  createSuborgParams: {
    phoneOtpAuth: {
      userName: "SMS User",
      customWallet: {
        walletName: "Default Wallet",
        walletAccounts: [
          { curve: "CURVE_SECP256K1", pathFormat: "PATH_FORMAT_BIP32",
            path: "m/44'/60'/0'/0/0", addressFormat: "ADDRESS_FORMAT_ETHEREUM" },
          { curve: "CURVE_ED25519", pathFormat: "PATH_FORMAT_BIP32",
            path: "m/44'/501'/0'/0'", addressFormat: "ADDRESS_FORMAT_SOLANA" },
        ],
      },
    },
  },
},
```

## Adding Auth Methods Post-Login

After a user is authenticated, they can link additional auth methods:

```tsx
"use client";
import { useTurnkey } from "@turnkey/react-wallet-kit";
import { useState } from "react";

export function AccountSettings() {
  const { addPasskey, addEmail, addPhone } = useTurnkey();
  const [email, setEmail] = useState("");

  return (
    <div>
      <h2>Security Settings</h2>

      <button onClick={() => addPasskey()}>
        Add Passkey (Face ID / Touch ID)
      </button>

      <div>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Add backup email"
        />
        <button onClick={() => addEmail(email)}>Add Email</button>
      </div>

      <button onClick={() => addPhone("+15551234567")}>
        Add Phone Number
      </button>
    </div>
  );
}
```

## Magic Link (Email OTP Variant)

Magic links are a UX variation of email OTP. Instead of showing a code, the user clicks a link in their email that redirects back to your app with the code embedded in the URL.

To use magic links with Auth Proxy, configure the email template in the Turnkey Dashboard with a magic link URL pattern like `https://yourapp.com/auth?otpCode=%s`. The `%s` placeholder gets replaced with the OTP code.

For custom backend magic link implementation, see [custom-backend-examples.md](custom-backend-examples.md).
