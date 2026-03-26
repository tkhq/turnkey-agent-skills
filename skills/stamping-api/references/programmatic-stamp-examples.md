# Programmatic Stamp Construction

Self-contained examples for constructing Turnkey API stamps in JS/TS, Python, and Go. Each function takes the request body string and key material, and returns the stamp string for the `X-Stamp` header.

## JavaScript / TypeScript (Node.js)

```typescript
import crypto from "crypto";

function stampRequest(
  body: string,
  privateKeyHex: string,
  publicKeyHex: string
): string {
  // Convert hex private key to a crypto key object
  // Build the JWK for P-256
  const privateKeyBytes = Buffer.from(privateKeyHex, "hex");

  // Create an ECDSA signer with SHA-256
  const sign = crypto.createSign("SHA256");
  sign.update(body);
  sign.end();

  // Sign using the EC private key (DER output by default)
  const ecPrivateKey = crypto.createPrivateKey({
    key: Buffer.concat([
      // SEC1 EC private key ASN.1 prefix for P-256
      Buffer.from("30770201010420", "hex"),
      privateKeyBytes,
      Buffer.from("a00a06082a8648ce3d030107a14403420004", "hex"),
      // For compressed public key, you may need to derive the uncompressed form
      // or use a JWK import instead
    ]),
    format: "der",
    type: "sec1",
  });

  const derSignature = sign.sign(ecPrivateKey);
  const signatureHex = derSignature.toString("hex");

  // Build the stamp JSON
  const stamp = JSON.stringify({
    publicKey: publicKeyHex,
    signature: signatureHex,
    scheme: "SIGNATURE_SCHEME_TK_API_P256",
  });

  // Base64URL encode (no padding)
  return Buffer.from(stamp).toString("base64url");
}

// Usage:
// const stamp = stampRequest(JSON.stringify(requestBody), privateKeyHex, publicKeyHex);
// fetch(url, { headers: { "X-Stamp": stamp }, method: "POST", body: JSON.stringify(requestBody) });
```

Alternative using `@turnkey/api-key-stamper` (recommended for production):

```typescript
import { ApiKeyStamper } from "@turnkey/api-key-stamper";

const stamper = new ApiKeyStamper({
  apiPublicKey: publicKeyHex,
  apiPrivateKey: privateKeyHex,
});

const stamp = await stamper.stamp(JSON.stringify(requestBody));
// stamp.stampHeaderName = "X-Stamp"
// stamp.stampHeaderValue = "<base64url-encoded-stamp>"
```

## Python

```python
import base64
import hashlib
import json

from cryptography.hazmat.primitives.asymmetric import ec, utils
from cryptography.hazmat.primitives import hashes, serialization


def stamp_request(body: str, private_key_hex: str, public_key_hex: str) -> str:
    """Construct a Turnkey API stamp for the given request body."""
    # Load the private key from hex
    private_value = int(private_key_hex, 16)
    private_key = ec.derive_private_key(private_value, ec.SECP256R1())

    # Sign the body bytes with ECDSA SHA-256 (produces DER-encoded signature)
    body_bytes = body.encode("utf-8")
    der_signature = private_key.sign(body_bytes, ec.ECDSA(hashes.SHA256()))

    # Hex-encode the DER signature
    signature_hex = der_signature.hex()

    # Build the stamp JSON
    stamp = json.dumps(
        {
            "publicKey": public_key_hex,
            "signature": signature_hex,
            "scheme": "SIGNATURE_SCHEME_TK_API_P256",
        },
        separators=(",", ":"),
    )

    # Base64URL encode (no padding)
    stamp_b64 = base64.urlsafe_b64encode(stamp.encode("utf-8")).rstrip(b"=").decode()
    return stamp_b64


# Usage:
# import requests
# body = json.dumps({"organizationId": org_id})
# stamp = stamp_request(body, private_key_hex, public_key_hex)
# resp = requests.post(url, data=body, headers={"X-Stamp": stamp})
```

## Go

```go
package stamp

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/asn1"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
)

type apiStamp struct {
	PublicKey string `json:"publicKey"`
	Signature string `json:"signature"`
	Scheme    string `json:"scheme"`
}

// StampRequest constructs a Turnkey API stamp for the given body.
func StampRequest(body string, privateKeyHex string, publicKeyHex string) (string, error) {
	// Decode the hex private key
	privBytes, err := hex.DecodeString(privateKeyHex)
	if err != nil {
		return "", fmt.Errorf("decode private key: %w", err)
	}

	// Build the P-256 private key
	curve := elliptic.P256()
	privKey := new(ecdsa.PrivateKey)
	privKey.D = new(big.Int).SetBytes(privBytes)
	privKey.PublicKey.Curve = curve
	privKey.PublicKey.X, privKey.PublicKey.Y = curve.ScalarBaseMult(privBytes)

	// SHA-256 hash of the body
	digest := sha256.Sum256([]byte(body))

	// ECDSA sign
	r, s, err := ecdsa.Sign(rand.Reader, privKey, digest[:])
	if err != nil {
		return "", fmt.Errorf("sign: %w", err)
	}

	// DER-encode the signature
	type ecdsaSignature struct {
		R, S *big.Int
	}
	derSig, err := asn1.Marshal(ecdsaSignature{R: r, S: s})
	if err != nil {
		return "", fmt.Errorf("marshal DER: %w", err)
	}

	// Hex-encode the DER signature
	sigHex := hex.EncodeToString(derSig)

	// Build the stamp JSON
	stamp := apiStamp{
		PublicKey: publicKeyHex,
		Signature: sigHex,
		Scheme:    "SIGNATURE_SCHEME_TK_API_P256",
	}
	stampJSON, err := json.Marshal(stamp)
	if err != nil {
		return "", fmt.Errorf("marshal stamp: %w", err)
	}

	// Base64URL encode (no padding)
	return base64.RawURLEncoding.EncodeToString(stampJSON), nil
}
```

Usage:

```go
body := `{"organizationId":"<ORG_ID>"}`
stamp, err := stamp.StampRequest(body, privateKeyHex, publicKeyHex)
if err != nil {
    log.Fatal(err)
}

req, _ := http.NewRequest("POST", "https://api.turnkey.com/public/v1/query/whoami", strings.NewReader(body))
req.Header.Set("X-Stamp", stamp)
req.Header.Set("Content-Type", "application/json")
```
