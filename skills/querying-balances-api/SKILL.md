---
name: querying-balances-api
description: "Queries wallet address balances and supported assets using the Turnkey HTTP API. Covers get_wallet_address_balances, list_supported_assets, CAIP-2 selection, address holdings, and reading balance response fields. Use when asked to 'check balances via the Turnkey API', 'get wallet address balances', 'what assets are supported on this chain', 'list supported assets', 'what does this address hold', 'what does this address hold on Base', or 'show this address holdings on Base or Solana'. Do NOT use for signing or broadcasting transactions (use signing-transactions-api), wallet creation (use managing-wallets-api), or policy management (use managing-policies-api)."
license: Apache-2.0
compatibility: "Requires Turnkey API credentials (P-256 key pair). Start with getting-started-workflow for credential setup."
metadata:
  version: "1.0.0"
  author: turnkey
  tags: ["balances", "assets", "query", "api", "wallet", "beta"]
---

# Querying Balances (API)

## Quick Start

Use the Turnkey HTTP API to query an address's balances and discover which assets are supported on a network.

## Prerequisites

Requires Turnkey API credentials and a wallet address to inspect. Start with `getting-started-workflow` if the caller still needs initial credential setup.

All requests must include an `X-Stamp` header. See [references/stamping-basics.md](references/stamping-basics.md) for the lightweight stamping reference.

## Making Requests

Use direct HTTPS requests to `https://api.turnkey.com`.

- These are query endpoints, so use `POST /public/v1/query/...`.
- Include `organizationId` in every request body.
- Balance and asset endpoints are beta; if the caller does not have access, tell them to verify availability with Turnkey.

## Instructions

### Get wallet address balances

Use this when the caller wants holdings for one address on one chain.

```
POST https://api.turnkey.com/public/v1/query/get_wallet_address_balances
```

```json
{
  "organizationId": "<ORG_ID>",
  "address": "0xYOUR_ADDRESS",
  "caip2": "eip155:8453"
}
```

Returns non-zero balances with asset identifiers, atomic-unit balances, decimals, and display values.

### List supported assets

Use this when the caller wants to know which assets Turnkey can return for a network.

```
POST https://api.turnkey.com/public/v1/query/list_supported_assets
```

```json
{
  "organizationId": "<ORG_ID>",
  "caip2": "eip155:8453"
}
```

Returns supported asset metadata such as `caip19`, `symbol`, `decimals`, `name`, and `logoUrl`.

For complete examples, see [references/balance-query-examples.md](references/balance-query-examples.md).

## Rules

- Use `querying-balances-api` for holdings and asset discovery, not `signing-transactions-api`.
- Always include the correct CAIP-2 chain identifier for the target network.
- Treat `display` values as presentation only; use the atomic-unit `balance` for calculations.
- Tell the user these endpoints are beta when relevant.

## Related Skills

- `getting-started-workflow` for initial credential setup
- `managing-wallets-api` for deriving or locating wallet addresses
- `signing-transactions-api` for nonces, gas usage, signing, and broadcasting
