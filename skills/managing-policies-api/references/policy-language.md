# Policy Language Reference

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
| slice | `x[start..end]` | `'abc'[0..2]` | (string) -> string |
| access | `x.field` | `user.tags` | (struct) -> T |
| function | `x.all(item, predicate)` | `[1,1,1].all(x, x == 1)` | (list\<T>) -> bool |
| function | `x.any(item, predicate)` | `[1,2,3].any(x, x == 1)` | (list\<T>) -> bool |
| function | `x.contains(value)` | `[1,2,3].contains(1)` | (list\<T>) -> bool |
| function | `x.count()` | `[1,2,3].count()` | (list\<T>) -> int |
| function | `x.filter(item, predicate)` | `[1,2,3].filter(x, x == 1)` | (list\<T>) -> list\<T> |

## Primitive Types

| Type | Example | Notes |
|------|---------|-------|
| bool | `true` | |
| int | `256` | i128 |
| uint | `170141183460469231731687303715884105728` | u256 |
| string | `'a'` | only single quotes |
| list\<T> | `[1, 2, 3]` | |
| struct | `{ id: 'abc' }` | key-value map |

## Consensus Keywords

These keywords are available in the `consensus` field:

| Keyword | Type | Description |
|---------|------|-------------|
| **approvers** | list\<User> | Users that have approved the activity |
| **credentials** | list\<Credential> | Credentials used to approve the activity |

### User struct

| Field | Type | Description |
|-------|------|-------------|
| id | string | User identifier |
| tags | list\<string> | User's tags |
| email | string | User's email |
| alias | string | User's alias |

### Credential struct

| Field | Type | Description |
|-------|------|-------------|
| id | string | API key or authenticator identifier |
| user_id | string | Owner user identifier |
| type | string | Credential type (e.g., `CREDENTIAL_TYPE_WEBAUTHN_AUTHENTICATOR`, `CREDENTIAL_TYPE_API_KEY_P256`) |
| credential_id | string | Passkey credential ID (only for authenticators, not API keys) |
| public_key | string | Public key of the credential |

## Condition Keywords

These keywords are available in the `condition` field:

| Keyword | Type | Description |
|---------|------|-------------|
| **activity** | Activity | Activity metadata |
| **eth.tx** | EthereumTransaction | Parsed Ethereum transaction |
| **eth.eip_712** | Eip712TypedData | EIP-712 typed data |
| **eth.eip_7702_authorization** | Eip7702Authorization | EIP-7702 authorization |
| **solana.tx** | SolanaTransaction | Parsed Solana transaction |
| **tron.tx** | TronTransaction | Parsed Tron transaction |
| **bitcoin.tx** | BitcoinTransaction | Parsed Bitcoin transaction |
| **wallet** | Wallet | Target wallet for sign/export requests |
| **wallets** | list\<Wallet> | Target wallets for multi-wallet requests |
| **private_key** | PrivateKey | Target private key for sign/export requests |
| **wallet_account** | WalletAccount | Target wallet account for sign/export requests |

## Activity Struct

| Field | Type | Description |
|-------|------|-------------|
| type | string | Activity type (e.g., `ACTIVITY_TYPE_SIGN_TRANSACTION_V2`) |
| resource | string | Resource type: `USER`, `PRIVATE_KEY`, `POLICY`, `WALLET`, `ORGANIZATION`, `INVITATION`, `CREDENTIAL`, `CONFIG`, `RECOVERY`, `AUTH`, `OTP` |
| action | string | Action: `CREATE`, `UPDATE`, `DELETE`, `SIGN`, `EXPORT`, `IMPORT`, `VERIFY` |
| params | struct | Activity-specific parameters (see below) |

### Activity Parameters

| Activity Type | Field | Type | Description |
|--------------|-------|------|-------------|
| `ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2` | hash_function | string | e.g., `HASH_FUNCTION_NO_OP`, `HASH_FUNCTION_KECCAK256` |
| | encoding | string | e.g., `PAYLOAD_ENCODING_HEXADECIMAL`, `PAYLOAD_ENCODING_EIP712` |
| `ACTIVITY_TYPE_SIGN_TRANSACTION_V2` | type | string | `TRANSACTION_TYPE_ETHEREUM`, `TRANSACTION_TYPE_SOLANA`, `TRANSACTION_TYPE_BITCOIN`, `TRANSACTION_TYPE_TRON`, `TRANSACTION_TYPE_TEMPO` |
| `ACTIVITY_TYPE_DELETE_USERS` | user_ids | list\<string> | User IDs being deleted |
| `ACTIVITY_TYPE_UPDATE_WALLET` | wallet_id | string | Wallet being updated |
| `ACTIVITY_TYPE_INIT_OTP_AUTH_V2/V3` | otp_length | int | OTP code length |

## Wallet, Private Key, and Wallet Account Structs

### Wallet

| Field | Type | Description |
|-------|------|-------------|
| id | string | Wallet identifier |
| imported | bool | Whether wallet was imported |
| exported | bool | Whether wallet was exported |
| label | string | Wallet label |

### PrivateKey

| Field | Type | Description |
|-------|------|-------------|
| id | string | Private key identifier |
| tags | list\<string> | Tags |
| imported | bool | Whether imported |
| exported | bool | Whether exported |
| label | string | Label |

### WalletAccount

| Field | Type | Description |
|-------|------|-------------|
| address | string | Wallet account address |

## Ethereum Transaction (eth.tx)

| Field | Type | Description |
|-------|------|-------------|
| from | string | Sender address |
| to | string | Receiver address |
| data | string | Calldata (hex-encoded) |
| value | int | Amount in wei |
| gas | int | Gas limit |
| gas_price | int | Gas price (legacy; for EIP-1559, equals max_fee_per_gas) |
| chain_id | int | Chain ID |
| nonce | int | Transaction nonce |
| max_fee_per_gas | int | EIP-1559 max fee per gas |
| max_priority_fee_per_gas | int | EIP-1559 priority fee |
| max_fee_per_blob_gas | int | EIP-4844 blob gas fee |
| type | string | `LEGACY`, `TYPE_1`, `TYPE_2`, `TYPE_3`, `TYPE_4` |
| function_name | string | ABI function name (requires smart contract interface) |
| function_signature | string | ABI function signature bytes (requires smart contract interface) |
| contract_call_args | map\<string, ContractArgument> | Parsed contract arguments (requires smart contract interface) |

## EIP-712 Typed Data (eth.eip_712)

| Field | Type | Description |
|-------|------|-------------|
| primary_type | string | Primary structure type |
| domain | Eip712Domain | Domain fields (name, version, chain_id, verifying_contract) |
| message | map\<string, Value> | JSON message payload |

All hex strings in EIP-712 must be lowercase.

## EIP-7702 Authorization (eth.eip_7702_authorization)

| Field | Type | Description |
|-------|------|-------------|
| address | string | Address to authorize |
| chain_id | number | EVM chain ID |
| nonce | number | Nonce of the authority |

## Solana Transaction (solana.tx)

| Field | Type | Description |
|-------|------|-------------|
| account_keys | list\<string> | Accounts involved |
| program_keys | list\<string> | Programs involved |
| instructions | list\<Instruction> | Transaction instructions |
| transfers | list\<Transfer> | Native SOL transfers (top-level only) |
| spl_transfers | list\<SPLTransfer> | SPL token transfers (top-level only) |
| recent_blockhash | string | Recent blockhash |
| address_table_lookups | list\<AddressTableLookup> | Address table lookups |

### Solana Instruction

| Field | Type | Description |
|-------|------|-------------|
| program_key | string | Program public key |
| accounts | list\<Account> | Accounts (each has account_key, signer, writable) |
| instruction_data_hex | string | Raw hex instruction data |
| parsed_instruction_data | SolanaParsedInstructionData | IDL-parsed data (if IDL uploaded) |

### Solana Transfer

| Field | Type | Description |
|-------|------|-------------|
| from | string | Sender public key |
| to | string | Recipient public key |
| amount | int | Amount in lamports |

### Solana SPL Transfer

| Field | Type | Description |
|-------|------|-------------|
| from | string | Sending token account |
| to | string | Receiving token account |
| amount | int | Amount in atomic units |
| owner | string | Owner of sending token account |
| signers | list\<string> | Multisig signers (if any) |
| token_mint | string | Token mint address |

### Address Table Lookups

Unresolved address table lookups appear as the literal string `ADDRESS_TABLE_LOOKUP` in address fields. Guard against this in allowlist policies by requiring `solana.tx.address_table_lookups.count() == 0` or explicitly denying when `ADDRESS_TABLE_LOOKUP` appears.

## Bitcoin Transaction (bitcoin.tx)

| Field | Type | Description |
|-------|------|-------------|
| version | string | Transaction version |
| inputs | list\<BitcoinTxInput> | Inputs (each has tx_id, vout, sequence) |
| outputs | list\<BitcoinTxOutput> | Outputs (each has value in satoshis, script_pubkey, address, address_type) |
| locktime | BitcoinTxLocktime | Locktime (amount, type: 'Seconds' or 'Blocks') |
| fee | int | Total fee in satoshis |

## Tron Transaction (tron.tx)

| Field | Type | Description |
|-------|------|-------------|
| ref_block_bytes | string | Reference block height |
| ref_block_hash | string | Reference block hash |
| expiration | int | Expiration (ms) |
| timestamp | int | Timestamp (ms) |
| data | string | Transaction memo (not call data) |
| fee_limit | int | Max energy cost |
| contract | list\<TronContract> | Contract calls (access via `tron.tx.contract[0]`) |

### TronContract

| Field | Type | Available For |
|-------|------|---------------|
| type | string | All (e.g., `TransferContract`, `TriggerSmartContract`) |
| owner_address | string | All |
| to_address | string | TransferContract |
| amount | int | TransferContract (in sun, 1 TRX = 1,000,000 sun) |
| contract_address | string | TriggerSmartContract |
| call_value | int | TriggerSmartContract |
| data | string | TriggerSmartContract (function selector + params) |

## Activity Types Quick Reference

All signing activities map to resource `PRIVATE_KEY`, regardless of whether you sign with a wallet address or a private key directly.

| Resource | Action | Activity Type |
|----------|--------|---------------|
| WALLET | CREATE | `ACTIVITY_TYPE_CREATE_WALLET` |
| WALLET | CREATE | `ACTIVITY_TYPE_CREATE_WALLET_ACCOUNTS` |
| WALLET | DELETE | `ACTIVITY_TYPE_DELETE_WALLETS` |
| WALLET | EXPORT | `ACTIVITY_TYPE_EXPORT_WALLET` |
| WALLET | EXPORT | `ACTIVITY_TYPE_EXPORT_WALLET_ACCOUNT` |
| WALLET | IMPORT | `ACTIVITY_TYPE_IMPORT_WALLET` |
| PRIVATE_KEY | SIGN | `ACTIVITY_TYPE_SIGN_TRANSACTION_V2` |
| PRIVATE_KEY | SIGN | `ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2` |
| PRIVATE_KEY | SIGN | `ACTIVITY_TYPE_SIGN_RAW_PAYLOADS` |
| PRIVATE_KEY | SIGN | `ACTIVITY_TYPE_ETH_SEND_TRANSACTION` |
| PRIVATE_KEY | SIGN | `ACTIVITY_TYPE_SOL_SEND_TRANSACTION` |
| PRIVATE_KEY | EXPORT | `ACTIVITY_TYPE_EXPORT_PRIVATE_KEY` |
| POLICY | CREATE | `ACTIVITY_TYPE_CREATE_POLICY_V3` |
| POLICY | CREATE | `ACTIVITY_TYPE_CREATE_POLICIES` |
| POLICY | UPDATE | `ACTIVITY_TYPE_UPDATE_POLICY_V2` |
| POLICY | DELETE | `ACTIVITY_TYPE_DELETE_POLICY` |
| POLICY | DELETE | `ACTIVITY_TYPE_DELETE_POLICIES` |
| USER | CREATE | `ACTIVITY_TYPE_CREATE_USERS_V3` |
| USER | CREATE | `ACTIVITY_TYPE_CREATE_USERS_V4` |
| USER | CREATE | `ACTIVITY_TYPE_CREATE_API_ONLY_USERS` |
| USER | DELETE | `ACTIVITY_TYPE_DELETE_USERS` |
| CREDENTIAL | CREATE | `ACTIVITY_TYPE_CREATE_API_KEYS_V2` |
| CREDENTIAL | DELETE | `ACTIVITY_TYPE_DELETE_API_KEYS` |
| ORGANIZATION | CREATE | `ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V7` |
| AUTH | CREATE | `ACTIVITY_TYPE_EMAIL_AUTH_V3` |
| AUTH | CREATE | `ACTIVITY_TYPE_CREATE_READ_WRITE_SESSION_V2` |
| OTP | CREATE | `ACTIVITY_TYPE_INIT_OTP_V2` |
| OTP | VERIFY | `ACTIVITY_TYPE_VERIFY_OTP` |
