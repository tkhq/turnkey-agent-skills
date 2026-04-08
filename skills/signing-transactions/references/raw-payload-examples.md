# Raw Payload Signing Examples

Use `sign_raw_payload` to sign arbitrary bytes with a Turnkey-stored key. This is the universal fallback for chains without a dedicated `TRANSACTION_TYPE_*` (Cosmos, Aptos, Sui, TON, Tron, etc.) and for custom signing schemes.

You are responsible for serialization, hashing (or choosing the right hash function), and broadcasting. Turnkey just signs.

## SDK setup

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();
```

## API setup

All examples below can also be called via the HTTP API directly:

`POST https://api.turnkey.com/public/v1/submit/sign_raw_payload`

The request body uses the activity envelope: `{"type": "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2", "timestampMs": "<ms>", "organizationId": "<ORG_ID>", "parameters": { ... }}`. The `parameters` object matches the fields shown in the SDK examples below.

## Encoding and hash function reference

**Encoding options:**

| `encoding` | Use when |
|---|---|
| `PAYLOAD_ENCODING_HEXADECIMAL` | Payload is a hex string |
| `PAYLOAD_ENCODING_TEXT_UTF8` | Payload is a plain UTF-8 string |

**Hash function options:**

| `hashFunction` | Use when |
|---|---|
| `HASH_FUNCTION_NO_OP` | Payload is already hashed — Turnkey signs as-is |
| `HASH_FUNCTION_KECCAK256` | EVM — raw bytes; Turnkey hashes with Keccak256 then signs |
| `HASH_FUNCTION_SHA256` | Bitcoin, Cosmos, and other SHA256 chains |
| `HASH_FUNCTION_NOT_APPLICABLE` | Ed25519 keys (Solana, some Cosmos chains) — Ed25519 handles hashing internally |

## Sign a pre-hashed payload

Use when your payload is already hashed (e.g., you computed the hash externally) and Turnkey should sign it as-is.

```typescript
const response = await client.signRawPayload({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
  payload: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
  hashFunction: "HASH_FUNCTION_NO_OP",
});

const { r, s, v } = response;
console.log("Signature:", { r, s, v });
```

## Sign raw EVM bytes (Keccak256)

Use when you have un-hashed RLP-encoded EVM transaction bytes and want Turnkey to Keccak256-hash before signing.

```typescript
const rlpEncodedTransactionHex = "f86c..."; // your RLP-encoded tx

const response = await client.signRawPayload({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
  payload: rlpEncodedTransactionHex,
  encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
  hashFunction: "HASH_FUNCTION_KECCAK256",
});
```

## Sign a Cosmos transaction (SHA256)

Use when you have serialized Cosmos transaction bytes and want Turnkey to SHA256-hash before signing with a secp256k1 key.

```typescript
// Serialized Cosmos transaction bytes (e.g., from TxRaw.encode(txRaw).finish())
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

Use when signing a plain text string.

```typescript
const response = await client.signRawPayload({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
  payload: "Hello from Turnkey",
  encoding: "PAYLOAD_ENCODING_TEXT_UTF8",
  hashFunction: "HASH_FUNCTION_NO_OP",
});
```

## Batch signing (multiple payloads, same key)

`sign_raw_payloads` signs multiple payloads in a single request. Each payload produces its own signature.

```typescript
const response = await client.signRawPayloads({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
  payloads: [
    "48656c6c6f",
    "576f726c64"
  ],
  encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
  hashFunction: "HASH_FUNCTION_SHA256",
});

// response.signatures is an array of {r, s, v} objects, one per payload in order
for (const sig of response.signatures) {
  console.log("r:", sig.r, "s:", sig.s, "v:", sig.v);
}
```

Via the HTTP API: `POST https://api.turnkey.com/public/v1/submit/sign_raw_payloads`

## Choosing the right hash function by chain

| Chain | Key curve | Hash function | Notes |
|---|---|---|---|
| Ethereum / EVM | secp256k1 | `HASH_FUNCTION_KECCAK256` (raw bytes) or `NO_OP` (pre-hashed) | Use Keccak256 if you provide the un-hashed RLP; use NO_OP if you hash externally |
| Bitcoin | secp256k1 | `HASH_FUNCTION_NO_OP` | Always pre-hash (double SHA256 for legacy, BIP-340 tagged hash for Taproot) |
| Cosmos (secp256k1) | secp256k1 | `HASH_FUNCTION_SHA256` | Turnkey SHA256-hashes the sign bytes |
| Cosmos (Ed25519) | ed25519 | `HASH_FUNCTION_NOT_APPLICABLE` | Ed25519 handles hashing internally |
| Solana | ed25519 | `HASH_FUNCTION_NOT_APPLICABLE` | Ed25519 handles hashing internally |
| Aptos | ed25519 | `HASH_FUNCTION_NOT_APPLICABLE` | Ed25519 handles hashing internally |
| Sui | ed25519 | `HASH_FUNCTION_NOT_APPLICABLE` | Ed25519 handles hashing internally |
| TON | ed25519 | `HASH_FUNCTION_NOT_APPLICABLE` | Ed25519 handles hashing internally |
| Tron | secp256k1 | `HASH_FUNCTION_SHA256` | Similar to Cosmos pattern |

## Troubleshooting

**Wrong hash function**
Using `HASH_FUNCTION_KECCAK256` on a pre-hashed payload will double-hash it. Use `HASH_FUNCTION_NO_OP` if you provide a pre-hashed input.

**Invalid payload encoding**
A payload like `"hello"` with `PAYLOAD_ENCODING_HEXADECIMAL` will fail — it's not valid hex. Either hex-encode it first (`Buffer.from("hello").toString("hex")`) or use `PAYLOAD_ENCODING_TEXT_UTF8`.

**Ed25519 key with SHA256 hash function**
Ed25519 keys require `HASH_FUNCTION_NOT_APPLICABLE`. Using `SHA256` or `KECCAK256` with an Ed25519 key will fail.

**`v` field is empty for Ed25519**
Ed25519 signatures don't have a recovery parameter. The `v` field will be empty — this is expected.
