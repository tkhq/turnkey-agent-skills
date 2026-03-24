# Auth Proxy API Reference

The Auth Proxy (`https://authproxy.turnkey.com`) signs and forwards auth requests to Turnkey on your behalf so you don't need a backend.

## Setup

1. Go to **Turnkey Dashboard** > **AUTH** section
2. Toggle **Auth Proxy** ON (creates a proxy user and encrypted API key)
3. Add your frontend domain to **Allowed Origins** (defaults to `*` for dev)
4. Copy the **Auth Proxy Config ID** for your environment variables
5. Configure email/SMS templates and session expiration as needed

## Headers

All requests require:
```
X-Auth-Proxy-Config-Id: <your-auth-proxy-config-id>
```

Requests must originate from a whitelisted origin (CORS enforced).

## Endpoints

### POST /v1/signup

Create a sub-organization (new user onboarding). Optionally creates a wallet.

```json
// Request
{
  "userName": "newuser@example.com",
  "organizationName": "Example Org",
  "userEmail": "newuser@example.com",
  "apiKeys": [],
  "authenticators": [],
  "oauthProviders": [],
  "wallet": {
    "path": "m/44'/0'/0'/0/0",
    "curve": "CURVE_TYPE_ED25519"
  }
}

// Response
{ "organizationId": "suborg-abc123" }
```

### POST /v1/otp_init

Send an OTP (email or SMS).

```json
// Request
{ "otpType": "OTP_TYPE_SMS", "contact": "+12265550123" }
// or
{ "otpType": "OTP_TYPE_EMAIL", "contact": "user@example.com" }

// Response
{ "otpId": "otp-xyz789" }
```

### POST /v1/otp_verify

Verify the OTP code.

```json
// Request
{ "otpId": "otp-xyz789", "otpCode": "123456", "public_key": "02ab..." }

// Response
{ "verificationToken": "verify-token-abc" }
```

### POST /v1/otp_login

Complete OTP login with verification token.

```json
// Request
{
  "verificationToken": "verify-token-abc",
  "publicKey": "02ab...",
  "client_signature": "30453..."
}

// Response
{ "session": "eyJhbGciOiJFUzI1NiIs..." }
```

### POST /v1/oauth2_authenticate

Exchange an OAuth2 auth code for a Turnkey OIDC token. Used for providers like Discord, X/Twitter that need server-side code exchange.

```json
// Request
{
  "provider": "OAUTH2_PROVIDER_DISCORD",
  "authCode": "your_oauth2_auth_code",
  "redirectUri": "https://yourapp.com/callback",
  "codeVerifier": "string-used-for-pkce",
  "nonce": "sha256(publicKey)",
  "clientId": "your-oauth2-client-id"
}

// Response
{ "oidcToken": "eyJhbGciOiJSUzI1NiIs..." }
```

### POST /v1/oauth_login

Login with an OIDC token (from Google, Apple, or the oauth2_authenticate endpoint above).

```json
// Request
{
  "oidcToken": "eyJhbGciOiJSUzI1NiIs...",
  "publicKey": "02ab...",
  "invalidateExisting": false
}

// Response
{ "session": "eyJhbGciOiJFUzI1NiIs..." }
```

### POST /v1/account

Look up a sub-org by email, phone, credential ID, or OIDC token.

```json
// Request
{ "filterType": "EMAIL", "filterValue": "user@example.com" }

// Response
{ "organizationId": "suborg-abc123" }
```

Filter types: `EMAIL`, `PHONE`, `CREDENTIAL_ID`, `OIDC_TOKEN`, `PUBLIC_KEY`

### POST /v1/wallet_kit_config

Return which auth methods are enabled for the calling organization.

```json
// Request
{}

// Response
{
  "enabledProviders": ["google", "facebook", "apple", "email", "sms", "passkey", "wallet"],
  "sessionExpirationSeconds": "1800",
  "organizationId": "org-abc123"
}
```

## Security Model

- Proxy keys are HPKE-encrypted inside Turnkey's enclave, decrypted per-request only in memory
- The proxy communicates with Turnkey's public API only (strict separation from core backend)
- The proxy cannot log in users without their participation (OTP code entry, OAuth consent)
- The proxy cannot access funds or perform non-auth org operations
