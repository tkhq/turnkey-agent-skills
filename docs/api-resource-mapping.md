# Turnkey API Resource Mapping

Proposed mapping of Turnkey API resources to agent skills. Each skill groups related resources that an AI agent would use together in typical workflows.

**7 skills covering 78 endpoints (28 query, 50 submit)**

---

## 1. Wallets

HD wallets and their derived blockchain addresses.

### Wallets

| Endpoint | Type | Description |
|----------|------|-------------|
| `/public/v1/query/get_wallet` | Query | Get details about a wallet |
| `/public/v1/query/list_wallets` | Query | List all wallets in an organization |
| `/public/v1/submit/create_wallet` | Submit | Create a wallet and derive addresses |
| `/public/v1/submit/update_wallet` | Submit | Update a wallet |
| `/public/v1/submit/delete_wallets` | Submit | Delete wallets |
| `/public/v1/submit/export_wallet` | Submit | Export a wallet (encrypted mnemonic) |
| `/public/v1/submit/import_wallet` | Submit | Complete wallet import |
| `/public/v1/submit/init_import_wallet` | Submit | Initialize wallet import |

### Wallet Accounts

| Endpoint | Type | Description |
|----------|------|-------------|
| `/public/v1/query/get_wallet_account` | Query | Get a single wallet account |
| `/public/v1/query/list_wallet_accounts` | Query | List all accounts within a wallet |
| `/public/v1/submit/create_wallet_accounts` | Submit | Derive additional addresses on a wallet |
| `/public/v1/submit/delete_wallet_accounts` | Submit | Delete wallet accounts |
| `/public/v1/submit/export_wallet_account` | Submit | Export a wallet account |

**Total: 13 endpoints (4 query, 9 submit)**

---

## 2. Private Keys

Standalone cryptographic keys and their tags for policy targeting.

### Private Keys

| Endpoint | Type | Description |
|----------|------|-------------|
| `/public/v1/query/get_private_key` | Query | Get details about a private key |
| `/public/v1/query/list_private_keys` | Query | List all private keys in an organization |
| `/public/v1/submit/create_private_keys` | Submit | Create new private keys |
| `/public/v1/submit/delete_private_keys` | Submit | Delete private keys |
| `/public/v1/submit/export_private_key` | Submit | Export a private key |
| `/public/v1/submit/import_private_key` | Submit | Complete private key import |
| `/public/v1/submit/init_import_private_key` | Submit | Initialize private key import |

### Private Key Tags

| Endpoint | Type | Description |
|----------|------|-------------|
| `/public/v1/query/list_private_key_tags` | Query | List all private key tags |
| `/public/v1/submit/create_private_key_tag` | Submit | Create a tag and attach to keys |
| `/public/v1/submit/update_private_key_tag` | Submit | Update tag name or associated keys |
| `/public/v1/submit/delete_private_key_tags` | Submit | Delete private key tags |

**Total: 11 endpoints (3 query, 8 submit)**

---

## 3. Signing

Transaction signing, raw payload signing, sponsored transactions, and on-chain data queries.

### Signing

| Endpoint | Type | Description |
|----------|------|-------------|
| `/public/v1/submit/sign_transaction` | Submit | Sign a typed transaction (ETH, SOL, BTC, TRON) |
| `/public/v1/submit/sign_raw_payload` | Submit | Sign a raw payload (any chain) |
| `/public/v1/submit/sign_raw_payloads` | Submit | Batch sign multiple raw payloads |
| `/public/v1/submit/eth_send_transaction` | Submit | Broadcast a sponsored/gasless EVM transaction |
| `/public/v1/submit/sol_send_transaction` | Submit | Broadcast a sponsored/gasless SVM transaction |

### Balances and Network Data

| Endpoint | Type | Description |
|----------|------|-------------|
| `/public/v1/query/get_balances` | Query | Get asset balances for an address (beta) |
| `/public/v1/query/get_nonces` | Query | Get on-chain and gas station nonces |
| `/public/v1/query/get_gas_usage` | Query | Get gas usage and limits for sponsored transactions |
| `/public/v1/query/list_supported_assets` | Query | List supported assets for a network (beta) |
| `/public/v1/query/get_send_transaction_status` | Query | Poll status of a send transaction |

**Total: 10 endpoints (4 query, 6 submit)**

---

## 4. Policies

Access control rules, batch operations, and smart contract interfaces for policy engine context.

### Policies

| Endpoint | Type | Description |
|----------|------|-------------|
| `/public/v1/query/get_policy` | Query | Get policy details |
| `/public/v1/query/list_policies` | Query | List all policies |
| `/public/v1/query/get_policy_evaluations` | Query | Get policy evaluations for an activity |
| `/public/v1/submit/create_policy` | Submit | Create a single policy |
| `/public/v1/submit/create_policies` | Submit | Create multiple policies (batch) |
| `/public/v1/submit/update_policy` | Submit | Update an existing policy |
| `/public/v1/submit/delete_policy` | Submit | Delete a single policy |
| `/public/v1/submit/delete_policies` | Submit | Delete multiple policies (batch) |

### Smart Contract Interfaces

| Endpoint | Type | Description |
|----------|------|-------------|
| `/public/v1/query/get_smart_contract_interface` | Query | Get a smart contract interface |
| `/public/v1/query/list_smart_contract_interfaces` | Query | List all smart contract interfaces |
| `/public/v1/submit/create_smart_contract_interface` | Submit | Upload ABI/IDL for policy engine |
| `/public/v1/submit/delete_smart_contract_interface` | Submit | Delete a smart contract interface |

**Total: 12 endpoints (5 query, 7 submit)**

---

## 5. Activities

Activity monitoring, consensus approval workflows, and audit trails.

### Activities

| Endpoint | Type | Description |
|----------|------|-------------|
| `/public/v1/query/get_activity` | Query | Get details about an activity |
| `/public/v1/query/list_activities` | Query | List all activities in an organization |
| `/public/v1/query/list_app_proofs` | Query | List app proofs for an activity |
| `/public/v1/submit/approve_activity` | Submit | Approve a pending activity |
| `/public/v1/submit/reject_activity` | Submit | Reject a pending activity |

**Total: 5 endpoints (3 query, 2 submit)**

---

## 6. Users

User lifecycle, tags for policy targeting, and API key credential management.

### Users

| Endpoint | Type | Description |
|----------|------|-------------|
| `/public/v1/query/get_user` | Query | Get user details |
| `/public/v1/query/list_users` | Query | List all users |
| `/public/v1/query/whoami` | Query | Get current user and org info |
| `/public/v1/submit/create_users` | Submit | Create users in an organization |
| `/public/v1/submit/delete_users` | Submit | Delete users |
| `/public/v1/submit/update_user` | Submit | Update a user |
| `/public/v1/submit/update_user_email` | Submit | Update a user's email |
| `/public/v1/submit/update_user_name` | Submit | Update a user's name |
| `/public/v1/submit/update_user_phone_number` | Submit | Update a user's phone number |
| `/public/v1/submit/recover_user` | Submit | Recover a user by adding an authenticator |

### User Tags

| Endpoint | Type | Description |
|----------|------|-------------|
| `/public/v1/query/list_user_tags` | Query | List all user tags |
| `/public/v1/submit/create_user_tag` | Submit | Create a tag and attach to users |
| `/public/v1/submit/update_user_tag` | Submit | Update tag name or associated users |
| `/public/v1/submit/delete_user_tags` | Submit | Delete user tags |

### API Keys

| Endpoint | Type | Description |
|----------|------|-------------|
| `/public/v1/query/get_api_key` | Query | Get details about an API key |
| `/public/v1/query/get_api_keys` | Query | Get API keys for a user |
| `/public/v1/submit/create_api_keys` | Submit | Add API keys to a user |
| `/public/v1/submit/delete_api_keys` | Submit | Remove API keys from a user |

**Total: 18 endpoints (6 query, 12 submit)**

---

## 7. Organizations

Organization structure, sub-organization management, and root quorum configuration.

### Organizations and Sub-Organizations

| Endpoint | Type | Description |
|----------|------|-------------|
| `/public/v1/query/get_configs` | Query | Get quorum settings and features |
| `/public/v1/query/get_sub_organizations` | Query | Get all sub-org IDs (with optional filter) |
| `/public/v1/query/get_verified_sub_organizations` | Query | Get verified sub-org IDs |
| `/public/v1/submit/create_sub_organization` | Submit | Create a sub-organization |
| `/public/v1/submit/delete_sub_organization` | Submit | Delete a sub-organization |
| `/public/v1/submit/update_organization_name` | Submit | Update org name |
| `/public/v1/submit/set_organization_feature` | Submit | Set an org feature (root quorum required) |
| `/public/v1/submit/remove_organization_feature` | Submit | Remove an org feature (root quorum required) |
| `/public/v1/submit/update_root_quorum` | Submit | Set root quorum threshold and members |

**Total: 9 endpoints (3 query, 6 submit)**

---

## Summary

| Skill | Query | Submit | Total |
|-------|-------|--------|-------|
| Wallets | 4 | 9 | 13 |
| Private Keys | 3 | 8 | 11 |
| Signing | 4 | 6 | 10 |
| Policies | 5 | 7 | 12 |
| Activities | 3 | 2 | 5 |
| Users | 6 | 12 | 18 |
| Organizations | 3 | 6 | 9 |
| **Total** | **28** | **50** | **78** |

---

## Resources Not Included

The following API resources were excluded because they serve human UX flows or one-time infrastructure setup rather than agentic workflows:

| Resource | Endpoints | Reason for exclusion |
|----------|-----------|---------------------|
| Authentication/Sessions | 20 | Human login flows (OTP, OAuth, passkeys, sessions) |
| Authenticators | 4 | WebAuthn/passkey management (human UX) |
| Invitations | 2 | Email-based org onboarding (admin task) |
| OAuth Providers | 3 | Per-user OAuth identity config |
| OAuth 2.0 Credentials | 5 | Org-level OAuth provider config |
| Webhooks | 4 | One-time infrastructure setup |
| Fiat On Ramp | 6 | Provider integration config |
| Verifiable Cloud | 3 | Infrastructure-level attestation |
