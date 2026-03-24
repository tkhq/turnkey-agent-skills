# Raw Payload Signing Examples

Complete HTTP API examples for signing raw payloads. Use signRawPayload when you need chain-agnostic signing or when the target chain does not have a dedicated transaction type.

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

## Notes

- The `signWith` value can be a wallet account address, a private key address, or a private key ID.
- For Ed25519 keys (Solana, Sui, TON), always use HASH_FUNCTION_NOT_APPLICABLE.
- For Schnorr keys (Bitcoin Taproot), always use HASH_FUNCTION_NO_OP and pre-hash externally.
- The response for signRawPayload returns (r, s, v) components. For Ed25519, the signature is returned as a single concatenated value in the `r` and `s` fields.
- Reassemble the signature components into the format expected by the target chain before broadcasting.
