# Shell Stamp Construction

Complete walkthrough for constructing a Turnkey API stamp using standard shell tools.

## Prerequisites

Required tools: `openssl`, `xxd`, `jq`, `base64`, `curl`

Environment variables:

```bash
export TURNKEY_API_PRIVATE_KEY="<hex-encoded-p256-private-key>"
export TURNKEY_API_PUBLIC_KEY="<hex-encoded-compressed-public-key>"
export TURNKEY_ORGANIZATION_ID="<your-org-uuid>"
```

## Converting Hex Private Key to PEM

Turnkey API private keys are typically stored as hex-encoded raw scalars. OpenSSL requires PEM format for signing. To convert:

```bash
# Build a DER-encoded PKCS#8 key from the raw hex scalar
# P-256 OID prefix (fixed for all P-256 keys)
P256_PREFIX="302e0201010420"
P256_SUFFIX="a00706052b8104000a"

# For P-256 keys, use the SEC1 format with the curve OID
# The full ASN.1 structure for a P-256 private key:
PRIVATE_KEY_HEX="$TURNKEY_API_PRIVATE_KEY"

# Write SEC1 DER and convert to PEM
echo "302e0201010420${PRIVATE_KEY_HEX}a00706052b8104000a" | xxd -r -p > /tmp/ec-key.der

# Alternative: use openssl directly with a pre-built PEM
# Create the EC parameters and key in one step
python3 -c "
import struct, base64
key_hex = '${PRIVATE_KEY_HEX}'
key_bytes = bytes.fromhex(key_hex)
# SEC1 EC private key ASN.1 structure for P-256
import subprocess
" 2>/dev/null

# Simplest approach: write hex key to file and use openssl
echo "-----BEGIN EC PARAMETERS-----
BggqhkjOPQMBBw==
-----END EC PARAMETERS-----" > /tmp/ec-params.pem

# Generate PEM from raw private key bytes using openssl
printf '%s' "$PRIVATE_KEY_HEX" | xxd -r -p | openssl ec -inform DER -outform PEM -out /tmp/tk-private.pem 2>/dev/null

# If the above fails, use the Python helper below
```

If key conversion is complex, use the Python helper:

```bash
python3 -c "
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import sys

private_value = int('$TURNKEY_API_PRIVATE_KEY', 16)
private_key = ec.derive_private_key(private_value, ec.SECP256R1())
pem = private_key.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.TraditionalOpenSSL,
    serialization.NoEncryption()
)
sys.stdout.buffer.write(pem)
" > /tmp/tk-private.pem
```

## Full Stamp Construction

```bash
#!/bin/bash
set -euo pipefail

# 1. Define the request body (exact bytes matter)
BODY='{"organizationId":"'"$TURNKEY_ORGANIZATION_ID"'"}'

# 2. Sign the body with ECDSA P-256 SHA-256, output DER
SIGNATURE_HEX=$(echo -n "$BODY" | \
  openssl dgst -sha256 -sign /tmp/tk-private.pem | \
  xxd -p -c 256)

# 3. Build the stamp JSON
STAMP_JSON=$(jq -cn \
  --arg pk "$TURNKEY_API_PUBLIC_KEY" \
  --arg sig "$SIGNATURE_HEX" \
  '{publicKey: $pk, signature: $sig, scheme: "SIGNATURE_SCHEME_TK_API_P256"}')

# 4. Base64URL encode (no padding)
STAMP=$(echo -n "$STAMP_JSON" | base64 | tr '+/' '-_' | tr -d '=' | tr -d '\n')

# 5. Make the stamped request
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-Stamp: $STAMP" \
  -d "$BODY" \
  "https://api.turnkey.com/public/v1/query/whoami"
```

## Verifying a Stamp Manually

To decode and inspect an existing stamp:

```bash
# Decode Base64URL to JSON (add padding back if needed)
STAMP="<your-base64url-stamp>"
PADDED=$(echo -n "$STAMP" | tr '-_' '+/' )
MOD=$((${#PADDED} % 4))
if [ $MOD -eq 2 ]; then PADDED="${PADDED}=="; elif [ $MOD -eq 3 ]; then PADDED="${PADDED}="; fi

echo "$PADDED" | base64 -d | jq .
```

This outputs the stamp JSON with `publicKey`, `signature`, and `scheme` fields. Verify:
- `publicKey` matches your registered API key
- `signature` is a valid hex string (DER-encoded ECDSA signature)
- `scheme` is `SIGNATURE_SCHEME_TK_API_P256`

## Common Pitfalls

- **Trailing newline**: `echo` adds a newline by default. Always use `echo -n` when piping the body for signing.
- **JSON formatting**: The signed body must be the exact bytes sent in the HTTP request. Do not reformat or pretty-print.
- **Base64 line wrapping**: Some `base64` implementations add line breaks. Use `tr -d '\n'` to strip them.
- **Key format**: OpenSSL expects PEM format. Raw hex keys must be converted first (see above).
