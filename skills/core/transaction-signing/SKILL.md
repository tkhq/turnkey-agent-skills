---
name: turnkey-transaction-signing
version: "1.0.0"
description: 'Explains Turnkey''s API stamping model and routes to the correct chain-specific signing skill. Use when signing on Cosmos, Bitcoin, Aptos, Sui, TON, or Tron; when signing a raw byte payload; or when you need to understand how Turnkey authentication works. Also triggers on "sign on [unsupported chain]", "how does Turnkey signing work", "sign arbitrary bytes", or "sign a message without a chain SDK". For EVM chains load turnkey-ethereum-evm. For Solana load turnkey-solana-signing.'
tags: ["turnkey", "signing", "blockchain", "crypto", "raw-payload", "bitcoin", "cosmos", "aptos", "sui", "stamping"]
compatibility: "Requires Node.js. Recommended: @turnkey/sdk-server. Lower-level: @turnkey/http and @turnkey/api-key-stamper. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID, SIGN_WITH env vars."
sdk_versions:
  "@turnkey/sdk-server": "^5.1.0"
  "@turnkey/http": "^3.17.0"
  "@turnkey/api-key-stamper": "^0.6.2"
---

# Turnkey Transaction Signing

## Overview

Use this skill to:
- Understand how Turnkey's request stamping works
- Choose the correct signing package for your target chain
- Sign raw byte payloads for chains without a dedicated SDK
- Handle async activity polling for signing operations

**For chain-specific signing, read this skill first, then load the appropriate signing skill:**
- EVM chains (Ethereum, Polygon, Base, Arbitrum, etc.) → `skills/signing/ethereum-evm/SKILL.md`
- Solana → `skills/signing/solana-signing/SKILL.md`
- Bitcoin → `skills/signing/bitcoin-signing/SKILL.md`
- Other chains (Cosmos, Aptos, Sui, etc.) → use raw payload signing documented here

## Prerequisites

**Load first if you don't have a wallet address:**
> `skills/core/wallet-management/SKILL.md` — create a wallet and get the `SIGN_WITH` address before signing

```bash
# Recommended higher-level client (handles polling automatically)
npm install @turnkey/sdk-server

# Lower-level client (manual control, used by chain-specific packages internally)
npm install @turnkey/http @turnkey/api-key-stamper
```

## Environment Variables

```env
TURNKEY_API_PUBLIC_KEY=    # Turnkey API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # Turnkey API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Turnkey organization UUID
SIGN_WITH=                 # Wallet account address or public key used for signing
```

`SIGN_WITH` is the address or public key of the specific wallet account, not the wallet ID. Retrieve it from `getWalletAccounts` (see `wallet-management` skill).

## How Turnkey Stamping Works

Every request to the Turnkey API must be cryptographically stamped before being sent. Stamping proves to Turnkey that the request came from an authorized caller.

The stamp is produced by the `ApiKeyStamper`:
1. It serializes the request body as a JSON string
2. It signs the serialized body using the P-256 API private key
3. It attaches the signature, public key, and scheme as HTTP headers (`X-Stamp`, `X-Stamp-Scheme`, `X-Stamp-Public-Key`)

You can use either the high-level `@turnkey/sdk-server` client or the lower-level `@turnkey/http` client. The high-level client handles polling automatically for async activities.

```typescript
// Option A — @turnkey/sdk-server (recommended)
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();
```

```typescript
// Option B — @turnkey/http (lower-level, manual polling control)
import { TurnkeyClient, withAsyncPolling } from "@turnkey/http";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";

const client = new TurnkeyClient(
  { baseUrl: "https://api.turnkey.com" },
  new ApiKeyStamper({
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  })
);
```

## Choosing a Signing Integration

| Chain | Recommended package | Skill |
|-------|--------------------|----|
| EVM (Ethereum, L2s) | `@turnkey/ethers` or `@turnkey/viem` | `skills/signing/ethereum-evm/` |
| Solana | `@turnkey/solana` | `skills/signing/solana-signing/` |
| Cosmos / CosmWasm | `@turnkey/cosmjs` | — |
| Bitcoin | `signTransaction` or `signRawPayload` | `skills/signing/bitcoin-signing/` |
| Aptos, Sui, TON, Tron | raw payload signing | see below |

Chain-specific packages accept any Turnkey client and expose a native signer interface (e.g., an ethers `Signer`, viem `Account`, or Solana `Signer`). Use them when available — they handle transaction serialization and encoding automatically.

For unsupported chains, use `signRawPayload` directly.

## Raw Payload Signing

`signRawPayload` signs an arbitrary byte payload using a key stored in Turnkey. Use this for:
- Chains without a dedicated Turnkey SDK package
- Custom signing schemes
- Signing arbitrary messages

`signRawPayload` is an activity-based API. Use `@turnkey/sdk-server` — it handles activity polling automatically and returns the result directly.

```typescript
import { Turnkey } from "@turnkey/sdk-server";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const signResponse = await client.signRawPayload({
  organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.SIGN_WITH!,
  payload: "0xdeadbeef...", // hex-encoded bytes to sign
  encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
  hashFunction: "HASH_FUNCTION_NO_OP", // provide pre-hashed input
  // or: "HASH_FUNCTION_KECCAK256" — Turnkey hashes for you (EVM)
  // or: "HASH_FUNCTION_SHA256" — Bitcoin / generic SHA256
});

const { r, s, v } = signResponse;
console.log("r:", r, "s:", s, "v:", v);
```

> **Note:** If you need lower-level control, `@turnkey/http` with `withAsyncPolling` also works, but `@turnkey/sdk-server` is preferred for simplicity.

**Supported `encoding` values:**

| `encoding` | Use when |
|---|---|
| `PAYLOAD_ENCODING_HEXADECIMAL` | payload is a hex string (`0x...`) |
| `PAYLOAD_ENCODING_TEXT_UTF8` | payload is a plain UTF-8 string (e.g., EIP-191 personal_sign) |

**Supported `hashFunction` values:**

| `hashFunction` | Use when |
|---|---|
| `HASH_FUNCTION_NO_OP` | payload is already hashed; Turnkey signs as-is |
| `HASH_FUNCTION_KECCAK256` | EVM — raw bytes; Turnkey hashes then signs |
| `HASH_FUNCTION_SHA256` | Bitcoin, Cosmos, and other SHA256 chains |
| `HASH_FUNCTION_NOT_APPLICABLE` | Ed25519 keys (Solana, Cosmos Ed25519) |

## Examples

For concrete examples — pre-hashed payload, EVM Keccak256, Cosmos SHA256, and UTF-8 message signing — see `references/raw-payload-examples.md`.

## Troubleshooting

**`ACTIVITY_STATUS_FAILED`**
The signing operation failed. This may indicate the key type does not support the requested hash function, or the payload is malformed. Check the Turnkey console for error details.

**`ACTIVITY_STATUS_CONSENSUS_NEEDED`**
The organization's policy requires additional approvals. Capture the `activityId`, surface it to a human approver, and re-poll after approval.

**Invalid payload encoding**
Always hex-encode the payload. A payload like `"hello"` will fail — convert to hex first: `Buffer.from("hello").toString("hex")`.

**Rate limiting (`429 Too Many Requests`)**
Back off exponentially. Turnkey rate-limits by organization. Add jitter to your polling loop if submitting many concurrent signing requests.

**Wrong hash function**
Using `HASH_FUNCTION_KECCAK256` on a pre-hashed payload will double-hash it. Use `HASH_FUNCTION_NO_OP` if you provide a pre-hashed input; use `HASH_FUNCTION_KECCAK256` or `HASH_FUNCTION_SHA256` if you provide raw bytes.

## Related Skills

- `skills/core/wallet-management/SKILL.md` — create a wallet and derive addresses before signing
- `skills/signing/ethereum-evm/SKILL.md` — EVM signing (ethers.js and viem, pick one)
- `skills/signing/solana-signing/SKILL.md` — Solana signing
- `skills/signing/bitcoin-signing/SKILL.md` — Bitcoin signing (P2WPKH and P2TR)
