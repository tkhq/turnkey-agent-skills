# Policy CLI Examples

All examples use `turnkey request` to interact with the Turnkey API. Replace placeholder values (e.g., `<USER_ID>`, `<WALLET_ID>`) with your actual identifiers.

For JSON bodies containing single quotes in policy expressions, use shell escaping: `'\''` to insert a literal single quote inside a single-quoted string.

---

## Access Control

### Allow a specific user to create wallets

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "allow-user-create-wallets",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '\''<USER_ID>'\'')",
  "condition": "activity.resource == '\''WALLET'\'' && activity.action == '\''CREATE'\''",
  "notes": "Allow user to create wallets"
}'
```

### Allow users with a specific tag to create users

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "allow-admin-tag-create-users",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.tags.contains('\''<ADMIN_TAG_ID>'\''))",
  "condition": "activity.resource == '\''USER'\'' && activity.action == '\''CREATE'\''",
  "notes": "Users with admin tag can create new users"
}'
```

### Require two approvers to add policies (multi-sig)

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "require-two-approvers-for-policies",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.filter(user, user.tags.contains('\''<ADMIN_TAG_ID>'\'')).count() >= 2",
  "condition": "activity.resource == '\''POLICY'\'' && activity.action == '\''CREATE'\''",
  "notes": "Require two admins to approve policy creation"
}'
```

### Deny all delete actions for non-admin users

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "deny-non-admin-deletes",
  "effect": "EFFECT_DENY",
  "consensus": "approvers.any(user, user.tags.contains('\''<NON_ADMIN_TAG_ID>'\''))",
  "condition": "activity.action == '\''DELETE'\''",
  "notes": "Non-admin users cannot delete any resources"
}'
```

### Allow a specific user to create sub-organizations

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "allow-api-user-create-suborgs",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '\''<API_USER_ID>'\'')",
  "condition": "activity.resource == '\''ORGANIZATION'\'' && activity.action == '\''CREATE'\''",
  "notes": "API user can create sub-organizations for end users"
}'
```

### Allow auth-related activities (email auth, OTP, OAuth)

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "allow-api-user-auth-activities",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '\''<API_USER_ID>'\'')",
  "condition": "activity.resource in ['\''AUTH'\'', '\''OTP'\''] && activity.action in ['\''CREATE'\'', '\''VERIFY'\'']",
  "notes": "API user can initiate all auth flows"
}'
```

### Allow signing only with passkeys (credential type restriction)

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "require-passkey-for-signing",
  "effect": "EFFECT_ALLOW",
  "consensus": "credentials.any(credential, credential.type == '\''CREDENTIAL_TYPE_WEBAUTHN_AUTHENTICATOR'\'')",
  "condition": "activity.type == '\''ACTIVITY_TYPE_SIGN_TRANSACTION_V2'\''",
  "notes": "Only allow signing when authenticated with a passkey"
}'
```

---

## Signing Control

### Allow signing with a specific wallet

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "allow-user-sign-with-wallet",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '\''<USER_ID>'\'')",
  "condition": "activity.action == '\''SIGN'\'' && wallet.id == '\''<WALLET_ID>'\''",
  "notes": "User can sign with this specific wallet only"
}'
```

### Allow signing with a specific wallet account address

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "allow-sign-with-address",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '\''<USER_ID>'\'')",
  "condition": "activity.action == '\''SIGN'\'' && wallet_account.address == '\''<WALLET_ACCOUNT_ADDRESS>'\''",
  "notes": "User can sign with this specific address only"
}'
```

### Allow signing with a specific private key

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "allow-sign-with-private-key",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '\''<USER_ID>'\'')",
  "condition": "activity.action == '\''SIGN'\'' && private_key.id == '\''<PRIVATE_KEY_ID>'\''",
  "notes": "User can sign with this specific private key"
}'
```

---

## Ethereum Policies

### Address allowlist

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "eth-address-allowlist",
  "effect": "EFFECT_ALLOW",
  "condition": "eth.tx.to in ['\''0xADDR1'\'', '\''0xADDR2'\'', '\''0xADDR3'\'']",
  "consensus": "approvers.any(user, user.id == '\''<USER_ID>'\'')",
  "notes": "Only allow ETH transfers to approved addresses"
}'
```

### Allow testnet (Sepolia) transactions only

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "allow-sepolia-only",
  "effect": "EFFECT_ALLOW",
  "condition": "eth.tx.chain_id == 11155111",
  "consensus": "approvers.any(user, user.id == '\''<USER_ID>'\'')",
  "notes": "Only allow transactions on Sepolia testnet"
}'
```

### Allow ERC-20 transfers for a specific token

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "allow-usdc-transfers",
  "effect": "EFFECT_ALLOW",
  "condition": "eth.tx.to == '\''<TOKEN_CONTRACT_ADDRESS>'\'' && eth.tx.data[0..10] == '\''0xa9059cbb'\''",
  "notes": "Allow ERC-20 transfer() calls to the specified token contract"
}'
```

The `0xa9059cbb` is the function selector for `transfer(address,uint256)`.

### Block large ETH transfers

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "deny-large-eth-transfers",
  "effect": "EFFECT_DENY",
  "condition": "eth.tx.value > 1000000000000000000",
  "notes": "Deny ETH transfers over 1 ETH (value is in wei)"
}'
```

### Allow EIP-712 typed data signing (e.g., Hyperliquid)

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "allow-hyperliquid-approve-agent",
  "effect": "EFFECT_ALLOW",
  "condition": "eth.eip_712.domain.name == '\''HyperliquidSignTransaction'\'' && eth.eip_712.primary_type == '\''HyperliquidTransaction:ApproveAgent'\'' && activity.type == '\''ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2'\''",
  "notes": "Allow EIP-712 signing for Hyperliquid ApproveAgent"
}'
```

### Deny NO_OP hash signing (except EIP-712)

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "deny-noop-hash-signing",
  "effect": "EFFECT_DENY",
  "condition": "activity.type == '\''ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2'\'' && activity.params.hash_function == '\''HASH_FUNCTION_NO_OP'\'' && activity.params.encoding != '\''PAYLOAD_ENCODING_EIP712'\''",
  "notes": "Block raw payload signing with NO_OP hash (security measure)"
}'
```

---

## Solana Policies

### Allow transfers only from a specific sender

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "solana-allow-from-sender",
  "effect": "EFFECT_ALLOW",
  "condition": "solana.tx.transfers.all(transfer, transfer.from == '\''<SENDER_ADDRESS>'\'')",
  "notes": "All SOL transfers must originate from the specified address"
}'
```

### Allow single transfer to a specific recipient

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "solana-allow-single-transfer-to-recipient",
  "effect": "EFFECT_ALLOW",
  "condition": "solana.tx.transfers.count() == 1 && solana.tx.transfers[0].to == '\''<RECIPIENT_ADDRESS>'\''",
  "notes": "Allow exactly one SOL transfer to the specified recipient"
}'
```

### Restrict to System Program only

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "solana-system-program-only",
  "effect": "EFFECT_ALLOW",
  "condition": "solana.tx.program_keys.all(p, p == '\''11111111111111111111111111111111'\'')",
  "notes": "Only allow transactions using the System Program"
}'
```

### Deny transfers to a blocklisted address

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "solana-deny-bad-address",
  "effect": "EFFECT_DENY",
  "condition": "solana.tx.transfers.any(transfer, transfer.to == '\''<BLOCKED_ADDRESS>'\'')",
  "notes": "Block any SOL transfer to the specified address"
}'
```

### Deny address table lookups

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "solana-deny-address-table-lookups",
  "effect": "EFFECT_DENY",
  "condition": "solana.tx.address_table_lookups.count() > 0",
  "notes": "Block transactions that use address table lookups to prevent allowlist bypass"
}'
```

### SPL token transfer: restrict by token mint

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "solana-allow-usdc-only",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '\''<USER_ID>'\'')",
  "condition": "solana.tx.instructions.count() == solana.tx.spl_transfers.count() && solana.tx.spl_transfers.all(transfer, transfer.token_mint == '\''<USDC_MINT_ADDRESS>'\'')",
  "notes": "Only allow SPL transfers of USDC"
}'
```

### SPL token transfer: cap amount

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "solana-spl-amount-limit",
  "effect": "EFFECT_ALLOW",
  "consensus": "approvers.any(user, user.id == '\''<USER_ID>'\'')",
  "condition": "solana.tx.instructions.count() == 1 && solana.tx.spl_transfers.count() == 1 && solana.tx.spl_transfers.all(transfer, transfer.amount < 1000000)",
  "notes": "Allow single SPL transfer under 1 USDC (6 decimals = 1000000 atomic units)"
}'
```

---

## Bitcoin Policies

### Allow outputs to specific addresses only

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "bitcoin-address-allowlist",
  "effect": "EFFECT_ALLOW",
  "condition": "bitcoin.tx.outputs.all(o, o.address == '\''<BITCOIN_ADDRESS>'\'')",
  "notes": "All BTC outputs must go to the approved address"
}'
```

### Cap output values

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "bitcoin-output-limit",
  "effect": "EFFECT_ALLOW",
  "condition": "bitcoin.tx.outputs.all(o, o.value < 200000)",
  "notes": "All BTC outputs must be under 200,000 satoshis"
}'
```

### Cap transaction fees

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "bitcoin-fee-cap",
  "effect": "EFFECT_DENY",
  "condition": "bitcoin.tx.fee > 50000",
  "notes": "Deny BTC transactions with fees over 50,000 satoshis"
}'
```

---

## Tron Policies

### Allow TRX transfers under 10 TRX

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "tron-limit-trx-transfers",
  "effect": "EFFECT_ALLOW",
  "condition": "tron.tx.contract[0].amount < 10000000",
  "notes": "Allow TRX transfers under 10 TRX (1 TRX = 1,000,000 sun)"
}'
```

### Allow TRC-20 token transfers for a specific contract

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "tron-allow-tether-trc20",
  "effect": "EFFECT_ALLOW",
  "condition": "tron.tx.contract[0].contract_address == '\''<TETHER_CONTRACT_ADDRESS>'\'' && tron.tx.contract[0].data[0..8] == '\''a9059cbb'\''",
  "notes": "Allow Tether TRC-20 transfers on the specified contract"
}'
```

### Allow all TRX transfers

```bash
turnkey request --path /public/v1/submit/create_policy --body '{
  "policyName": "tron-allow-trx-transfers",
  "effect": "EFFECT_ALLOW",
  "condition": "tron.tx.contract[0].type == '\''TransferContract'\''",
  "notes": "Allow all native TRX transfers"
}'
```

---

## Agent Wallet Scoping (Complete Example)

A common pattern: give an agent permission to sign transactions to specific addresses and read wallet info, but nothing else.

```bash
turnkey request --path /public/v1/submit/create_policies --body '{
  "policies": [
    {
      "policyName": "agent-eth-signing",
      "effect": "EFFECT_ALLOW",
      "condition": "eth.tx.to in ['\''0xCONTRACT_1'\'', '\''0xCONTRACT_2'\'']",
      "consensus": "approvers.any(user, user.id == '\''<AGENT_USER_ID>'\'')",
      "notes": "Agent can sign ETH transactions to approved contracts only"
    },
    {
      "policyName": "agent-create-wallets",
      "effect": "EFFECT_ALLOW",
      "condition": "activity.resource == '\''WALLET'\'' && activity.action == '\''CREATE'\''",
      "consensus": "approvers.any(user, user.id == '\''<AGENT_USER_ID>'\'')",
      "notes": "Agent can create wallets"
    },
    {
      "policyName": "agent-deny-exports",
      "effect": "EFFECT_DENY",
      "condition": "activity.action == '\''EXPORT'\''",
      "consensus": "approvers.any(user, user.id == '\''<AGENT_USER_ID>'\'')",
      "notes": "Agent cannot export wallets or private keys"
    }
  ]
}'
```
