# Policy Language Reference

## Example expressions

```
# Consensus: any approver with a specific tag
approvers.any(user, user.tags.contains('finance-approver'))

# Condition: allow signing only from a specific wallet, ETH value under 1 ETH
activity.action == 'SIGN' && wallet.id == '<WALLET_ID>' && eth.tx.value < 1000000000000000000

# Condition: deny all policy mutations
activity.resource == 'POLICY'
```

## Grammar

| Operation | Operators | Example | Types |
|-----------|-----------|---------|-------|
| logical | `&&`, `\|\|` | `true && false` | (bool, bool) -> bool |
| comparison | `==`, `!=`, `<`, `>`, `<=`, `>=` | `1 < 2` | (int, int) -> bool |
| comparison | `==`, `!=` | `'a' != 'b'` | (string, string) -> bool |
| membership | `in` | `1 in [1, 2, 3]` | (T, list\<T>) -> bool |
| access | `x[index]` | `[1,2,3][0]` | (list\<T>) -> T |
| access | `x[index]` | `'abc'[0]` | (string) -> string |
| slice | `x[start..end]` | `[1,2,3][0..2]` | (list\<T>) -> list\<T> |
| access | `x.field` | `user.tags` | (struct) -> T |
| function | `x.all(item, pred)` | `[1,1,1].all(x, x == 1)` | (list\<T>) -> bool |
| function | `x.any(item, pred)` | `[1,2,3].any(x, x == 1)` | (list\<T>) -> bool |
| function | `x.contains(value)` | `[1,2,3].contains(1)` | (list\<T>) -> bool |
| function | `x.count()` | `[1,2,3].count()` | (list\<T>) -> int |
| function | `x.filter(item, pred)` | `[1,2,3].filter(x, x == 1)` | (list\<T>) -> list\<T> |

## Primitive types

| Type | Example | Notes |
|------|---------|-------|
| bool | `true` | |
| int | `256` | i128 |
| uint | `170141183460469231731687303715884105728` | u256 |
| string | `'a'` | single quotes only |
| list\<T> | `[1, 2, 3]` | |
| struct | `{ id: 'abc' }` | key-value map |

## Consensus keywords

Available in the `consensus` field:

| Keyword | Type | Description |
|---------|------|-------------|
| `approvers` | list\<User> | Users that have approved the activity |
| `credentials` | list\<Credential> | Credentials used to approve the activity |

### User struct

| Field | Type |
|-------|------|
| `id` | string |
| `tags` | list\<string> |
| `email` | string |
| `alias` | string |

### Credential struct

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | API key or authenticator ID |
| `user_id` | string | Owner user ID |
| `type` | string | e.g., `CREDENTIAL_TYPE_API_KEY_P256` |
| `credential_id` | string | Passkey credential ID (authenticators only) |
| `public_key` | string | Public key of the credential |

## Condition keywords

Available in the `condition` field:

| Keyword | Type |
|---------|------|
| `activity` | Activity |
| `eth.tx` | EthereumTransaction |
| `eth.eip_712` | Eip712TypedData |
| `eth.eip_7702_authorization` | Eip7702Authorization |
| `solana.tx` | SolanaTransaction |
| `tron.tx` | TronTransaction |
| `bitcoin.tx` | BitcoinTransaction |
| `wallet` | Wallet |
| `wallets` | list\<Wallet> |
| `private_key` | PrivateKey |
| `wallet_account` | WalletAccount |

## Activity struct

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | e.g., `ACTIVITY_TYPE_SIGN_TRANSACTION_V2` |
| `resource` | string | `USER`, `PRIVATE_KEY`, `POLICY`, `WALLET`, `ORGANIZATION`, `CREDENTIAL`, `AUTH`, `OTP`, etc. |
| `action` | string | `CREATE`, `UPDATE`, `DELETE`, `SIGN`, `EXPORT`, `IMPORT`, `VERIFY` |

## Wallet, PrivateKey, WalletAccount structs

### Wallet

| Field | Type |
|-------|------|
| `id` | string |
| `imported` | bool |
| `exported` | bool |
| `label` | string |

### PrivateKey

| Field | Type |
|-------|------|
| `id` | string |
| `tags` | list\<string> |
| `imported` | bool |
| `exported` | bool |
| `label` | string |

### WalletAccount

| Field | Type |
|-------|------|
| `address` | string |

## Ethereum transaction (eth.tx)

| Field | Type | Description |
|-------|------|-------------|
| `from` | string | Sender address |
| `to` | string | Receiver address |
| `data` | string | Calldata (hex) |
| `value` | int | Amount in **wei** (1 ETH = 10^18) |
| `gas` | int | Gas limit |
| `gas_price` | int | Gas price (legacy) |
| `chain_id` | int | Chain ID |
| `nonce` | int | Transaction nonce |
| `max_fee_per_gas` | int | EIP-1559 max fee |
| `max_priority_fee_per_gas` | int | EIP-1559 priority fee |
| `type` | string | `LEGACY`, `TYPE_1`, `TYPE_2`, `TYPE_3`, `TYPE_4` |
| `function_name` | string | Decoded function name (requires ABI upload) |
| `function_signature` | string | Function signature bytes (requires ABI upload) |
| `contract_call_args` | map | Parsed function arguments (requires ABI upload) |

## EIP-712 typed data (eth.eip_712)

| Field | Type |
|-------|------|
| `primary_type` | string |
| `domain` | Eip712Domain (name, version, chain_id, verifying_contract) |
| `message` | map\<string, Value> |

All hex strings in EIP-712 must be lowercase.

## Solana transaction (solana.tx)

| Field | Type |
|-------|------|
| `account_keys` | list\<string> |
| `program_keys` | list\<string> |
| `instructions` | list\<Instruction> |
| `transfers` | list\<Transfer> |
| `spl_transfers` | list\<SPLTransfer> |
| `recent_blockhash` | string |
| `address_table_lookups` | list\<AddressTableLookup> |

### Solana Transfer

| Field | Type |
|-------|------|
| `from` | string |
| `to` | string |
| `amount` | int (in **lamports**, 1 SOL = 10^9) |

### Solana SPL Transfer

| Field | Type |
|-------|------|
| `from` | string (token account) |
| `to` | string (token account) |
| `amount` | int (atomic units) |
| `owner` | string |
| `token_mint` | string |

### Address table lookups

Unresolved lookups appear as the literal string `ADDRESS_TABLE_LOOKUP` in address fields. Guard against this: `solana.tx.address_table_lookups.count() == 0`.

## Bitcoin transaction (bitcoin.tx)

| Field | Type |
|-------|------|
| `version` | string |
| `inputs` | list\<BitcoinTxInput> (tx_id, vout, sequence) |
| `outputs` | list\<BitcoinTxOutput> (value in **satoshis**, script_pubkey, address, address_type) |
| `locktime` | BitcoinTxLocktime (amount, type) |
| `fee` | int (in **satoshis**, 1 BTC = 10^8) |

## Tron transaction (tron.tx)

| Field | Type |
|-------|------|
| `ref_block_bytes` | string |
| `ref_block_hash` | string |
| `expiration` | int (ms) |
| `timestamp` | int (ms) |
| `fee_limit` | int |
| `contract` | list\<TronContract> |

### TronContract

| Field | Available for |
|-------|---------------|
| `type` | All (`TransferContract`, `TriggerSmartContract`) |
| `owner_address` | All |
| `to_address` | TransferContract |
| `amount` | TransferContract (in **sun**, 1 TRX = 10^6) |
| `contract_address` | TriggerSmartContract |
| `data` | TriggerSmartContract |

## Common activity types

| Resource | Action | Activity Type |
|----------|--------|---------------|
| PRIVATE_KEY | SIGN | `ACTIVITY_TYPE_SIGN_TRANSACTION_V2` |
| PRIVATE_KEY | SIGN | `ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2` |
| PRIVATE_KEY | SIGN | `ACTIVITY_TYPE_SIGN_RAW_PAYLOADS` |
| PRIVATE_KEY | SIGN | `ACTIVITY_TYPE_ETH_SEND_TRANSACTION` |
| PRIVATE_KEY | SIGN | `ACTIVITY_TYPE_SOL_SEND_TRANSACTION` |
| WALLET | CREATE | `ACTIVITY_TYPE_CREATE_WALLET` |
| WALLET | DELETE | `ACTIVITY_TYPE_DELETE_WALLETS` |
| WALLET | EXPORT | `ACTIVITY_TYPE_EXPORT_WALLET` |
| POLICY | CREATE | `ACTIVITY_TYPE_CREATE_POLICY_V3` |
| POLICY | UPDATE | `ACTIVITY_TYPE_UPDATE_POLICY_V2` |
| POLICY | DELETE | `ACTIVITY_TYPE_DELETE_POLICY` |
| USER | CREATE | `ACTIVITY_TYPE_CREATE_USERS_V3` |
| USER | DELETE | `ACTIVITY_TYPE_DELETE_USERS` |
| CREDENTIAL | CREATE | `ACTIVITY_TYPE_CREATE_API_KEYS_V2` |
| CREDENTIAL | DELETE | `ACTIVITY_TYPE_DELETE_API_KEYS` |

All signing activities map to resource `PRIVATE_KEY`, regardless of whether you sign with a wallet address or a private key directly.
