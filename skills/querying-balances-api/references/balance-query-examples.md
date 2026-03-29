# Balance Query Examples

Complete HTTP API examples for checking wallet address balances and discovering supported assets.

**Base URL:** `https://api.turnkey.com`

## Get Wallet Address Balances (beta)

Retrieve asset balances for an address on a specific network. Returns only non-zero balances.

`POST /public/v1/query/get_wallet_address_balances`

### EVM Balance Check

```json
{
  "organizationId": "<ORG_ID>",
  "address": "0x1234abcd5678ef901234abcd5678ef901234abcd",
  "caip2": "eip155:8453"
}
```

**Response:**

```json
{
  "balances": [
    {
      "caip19": "eip155:8453/slip44:60",
      "symbol": "ETH",
      "balance": "1500000000000000000",
      "decimals": 18,
      "name": "Ether",
      "display": {
        "usd": "3750.00",
        "crypto": "1.5"
      }
    },
    {
      "caip19": "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "symbol": "USDC",
      "balance": "10000000",
      "decimals": 6,
      "name": "USD Coin",
      "display": {
        "usd": "10.00",
        "crypto": "10.0"
      }
    }
  ]
}
```

### Solana Balance Check

```json
{
  "organizationId": "<ORG_ID>",
  "address": "7Hk2VMKXGT2Rbhf5JVbMQ9ysNBqKRfGLHs8gZSBw2k34",
  "caip2": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
}
```

**Response:**

```json
{
  "balances": [
    {
      "caip19": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501",
      "symbol": "SOL",
      "balance": "2500000000",
      "decimals": 9,
      "name": "Solana",
      "display": {
        "usd": "375.00",
        "crypto": "2.5"
      }
    }
  ]
}
```

### Balance Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `caip19` | string | CAIP-19 asset identifier (chain + asset type + contract) |
| `symbol` | string | Token symbol (ETH, USDC, SOL, etc.) |
| `balance` | string | Balance in atomic units (wei, lamports, etc.) |
| `decimals` | number | Number of decimal places for the asset |
| `name` | string | Human-readable asset name |
| `display.usd` | string | Approximate USD value (for display only, not calculations) |
| `display.crypto` | string | Normalized crypto amount (for display only, not calculations) |

Only non-zero balances are returned. If an address has no balance for an asset, it will not appear in the response. Display values are approximate and should not be used for arithmetic or transaction construction.

## List Supported Assets (beta)

Discover which tokens and assets are available for balance queries on a given network.

`POST /public/v1/query/list_supported_assets`

### EVM Assets

```json
{
  "organizationId": "<ORG_ID>",
  "caip2": "eip155:8453"
}
```

**Response:**

```json
{
  "assets": [
    {
      "caip19": "eip155:8453/slip44:60",
      "symbol": "ETH",
      "decimals": 18,
      "name": "Ether",
      "logoUrl": "https://example.com/eth-logo.png"
    },
    {
      "caip19": "eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "symbol": "USDC",
      "decimals": 6,
      "name": "USD Coin",
      "logoUrl": "https://example.com/usdc-logo.png"
    }
  ]
}
```

### Solana Assets

```json
{
  "organizationId": "<ORG_ID>",
  "caip2": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
}
```

### Asset Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `caip19` | string | CAIP-19 asset identifier |
| `symbol` | string | Token symbol |
| `decimals` | number | Number of decimal places |
| `name` | string | Human-readable asset name |
| `logoUrl` | string | URL to the asset logo image |

---

## Supported CAIP-2 Chain Identifiers

### EVM Chains

| Chain | CAIP-2 | Supported Queries |
|-------|--------|-------------------|
| Ethereum Mainnet | `eip155:1` | balances, nonces, gas usage, assets |
| Ethereum Sepolia | `eip155:11155111` | balances, nonces, gas usage, assets |
| Base | `eip155:8453` | balances, nonces, gas usage, assets |
| Base Sepolia | `eip155:84532` | balances, nonces, gas usage, assets |
| Polygon | `eip155:137` | balances, nonces, gas usage, assets |
| Polygon Amoy | `eip155:80002` | balances, nonces, gas usage, assets |

### Solana Chains

| Chain | CAIP-2 | Supported Queries |
|-------|--------|-------------------|
| Solana Mainnet | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` | balances, assets |
| Solana Devnet | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG` | balances, assets |

## Common Patterns

### Check Balance Before Sending

Before signing a transfer, verify the sender has sufficient funds:

1. Call get_wallet_address_balances with the sender address and target chain.
2. Find the relevant asset in the response by `symbol` or `caip19`.
3. Compare the `balance` (atomic units) against the intended transfer amount.
4. If sufficient, proceed with signing. If not, inform the user.

For nonce, gas usage, and send-transaction polling, use `signing-transactions-api`.
