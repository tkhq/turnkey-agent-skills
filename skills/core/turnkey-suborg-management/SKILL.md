---
name: turnkey-suborg-management
description: 'Creates and manages Turnkey sub-organizations (child orgs under a parent) with root users, API keys, and an initial wallet. Use when an agent needs to provision a fresh sub-org for a new end-user, tenant, or isolated workspace. Triggers on: "create a sub-org", "create a sub-organization", "create a child organization", "provision a new user org", "spin up a tenant", "onboard a new end-user".'
compatibility: "Requires Node.js. Recommended: @turnkey/sdk-server. Lower-level: raw fetch + node:crypto stamping (zero deps). Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars."
depends_on: []
metadata:
  version: "1.0.0"
  tags: ["turnkey", "sub-organization", "suborg", "tenant", "onboarding", "multi-tenant", "wallet"]
  sdk_versions:
    "@turnkey/sdk-server": "^5.1.0"
---

# Turnkey Sub-Organization Management

## Overview

Use this skill to:
- Create a sub-organization under a parent Turnkey org
- Attach root users with their own API keys, authenticators, or OAuth providers
- Create an initial wallet inside the sub-org in a single atomic activity

A **sub-organization** is an isolated child organization under a parent. Each end-user, tenant, or agent typically gets its own sub-org so its keys, policies, and quorum are scoped independently. The parent org's API key creates the sub-org but does not gain implicit access to its keys — only the sub-org's own root users (or delegated users) can sign with the sub-org's wallets.

This skill creates a sub-org with a single root user, the parent's API key attached to that root user, and one HD wallet with an Ethereum account. Adapt the parameters for additional accounts, multiple root users, or different auth methods.

## Rules

- **Use the latest `CREATE_SUB_ORGANIZATION` activity version** the SDK supports (currently V7). Older versions are accepted by the API but have fewer parameters and are not recommended for new code.
- **Sub-org root users are independent.** Adding the parent's API key to a sub-org root user is a deliberate choice for delegated control. For end-user sub-orgs where the user holds their own key, omit the parent's `apiKeys` and supply the user's own `authenticators` or `oauthProviders` instead.

## Prerequisites

```bash
# Recommended higher-level client
npm install @turnkey/sdk-server

# No deps needed for the raw-stamping approach (uses node:crypto)
```

## Environment Variables

```env
TURNKEY_API_PUBLIC_KEY=    # Parent org API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # Parent org API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Parent organization UUID (the sub-org will be created under this)
TURNKEY_API_URL=           # Optional. Defaults to https://api.turnkey.com. Set to http://localhost:8081 for a local mono coordinator.
```

The parent org's API key signs the `CreateSubOrganization` activity. The new sub-org's `subOrganizationId` is returned in the response — store it; you will need it to scope future activities against the sub-org.

---

## Option A — `@turnkey/sdk-server` (recommended)

### Setup

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: process.env.TURNKEY_API_URL ?? "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();
```

### Create a sub-organization

```typescript
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

`@turnkey/sdk-server` polls the activity to completion automatically. The returned `result` is the unwrapped `CreateSubOrganizationResultV7`.

For more variations (multiple wallets, additional auth methods, multi-quorum root users), see `references/sdk-examples.md`.

---

## Option B — raw stamping (`node:crypto` + `fetch`)

Use this when you cannot or do not want to add `@turnkey/sdk-server` as a dependency — for example, in a small CLI tool, a serverless function with strict bundle limits, or a script that runs in a constrained environment. This approach signs the activity body manually using a P-256 ECDSA stamp and posts it directly to the public API.

### Setup

```typescript
import crypto from "node:crypto";

function createStamper(publicKey: string, privateKey: string) {
  const privKeyBuf = Buffer.from(privateKey, "hex");
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.setPrivateKey(privKeyBuf);
  const uncompressedPub = ecdh.getPublicKey();

  const jwk: crypto.JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: privKeyBuf.toString("base64url"),
    x: uncompressedPub.subarray(1, 33).toString("base64url"),
    y: uncompressedPub.subarray(33, 65).toString("base64url"),
  };
  const privKeyObj = crypto.createPrivateKey({ key: jwk, format: "jwk" });

  return function stamp(body: string): string {
    const sign = crypto.createSign("SHA256");
    sign.update(body);
    sign.end();
    const derSignature = sign.sign(privKeyObj);
    const stampObj = {
      publicKey,
      signature: derSignature.toString("hex"),
      scheme: "SIGNATURE_SCHEME_TK_API_P256",
    };
    return Buffer.from(JSON.stringify(stampObj)).toString("base64url");
  };
}
```

### Submit the activity

```typescript
const baseUrl = process.env.TURNKEY_API_URL ?? "https://api.turnkey.com";
const stamp = createStamper(
  process.env.TURNKEY_API_PUBLIC_KEY!,
  process.env.TURNKEY_API_PRIVATE_KEY!
);

const body = JSON.stringify({
  type: "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V7",
  timestampMs: Date.now().toString(),
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  parameters: {
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
  },
});

const resp = await fetch(`${baseUrl}/public/v1/submit/create_sub_organization`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Stamp": stamp(body) },
  body,
});

if (!resp.ok) {
  throw new Error(`${resp.status} ${resp.statusText}: ${await resp.text()}`);
}

const json = await resp.json();
const r = json.activity?.result?.createSubOrganizationResultV7;
console.log("Sub-Org ID:   ", r?.subOrganizationId);
console.log("Wallet ID:    ", r?.wallet?.walletId);
console.log("ETH Address:  ", r?.wallet?.addresses?.[0]);
console.log("Root User ID: ", r?.rootUserIds?.[0]);
```

The `/submit/` endpoint returns once the activity reaches a terminal state — the response contains the full activity envelope. If you submit through `/public/v1/`-style endpoints that return early (`ACTIVITY_STATUS_PENDING`), you must poll `/public/v1/query/get_activity` until the status is `ACTIVITY_STATUS_COMPLETED`.

For polling logic and additional variations, see `references/raw-stamping-examples.md`.

---

## Troubleshooting

**`403 Forbidden`**
The parent API key is not authorized to create sub-orgs in this organization. Confirm `TURNKEY_API_PUBLIC_KEY` corresponds to a user with the `CREATE_SUB_ORGANIZATION` permission in the parent org.

**`Activity rejected` (`ACTIVITY_STATUS_REJECTED`)**
A policy in the parent org denied sub-org creation. Inspect the policies in the Turnkey console.

**Activity completes but `wallet` is `undefined` in the response**
You omitted the `wallet` parameter from the activity body. Sub-orgs are created without a wallet by default; pass a `wallet` object if you want one created atomically.

**`subOrganizationId` collisions or surprising org parents**
Sub-orgs are created under whichever `organizationId` you pass in the activity body. If you accidentally pass an existing sub-org's ID as the parent, the new sub-org will nest under it. Always pass the *parent* org's ID — typically `TURNKEY_ORGANIZATION_ID`.

**Stamp validation failure (raw stamping path)**
Common causes: hex-decoding the wrong key, signing the wrong byte sequence (must be the exact request body bytes), or using a non-P-256 curve. Confirm your key is P-256 and the body bytes match what's POSTed.

**Local coordinator returns 404 on `/public/v1/submit/create_sub_organization`**
The local mono coordinator path layout differs in some configurations. Try `/public/v1/submit/create_sub_organization` (matches prod) — the mono coordinator typically mounts the same paths. If still 404, confirm `TURNKEY_API_URL` points to the gateway port (`8081`), not the gRPC port (`8080`).

## Related Skills

- `skills/core/turnkey-wallet-management/SKILL.md` — manage wallets *inside* the new sub-org once created
- `skills/auth/turnkey-otp-auth/SKILL.md` — alternative onboarding flow that creates sub-orgs server-side as part of OTP login
- `skills/core/turnkey-transaction-signing/SKILL.md` — signing model used when transacting against keys held in the new sub-org
