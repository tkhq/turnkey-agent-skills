# Raw Payload Signing Examples

Complete HTTP API examples for signing raw payloads. Use sign_raw_payload when you need chain-agnostic signing or when the target chain does not have a dedicated transaction type. Use sign_raw_payloads to batch-sign multiple payloads with the same key in a single request.

**Base URL:** `https://api.turnkey.com`

## Sign UTF-8 Text with SHA-256

General-purpose signing of a human-readable message using secp256k1 (ECDSA).

`POST /public/v1/submit/sign_raw_payload`

```json
{
  "signWith": "0x1234abcd5678ef901234abcd5678ef901234abcd",
  "payload": "Hello, Turnkey!",
  "encoding": "PAYLOAD_ENCODING_TEXT_UTF8",
  "hashFunction": "HASH_FUNCTION_SHA256"
}
```

**Response format:**

```json
{
  "activity": {
    "result": {
      "signRawPayloadResult": {
        "r": "a1b2c3...",
        "s": "d4e5f6...",
        "v": "00"
      }
    }
  }
}
```

The response contains the ECDSA signature components (r, s, v). Reassemble them into the format required by your use case.

## Sign Hex Payload with Keccak-256

For Ethereum-style message signing where the payload is already hex-encoded.

`POST /public/v1/submit/sign_raw_payload`

```json
{
  "signWith": "0x1234abcd5678ef901234abcd5678ef901234abcd",
  "payload": "48656c6c6f",
  "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
  "hashFunction": "HASH_FUNCTION_KECCAK256"
}
```

Use HASH_FUNCTION_KECCAK256 when the consuming protocol expects Ethereum-compatible hashing (keccak256).

## Sign with HASH_FUNCTION_NOT_APPLICABLE (Ed25519)

For Ed25519 chains like Sui and TON, set the hash function to HASH_FUNCTION_NOT_APPLICABLE. Ed25519 signs the payload directly without pre-hashing.

### Sui Example

Hash the transaction bytes with blake2b externally before passing to Turnkey. The payload sent to Turnkey should be the blake2b digest in hex.

`POST /public/v1/submit/sign_raw_payload`

```json
{
  "signWith": "7Hk2VMKXGT2Rbhf5JVbMQ9ysNBqKRfGLHs8gZSBw2k34",
  "payload": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6abcd",
  "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
  "hashFunction": "HASH_FUNCTION_NOT_APPLICABLE"
}
```

### TON Example

Build a TON BOC (Bag of Cells) externally, hash it with SHA-256, then pass the hash to Turnkey for signing.

`POST /public/v1/submit/sign_raw_payload`

```json
{
  "signWith": "7Hk2VMKXGT2Rbhf5JVbMQ9ysNBqKRfGLHs8gZSBw2k34",
  "payload": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
  "hashFunction": "HASH_FUNCTION_NOT_APPLICABLE"
}
```

## Sign with HASH_FUNCTION_NO_OP (Bitcoin Taproot / Schnorr)

For Bitcoin Taproot signing, the sighash must be pre-hashed with tagged SHA-256 before passing to Turnkey. Set the hash function to HASH_FUNCTION_NO_OP so Turnkey signs the bytes directly without any additional hashing.

`POST /public/v1/submit/sign_raw_payload`

```json
{
  "signWith": "bc1pxyz...taproot_address",
  "payload": "c1e7e3b2a4f6d8901234abcdef567890abcdef1234567890abcdef1234567890",
  "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
  "hashFunction": "HASH_FUNCTION_NO_OP"
}
```

The payload must be exactly 32 bytes (64 hex characters) representing the tagged sighash. Turnkey produces a Schnorr signature over these bytes.

## Cosmos Example

For Cosmos chains, hash the SignDoc bytes with SHA-256 by setting HASH_FUNCTION_SHA256. Turnkey handles the hashing.

`POST /public/v1/submit/sign_raw_payload`

```json
{
  "signWith": "cosmos1abc123def456...",
  "payload": "0a93010a90010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e64...",
  "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
  "hashFunction": "HASH_FUNCTION_SHA256"
}
```

## Batch Signing: sign_raw_payloads

When you need to sign multiple payloads with the same key and parameters, use sign_raw_payloads instead of making multiple sign_raw_payload calls. This is more efficient and uses a single activity.

`POST /public/v1/submit/sign_raw_payloads`

### Batch Ethereum Messages

Sign multiple Ethereum messages in one request:

```json
{
  "signWith": "0x1234abcd5678ef901234abcd5678ef901234abcd",
  "payloads": [
    "48656c6c6f2c20576f726c6421",
    "5369676e207468697320746f6f",
    "416e64207468697320617320776565"
  ],
  "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
  "hashFunction": "HASH_FUNCTION_KECCAK256"
}
```

**Response format:**

```json
{
  "activity": {
    "result": {
      "signRawPayloadsResult": {
        "signatures": [
          { "r": "a1b2c3...", "s": "d4e5f6...", "v": "00" },
          { "r": "f7e8d9...", "s": "c0b1a2...", "v": "01" },
          { "r": "112233...", "s": "445566...", "v": "00" }
        ]
      }
    }
  }
}
```

Signatures are returned in the same order as the input payloads. Each signature has the same `{r, s, v}` structure as a single sign_raw_payload response.

### Batch Cosmos Signing

Sign multiple Cosmos transactions with the same key:

```json
{
  "signWith": "cosmos1abc123def456...",
  "payloads": [
    "0a93010a90010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e64...",
    "0a94010a91010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e64..."
  ],
  "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
  "hashFunction": "HASH_FUNCTION_SHA256"
}
```

### When to Use Batch Signing

- Signing multiple messages or transactions with the same key in a workflow
- Processing a queue of pending signatures
- Multi-message protocols that require several signatures from one key
- Any scenario where you would otherwise loop over sign_raw_payload

The batch endpoint uses a single activity, so it counts as one operation for rate limiting and activity tracking purposes.

## Supported Encodings

| Encoding | Value | Description |
|----------|-------|-------------|
| UTF-8 text | PAYLOAD_ENCODING_TEXT_UTF8 | Human-readable string payloads |
| Hexadecimal | PAYLOAD_ENCODING_HEXADECIMAL | Pre-serialized binary data in hex |
| EIP-712 | PAYLOAD_ENCODING_EIP712 | Typed structured data (Ethereum EIP-712) |
| EIP-7702 | PAYLOAD_ENCODING_EIP7702_AUTHORIZATION | EIP-7702 authorization tuples |

## Notes

- The `signWith` value can be a wallet account address, a private key address, or a private key ID.
- For Ed25519 keys (Solana, Sui, TON), always use HASH_FUNCTION_NOT_APPLICABLE.
- For Schnorr keys (Bitcoin Taproot), always use HASH_FUNCTION_NO_OP and pre-hash externally.
- The response for sign_raw_payload returns (r, s, v) components. For Ed25519, the signature is returned as a single concatenated value in the `r` and `s` fields.
- The response for sign_raw_payloads returns an array of (r, s, v) objects in the `signatures` field.
- Reassemble the signature components into the format expected by the target chain before broadcasting.
