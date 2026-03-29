# Stamping Basics

Every Turnkey API request must include an `X-Stamp` header proving the caller controls a registered API key.

Minimal flow:

1. Serialize the exact JSON request body you will send.
2. Sign those exact bytes with your Turnkey API private key.
3. Build the stamp JSON with your registered public key, the signature, and the signature scheme.
4. Base64URL-encode that stamp JSON and send it as `X-Stamp`.

Debugging basics:

- Sign the exact request body bytes, not a reformatted version.
- Make sure the public key in the stamp matches the API key registered in Turnkey.
- Use the right signature scheme for the key curve you registered.
