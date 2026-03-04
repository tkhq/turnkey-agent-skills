# Raw Payload Signing Examples

Each example below is fully self-contained — it includes all imports and setup so you can use it directly.

## Sign a pre-hashed payload (HASH_FUNCTION_NO_OP)

Use when your payload is already hashed and Turnkey should sign it as-is.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const response = await client.signRawPayload({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
  payload: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
  hashFunction: "HASH_FUNCTION_NO_OP",
});

const { r, s, v } = response;
console.log("Signature:", { r, s, v });
```

## Sign raw EVM bytes (HASH_FUNCTION_KECCAK256)

Use when you have an un-hashed RLP-encoded EVM transaction and want Turnkey to Keccak256-hash it before signing.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const response = await client.signRawPayload({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
  payload: rlpEncodedTransactionHex,
  encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
  hashFunction: "HASH_FUNCTION_KECCAK256",
});
```

## Sign a Cosmos transaction (HASH_FUNCTION_SHA256)

Use when you have raw Cosmos transaction bytes and want Turnkey to SHA256-hash them before signing with a secp256k1 key.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

// Your serialized Cosmos transaction bytes (e.g., from TxRaw.encode(txRaw).finish())
const txBytes = new Uint8Array([/* serialized tx bytes */]);
const payload = Buffer.from(txBytes).toString("hex");

const response = await client.signRawPayload({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
  payload,
  encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
  hashFunction: "HASH_FUNCTION_SHA256",
});

const { r, s } = response;
// Cosmos expects compact signature: r || s (64 bytes)
const compactSignature = Buffer.from(r + s, "hex");
```

## Sign a UTF-8 message

Use when signing a plain text string (e.g., EIP-191 personal_sign without a library).

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const response = await client.signRawPayload({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
  payload: "Hello from Turnkey",
  encoding: "PAYLOAD_ENCODING_TEXT_UTF8",
  hashFunction: "HASH_FUNCTION_NO_OP",
});
```
