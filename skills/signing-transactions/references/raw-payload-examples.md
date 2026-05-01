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
| `PAYLOAD_ENCODING_EIP712` | Payload is a JSON EIP-712 typed data object |
| `PAYLOAD_ENCODING_EIP7702_AUTHORIZATION` | Payload is a JSON EIP-7702 authorization (delegate contract to an EOA) |

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

Use when signing a plain text string with a secp256k1 key. Pick the hash function from the curve/ecosystem table below — `HASH_FUNCTION_NO_OP` will fail here because secp256k1 requires a 32-byte digest and `"Hello from Turnkey"` is only 18 bytes.

```typescript
const response = await client.signRawPayload({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
  payload: "Hello from Turnkey",
  encoding: "PAYLOAD_ENCODING_TEXT_UTF8",
  hashFunction: "HASH_FUNCTION_KECCAK256",
});
```

This signs `keccak256(utf8_bytes("Hello from Turnkey"))`. It is **not** an Ethereum `personal_sign` / EIP-191 signature — `personal_sign` prepends `"\x19Ethereum Signed Message:\n<len>"` before hashing. If you need an EIP-191-compatible signature that `ecrecover` will verify, either prepend that prefix to the payload yourself before sending, or use the SDK's higher-level `signMessage()` helper, which handles the prefix automatically. For ed25519 keys (Solana, Aptos, Sui, TON), use `HASH_FUNCTION_NOT_APPLICABLE` instead.

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
const signatures = response.signatures ?? [];
for (const sig of signatures) {
  console.log("r:", sig.r, "s:", sig.s, "v:", sig.v);
}
```

Via the HTTP API: `POST https://api.turnkey.com/public/v1/submit/sign_raw_payloads`

## Sign an EIP-7702 authorization

EIP-7702 lets an EOA delegate to a smart contract. The authorization is a JSON object signed via `sign_raw_payload` with `PAYLOAD_ENCODING_EIP7702_AUTHORIZATION`.

```typescript
const response = await client.signRawPayload({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
  payload: JSON.stringify({
    address: "0xDelegationContractAddress",
    chainId: 1,
    nonce: 0,
  }),
  encoding: "PAYLOAD_ENCODING_EIP7702_AUTHORIZATION",
  hashFunction: "HASH_FUNCTION_NO_OP",
});

const { r, s, v } = response;
```

The signed authorization is then included in a Type 4 EVM transaction's `authorizationList`. Use the `managing-policies` skill to write policies restricting which contracts the agent can delegate to via `eth.eip_7702_authorization.address`.

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

**Payload too short for `HASH_FUNCTION_NO_OP`**
`NO_OP` passes bytes straight to the signer, which requires a 32-byte digest for secp256k1. Signing a UTF-8 string or non-32-byte hex with `NO_OP` returns `Turnkey error 3: expected a 32-bytes-long digest`. Either pre-hash to 32 bytes, or pick a hash function (`KECCAK256` for EVM, `SHA256` for Bitcoin/Cosmos) and let Turnkey hash for you.

**Invalid payload encoding**
A payload like `"hello"` with `PAYLOAD_ENCODING_HEXADECIMAL` will fail — it's not valid hex. Either hex-encode it first (`Buffer.from("hello").toString("hex")`) or use `PAYLOAD_ENCODING_TEXT_UTF8`.

**Ed25519 key with SHA256 hash function**
Ed25519 keys require `HASH_FUNCTION_NOT_APPLICABLE`. Using `SHA256` or `KECCAK256` with an Ed25519 key will fail.

**`v` field for Ed25519**
Ed25519 signatures don't have a recovery parameter. The `v` field will be `"00"` — this is expected and can be ignored for Ed25519.
