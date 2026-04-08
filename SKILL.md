---
name: turnkey
description: "Use when working with Turnkey wallet infrastructure — creating wallets, signing blockchain transactions, managing users and policies, provisioning agents, or monitoring activities. Supports Ethereum/EVM, Solana, Bitcoin, and 10+ other chains. Keys stay in hardware-backed secure enclaves."
license: Apache-2.0
compatibility: "Requires TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["turnkey", "wallet", "signing", "blockchain", "ethereum", "solana", "bitcoin", "crypto", "policy", "agent"]
---

# Turnkey Skills

Wallet infrastructure skills for [Turnkey](https://turnkey.com). Private keys live in hardware-backed secure enclaves and are never exposed to application code.

## Skills

### Primitives

| Skill | Path | Use when… |
|-------|------|-----------|
| Signing Transactions | `skills/signing-transactions/SKILL.md` | signing, broadcasting, gasless/sponsored transactions on any chain |
| Managing Wallets | `skills/managing-wallets/SKILL.md` | creating wallets, deriving addresses, adding chains, import/export |
| Managing Private Keys | `skills/managing-private-keys/SKILL.md` | standalone keys, key tags for policy targeting, import/export |
| Managing Users | `skills/managing-users/SKILL.md` | creating users, API key rotation, user tags |
| Managing Policies | `skills/managing-policies/SKILL.md` | access control, spending limits, allowlists, multi-sig, policy debugging |
| Monitoring Activities | `skills/monitoring-activities/SKILL.md` | activity status, consensus approvals, automated agent approver, audit |

### Workflows

| Skill | Path | Use when… |
|-------|------|-----------|
| Getting Started | `skills/getting-started/SKILL.md` | new to Turnkey, verifying credentials, creating first wallet |
| Provisioning Agent | `skills/provisioning-agent/SKILL.md` | giving an agent a scoped wallet with constrained credentials |
| Managing Agent | `skills/managing-agent/SKILL.md` | debugging denied transactions, changing agent policies, key rotation, revocation |

## Environment Variables

```env
TURNKEY_API_PUBLIC_KEY=    # API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Organization UUID
SIGN_WITH=                 # Address or public key to sign with (signing skills only)
```

Get credentials from the [Turnkey Dashboard](https://app.turnkey.com) under **Settings → API Keys**.
