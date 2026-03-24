# Chain-Specific Signing Examples

Complete HTTP API examples for signing transactions on each supported chain.

**Base URL:** `https://api.turnkey.com`

## Ethereum

Sign a serialized unsigned EIP-1559 transaction. The `unsignedTransaction` field must contain the RLP-encoded hex of the unsigned transaction (constructed externally using ethers, viem, or similar tooling).

`POST /public/v1/submit/sign_transaction`

```json
{
  "signWith": "0x1234abcd5678ef901234abcd5678ef901234abcd",
  "unsignedTransaction": "02f87083aa36a70a8459682f008502540be40082520894d8da6bf26964af9d7eed9e03e53415d37aa9604580b844a9059cbb000000000000000000000000recipient_address_here0000000000000000000000000000000000000000000000000de0b6b3a7640000c0",
  "type": "TRANSACTION_TYPE_ETHEREUM"
}
```

**Response format:**

```json
{
  "activity": {
    "result": {
      "signTransactionResult": {
        "signedTransaction": "0x02f8b083aa36a7..."
      }
    }
  }
}
```

The `signedTransaction` field contains the fully signed, RLP-encoded transaction ready for broadcast via `eth_sendRawTransaction`.

## Solana

Sign a Solana transaction. The `unsignedTransaction` field must contain the base64-encoded serialized transaction message (constructed externally using @solana/web3.js or similar tooling).

`POST /public/v1/submit/sign_transaction`

```json
{
  "signWith": "7Hk2VMKXGT2Rbhf5JVbMQ9ysNBqKRfGLHs8gZSBw2k34",
  "unsignedTransaction": "AQABAwIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
  "type": "TRANSACTION_TYPE_SOLANA"
}
```

**Response format:**

```json
{
  "activity": {
    "result": {
      "signTransactionResult": {
        "signedTransaction": "ASdKzN3mVb7..."
      }
    }
  }
}
```

The `signedTransaction` field contains the base64-encoded signed transaction ready for broadcast via `sendTransaction`.

## Bitcoin (P2WPKH)

Sign a Bitcoin transaction using a Partially Signed Bitcoin Transaction (PSBT). The `unsignedTransaction` field must contain the hex-encoded PSBT (constructed externally using bitcoinjs-lib or similar tooling).

`POST /public/v1/submit/sign_transaction`

```json
{
  "signWith": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  "unsignedTransaction": "70736274ff0100520200000001abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678900000000000ffffffff0140420f00000000001600141234567890abcdef1234567890abcdef12345678000000000001011f00e1f505000000001600141234567890abcdef1234567890abcdef1234567800",
  "type": "TRANSACTION_TYPE_BITCOIN"
}
```

**Response format:**

```json
{
  "activity": {
    "result": {
      "signTransactionResult": {
        "signedTransaction": "70736274ff..."
      }
    }
  }
}
```

The `signedTransaction` field contains the hex-encoded signed PSBT. You may need to finalize and extract the raw transaction before broadcasting, depending on your tooling.

## Tron

Sign a Tron transaction. The `unsignedTransaction` field must contain the hex-encoded raw transaction body (constructed externally using TronWeb or the Tron HTTP API).

`POST /public/v1/submit/sign_transaction`

```json
{
  "signWith": "TLfVw7ZrBhBEC6peq1TRE9ixfbMjGg5PjL",
  "unsignedTransaction": "0a02c3e82208e3b7e1a1c2d3f4e51080c8afa025189001220841616263646566",
  "type": "TRANSACTION_TYPE_TRON"
}
```

**Response format:**

```json
{
  "activity": {
    "result": {
      "signTransactionResult": {
        "signedTransaction": "0a02c3e822..."
      }
    }
  }
}
```

The `signedTransaction` field contains the hex-encoded signed transaction ready for broadcast via the Tron `wallet/broadcasttransaction` endpoint.

## Notes

- The `signWith` value can be a wallet account address, a private key address, or a private key ID.
- For chains not listed here (Sui, TON, Cosmos, etc.), use the signRawPayload endpoint. See [raw-payload-examples.md](raw-payload-examples.md) for those patterns.
- Construct all unsigned transactions externally using the appropriate chain SDK. Turnkey does not build or serialize transactions.
