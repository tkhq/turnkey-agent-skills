---
name: managing-wallets
description: "Manages Turnkey HD wallets across 14+ chains (Ethereum, Solana, Bitcoin, Cosmos, Aptos, Sui, Tron, TON, XRP, Stellar, Dogecoin, Sei, Spark): create wallets, derive addresses, add chains, import/export."
license: Apache-2.0
compatibility: "Requires the unreleased unified tk CLI with shared auth/resource commands; verify local capabilities before use."
metadata:
  author: turnkey
  tags: "wallet blockchain address-derivation hd-wallet ethereum solana bitcoin multi-chain"
---

# Managing Wallets

## Rules

Use the root [CLI convention](../../SKILL.md). List wallets before creating one and reuse a suitable wallet when the task allows it; adding a chain normally means deriving accounts in an existing wallet, not creating another wallet.

## Instructions

```sh
tk --profile admin --message-format json wallet list
tk --profile admin --message-format json wallet get "$WALLET_ID"
tk --profile admin --message-format json wallet create --input-file wallet.json
tk --profile admin --message-format json wallet update --input-file wallet-update.json
tk --profile admin --message-format json wallet account list --wallet-id "$WALLET_ID"
tk --profile admin --message-format json wallet account create --input-file accounts.json
```

Create uses `walletName`, `accounts`, and optional `mnemonicLength`. Each account specifies `curve`, `pathFormat: "PATH_FORMAT_BIP32"`, `path`, and `addressFormat`. Account creation uses `walletId` plus an `accounts` array. Update uses `walletId` and `walletName`. Use explicit derivation paths and formats; do not assume a "next path" inference feature.

Wallet get does not replace account listing. Retain activity IDs while pending, and read created addresses/IDs only after completion. The current account-list command returns one API page; when further pagination is required, use an explicitly constructed `list_wallet_accounts` request with supported pagination options rather than claiming `--all` exists.

### Chain construction

One Ethereum-format account can serve multiple EVM networks. For Bitcoin PSBT workflows derive a companion `ADDRESS_FORMAT_COMPRESSED` account at the same path as the address account, so transaction construction has the public key. Use [wallet API examples](references/wallet-api-examples.md) for chain-specific account parameters. Their HTTP JSON is reference material; submit parameters through the CLI above.

## Import/export and deletion boundary

Wallet/private-key import/export and local bundle encryption/decryption are **not completed CLI workflows**. Wallet/account deletion and account get are not dedicated commands in this build. Do not invent `tk wallet export`, `tk wallet account get`, or a local bundle helper. When these operations are requested, explain the gap and use an explicitly authorized existing tool or dashboard flow; never present a request-only export as a completed decryption workflow. [Import/export examples](references/import-export-examples.md) remain legacy reference material.

## Troubleshooting

- Wrong address: verify path, curve, format, and selected organization.
- Missing accounts: list wallet accounts separately and inspect pagination in the API response.
- Pending/denied creation: inspect activity state; do not repeat the mutation to recover its IDs.

## Related Skills

- [Getting started](../getting-started/SKILL.md): first wallet.
- [Provisioning agent](../provisioning-agent/SKILL.md): assign a wallet to scoped credentials.
- [Signing transactions](../signing-transactions/SKILL.md): construction/broadcast dependencies remain explicit.
