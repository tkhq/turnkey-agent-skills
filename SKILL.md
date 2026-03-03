---
name: turnkey
version: "1.0.0"
description: "Wallet infrastructure skills for Turnkey: create HD wallets, derive blockchain addresses, and sign transactions on Ethereum/EVM, Solana, Bitcoin, Cosmos, and other chains. Keys stay in hardware-backed secure enclaves and are never exposed to application code."
tags: ["turnkey", "wallet", "signing", "blockchain", "ethereum", "evm", "solana", "bitcoin", "cosmos", "crypto", "key-management", "defi", "web3", "ethers", "viem"]
license: Apache-2.0
compatibility: "Requires Node.js. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars. Chain-specific skills may also require SIGN_WITH."
metadata:
  author: turnkey
  openclaw:
    requires:
      env: [TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID]
      bins: [node]
---

# Turnkey Agent Skills

Skills for AI agents that need to manage wallets and sign transactions using [Turnkey](https://turnkey.com) — a wallet infrastructure platform that stores private keys in hardware-backed secure enclaves. Keys are never exposed to application code; every operation is cryptographically stamped by your API key pair.

## Skills Included

### Core

| Skill | Path | Use when… |
|-------|------|-----------|
| Wallet Management | `skills/core/turnkey-wallet-management/SKILL.md` | creating a wallet, deriving addresses, or retrieving an existing wallet |
| Transaction Signing | `skills/core/turnkey-transaction-signing/SKILL.md` | signing on unsupported chains, signing raw payloads, or understanding how Turnkey stamping works |

### Signing

| Skill | Path | Use when… |
|-------|------|-----------|
| Ethereum / EVM | `skills/signing/turnkey-ethereum-evm/SKILL.md` | signing or broadcasting on Ethereum, Polygon, Base, Arbitrum, Optimism, or any EVM chain |
| Solana | `skills/signing/turnkey-solana-signing/SKILL.md` | signing or broadcasting on Solana |
| Bitcoin | `skills/signing/turnkey-bitcoin-signing/SKILL.md` | signing or broadcasting on Bitcoin (P2WPKH SegWit or P2TR Taproot) |

## Environment Variables

All skills share these three variables:

```env
TURNKEY_API_PUBLIC_KEY=    # API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Organization UUID
```

Signing skills also require:

```env
SIGN_WITH=                 # Address or public key of the wallet account to sign with
```

Get credentials from the [Turnkey console](https://app.turnkey.com) under **Settings → API Keys**.

## Skill Load Order

For any signing task, load skills in this order:

1. `skills/core/turnkey-wallet-management/SKILL.md` — create or retrieve a wallet and get the `SIGN_WITH` address
2. `skills/core/turnkey-transaction-signing/SKILL.md` — understand the stamping model; required for raw payload signing
3. Chain-specific skill — `turnkey-ethereum-evm`, `turnkey-solana-signing`, or `turnkey-bitcoin-signing`

For wallet-only tasks (no signing), only step 1 is needed.
