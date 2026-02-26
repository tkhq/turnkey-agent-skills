# Raw Payload Signing Examples

These examples assume `client` is already initialized via `@turnkey/sdk-server`. See the main SKILL.md for client setup.

## Sign a pre-hashed payload (HASH_FUNCTION_NO_OP)

Use when your payload is already hashed and Turnkey should sign it as-is.

```typescript
const response = await client.signRawPayload({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  parameters: {
    signWith: process.env.SIGN_WITH!,
    payload: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
    hashFunction: "HASH_FUNCTION_NO_OP",
  },
});

const { r, s, v } = response.activity.result.signRawPayloadResult!;
console.log("Signature:", { r, s, v });
```

## Sign raw EVM bytes (HASH_FUNCTION_KECCAK256)

Use when you have an un-hashed RLP-encoded EVM transaction and want Turnkey to Keccak256-hash it before signing.

```typescript
const response = await client.signRawPayload({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  parameters: {
    signWith: process.env.SIGN_WITH!,
    payload: rlpEncodedTransactionHex,
    encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
    hashFunction: "HASH_FUNCTION_KECCAK256",
  },
});
```

## Sign a Cosmos transaction (HASH_FUNCTION_SHA256)

Use when you have raw Cosmos transaction bytes and want Turnkey to SHA256-hash them before signing with a secp256k1 key.

```typescript
const txBytes = TxRaw.encode(txRaw).finish();
const payload = Buffer.from(txBytes).toString("hex");

const response = await client.signRawPayload({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  parameters: {
    signWith: process.env.SIGN_WITH!,
    payload,
    encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
    hashFunction: "HASH_FUNCTION_SHA256",
  },
});

const { r, s } = response.activity.result.signRawPayloadResult!;
// Cosmos expects compact signature: r || s (64 bytes)
const compactSignature = Buffer.from(r + s, "hex");
```

## Sign a UTF-8 message

Use when signing a plain text string (e.g., EIP-191 personal_sign without a library).

```typescript
const response = await client.signRawPayload({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  parameters: {
    signWith: process.env.SIGN_WITH!,
    payload: "Hello from Turnkey",
    encoding: "PAYLOAD_ENCODING_TEXT_UTF8",
    hashFunction: "HASH_FUNCTION_NO_OP",
  },
});
```
