# Raw Stamping Sub-Org Examples

These examples sign Turnkey activities directly using `node:crypto` and POST them with `fetch` — no Turnkey SDK dependencies required. Use this approach when bundle size, dependency hygiene, or constrained runtimes (small CLIs, edge functions) make `@turnkey/sdk-server` impractical.

Each example is fully self-contained.

## Create a sub-org with a single root user, single ETH wallet

```typescript
import crypto from "node:crypto";

function createStamper(publicKey: string, privateKey: string) {
  const privKeyBuf = Buffer.from(privateKey, "hex");
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.setPrivateKey(privKeyBuf);
  const uncompressedPub = ecdh.getPublicKey();

  const jwk = {
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

const json = (await resp.json()) as {
  activity?: {
    status?: string;
    result?: {
      createSubOrganizationResultV7?: {
        subOrganizationId: string;
        wallet?: { walletId: string; addresses: string[] };
        rootUserIds?: string[];
      };
    };
  };
};

const r = json.activity?.result?.createSubOrganizationResultV7;
console.log("Sub-Org ID:   ", r?.subOrganizationId);
console.log("Wallet ID:    ", r?.wallet?.walletId);
console.log("ETH Address:  ", r?.wallet?.addresses?.[0]);
console.log("Root User ID: ", r?.rootUserIds?.[0]);
```

## Polling pattern (when you cannot use `/submit/`)

The `/public/v1/submit/<activity>` endpoints in mono's coordinator block until the activity reaches a terminal state. If you submit through a different gateway that returns early with `ACTIVITY_STATUS_PENDING`, you must poll `get_activity` until completion.

```typescript
import crypto from "node:crypto";

function createStamper(publicKey: string, privateKey: string) {
  const privKeyBuf = Buffer.from(privateKey, "hex");
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.setPrivateKey(privKeyBuf);
  const uncompressedPub = ecdh.getPublicKey();

  const jwk = {
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

interface ActivityEnvelope {
  activity: {
    id: string;
    status: string;
    result?: Record<string, unknown>;
  };
}

async function tkPost(
  baseUrl: string,
  path: string,
  body: string,
  stamp: (b: string) => string,
): Promise<ActivityEnvelope> {
  const resp = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Stamp": stamp(body) },
    body,
  });
  if (!resp.ok) {
    throw new Error(`${resp.status} ${resp.statusText}: ${await resp.text()}`);
  }
  return (await resp.json()) as ActivityEnvelope;
}

async function pollUntilComplete(
  baseUrl: string,
  organizationId: string,
  activityId: string,
  stamp: (b: string) => string,
): Promise<ActivityEnvelope> {
  const terminal = new Set([
    "ACTIVITY_STATUS_COMPLETED",
    "ACTIVITY_STATUS_FAILED",
    "ACTIVITY_STATUS_REJECTED",
  ]);

  for (let attempt = 0; attempt < 30; attempt++) {
    const body = JSON.stringify({ organizationId, activityId });
    const env = await tkPost(baseUrl, "/public/v1/query/get_activity", body, stamp);
    if (terminal.has(env.activity.status)) return env;
    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error(`Activity ${activityId} did not reach terminal state in time`);
}

const baseUrl = process.env.TURNKEY_API_URL ?? "https://api.turnkey.com";
const orgId = process.env.TURNKEY_ORGANIZATION_ID!;
const stamp = createStamper(
  process.env.TURNKEY_API_PUBLIC_KEY!,
  process.env.TURNKEY_API_PRIVATE_KEY!
);

const submitBody = JSON.stringify({
  type: "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V7",
  timestampMs: Date.now().toString(),
  organizationId: orgId,
  parameters: {
    subOrganizationName: "Sub-Org With Polling",
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

const initial = await tkPost(
  baseUrl,
  "/public/v1/submit/create_sub_organization",
  submitBody,
  stamp,
);

const final =
  initial.activity.status === "ACTIVITY_STATUS_PENDING"
    ? await pollUntilComplete(baseUrl, orgId, initial.activity.id, stamp)
    : initial;

if (final.activity.status !== "ACTIVITY_STATUS_COMPLETED") {
  throw new Error(`Activity ended in status ${final.activity.status}`);
}

const result = final.activity.result as {
  createSubOrganizationResultV7?: {
    subOrganizationId: string;
    wallet?: { walletId: string; addresses: string[] };
    rootUserIds?: string[];
  };
};

console.log("Sub-Org ID:", result.createSubOrganizationResultV7?.subOrganizationId);
```
