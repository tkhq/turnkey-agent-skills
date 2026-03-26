---
name: stamping-api
description: "Constructs Turnkey API request stamps (X-Stamp header) manually without the Turnkey CLI. Covers P-256 ECDSA signing, DER hex encoding, stamp JSON construction, and Base64URL encoding for API key stamps. Also covers WebAuthn stamp format (X-Stamp-Webauthn). Use when asked to 'construct an X-Stamp header', 'build a Turnkey API stamp manually', 'sign a Turnkey API request without the CLI', 'authenticate with Turnkey API without SDK', 'create a stamp for Turnkey', 'manually sign a Turnkey request', 'debug a Turnkey stamp', 'fix X-Stamp authentication error', or 'build Turnkey auth header'. Do NOT use for creating API keys (use managing-users-api), signing blockchain transactions (use signing-transactions-api), or managing wallets (use managing-wallets-api)."
license: Apache-2.0
compatibility: "Requires a P-256 key pair registered with Turnkey. See managing-users-api for API key generation and registration."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["authentication", "stamp", "x-stamp", "p256", "ecdsa", "api-key", "webauthn"]
---

# Constructing API Stamps

## Quick Start

Construct the `X-Stamp` header by ECDSA-signing the JSON request body with your P-256 private key, then hex-encoding the DER signature, wrapping it in a stamp JSON object, and Base64URL-encoding the result.

## Prerequisites

Requires a P-256 key pair registered with your Turnkey organization. Use the `managing-users-api` skill to generate and register API keys.

You need:
- **Private key**: P-256 private key (hex-encoded or PEM format) for signing
- **Public key**: The corresponding hex-encoded compressed public key registered with Turnkey

Environment variables used in examples:
- `TURNKEY_API_PRIVATE_KEY`: Hex-encoded P-256 private key
- `TURNKEY_API_PUBLIC_KEY`: Hex-encoded compressed public key
- `TURNKEY_ORGANIZATION_ID`: Your organization UUID

## How API Key Stamps Work

Every Turnkey API request must include a stamp proving the caller holds a registered API key. The stamp construction pipeline:

1. Take the JSON POST body as a UTF-8 byte string (the exact bytes sent in the HTTP request)
2. ECDSA-sign it using the P-256 private key with a SHA-256 digest, producing a DER-encoded signature
3. Hex-encode the DER signature (lowercase)
4. Build the stamp JSON:
   ```json
   {
     "publicKey": "<hex-compressed-public-key>",
     "signature": "<hex-der-signature>",
     "scheme": "SIGNATURE_SCHEME_TK_API_P256"
   }
   ```
5. Base64URL-encode the stamp JSON (no padding, strip trailing `=` characters)
6. Attach the result as the `X-Stamp` HTTP header

The `publicKey` field must be the hex-encoded compressed public key that was registered with Turnkey via `create_api_keys` or at user creation time.

### Shell Example (Quick Reference)

```bash
# Sign the body with your P-256 private key (PEM format)
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -sign private-key.pem | xxd -p -c 256)

# Build stamp JSON
STAMP_JSON=$(jq -cn \
  --arg pk "$TURNKEY_API_PUBLIC_KEY" \
  --arg sig "$SIGNATURE" \
  '{publicKey: $pk, signature: $sig, scheme: "SIGNATURE_SCHEME_TK_API_P256"}')

# Base64URL encode (no padding)
STAMP=$(echo -n "$STAMP_JSON" | base64 | tr '+/' '-_' | tr -d '=')

# Use it
curl -X POST -d "$BODY" -H "X-Stamp: $STAMP" "https://api.turnkey.com/public/v1/query/whoami"
```

For the full shell walkthrough including hex-to-PEM key conversion, see [references/shell-stamp-example.md](references/shell-stamp-example.md).

### Programmatic Stamp Construction

Turnkey provides SDK stamper packages that handle stamp construction automatically:

| Language | Package |
|----------|---------|
| JS/TS | `@turnkey/api-key-stamper` |
| Go | `github.com/tkhq/go-sdk` |

To construct stamps manually in JS/TS, Python, or Go without the SDK, see [references/programmatic-stamp-examples.md](references/programmatic-stamp-examples.md).

## WebAuthn Stamps

WebAuthn stamps use a different header (`X-Stamp-Webauthn`) and a different construction flow.

**Construction steps:**
1. SHA-256 hash the POST body bytes (JSON-encoded) to produce a hex string
2. Use that hex string as the WebAuthn challenge (UTF-8 encoded as bytes)
3. Perform a WebAuthn assertion with the challenge
4. Build the stamp JSON:
   ```json
   {
     "credentialId": "<webauthn-credential-id>",
     "authenticatorData": "<authenticator-data>",
     "clientDataJson": "<client-data-json>",
     "signature": "<webauthn-signature>"
   }
   ```
5. Attach as the `X-Stamp-Webauthn` header (plain JSON, not Base64URL-encoded)

WebAuthn stamps are typically constructed by browser APIs or React Native passkey libraries, not manually.

## Supported Stamp Schemes

| Scheme | Header | Key Type | Encoding |
|--------|--------|----------|----------|
| `SIGNATURE_SCHEME_TK_API_P256` | `X-Stamp` | P-256 (ECDSA) | Base64URL JSON |
| `SIGNATURE_SCHEME_TK_API_SECP256K1` | `X-Stamp` | secp256k1 (ECDSA) | Base64URL JSON |
| `SIGNATURE_SCHEME_TK_API_ED25519` | `X-Stamp` | Ed25519 | Base64URL JSON |

The construction process is identical for all three API key schemes. Only the key type and `scheme` string differ. P-256 is the default and recommended curve for API keys.

## Debugging Stamps

**Common errors:**
- **"Invalid stamp"**: The public key in the stamp does not match any registered API key for the organization
- **"Invalid signature"**: The body was modified after signing (whitespace changes, field reordering, encoding differences)
- **Signature verification failure**: Wrong curve, wrong hash algorithm, or incorrect DER encoding

**Debugging checklist:**
1. Verify the signed bytes are the exact request body bytes (no pretty-printing, no trailing newline)
2. Verify the public key in the stamp matches the key registered with Turnkey
3. Verify the signature is hex-encoded DER format (not raw r||s concatenation)
4. Verify Base64URL encoding uses `-_` instead of `+/` and has no `=` padding
5. Verify `scheme` matches the key curve you are using
6. Test with a known-good request (`POST /public/v1/query/whoami` with `{"organizationId": "<ORG_ID>"}`) before debugging complex requests

## Rules

- Always sign the exact bytes of the JSON body as sent over the wire
- Never pretty-print or reformat the body after signing
- Use lowercase hex encoding for both the public key and signature
- Strip `=` padding characters from Base64URL encoding
- Never log or expose the private key in output, commits, or error messages
- The `timestampMs` field in activity request bodies must be a recent timestamp; stale timestamps cause rejection

## Related Skills

- `managing-users-api` for API key generation, registration, and rotation
- `signing-transactions-api` for signing blockchain transactions (different from request stamping)
- `getting-started-workflow` for end-to-end onboarding including credential setup
