---
name: turnkey-defi-integration
description: 'Cross-chain DeFi integration guide using Turnkey for trading, yield, and automation on EVM and Solana (SVM). Covers wallet architecture, delegated access, policy-scoped signing, gas sponsorship, and operational best practices. Based on the Infinex integration pattern. Use when asked to "build a DeFi platform with Turnkey", "set up delegated signing for trading", "implement gasless swaps", "create a cross-chain trading bot", "add policy-scoped automation", or any multi-chain DeFi application requiring user custody with backend signing automation.'
compatibility: "Requires Node.js. Server: @turnkey/sdk-server. EVM: @turnkey/viem or @turnkey/ethers. SVM: @turnkey/solana. Frontend: @turnkey/sdk-react. Set TURNKEY_API_PUBLIC_KEY, TURNKEY_API_PRIVATE_KEY, TURNKEY_ORGANIZATION_ID env vars."
depends_on:
  - turnkey-wallet-management
metadata:
  version: "1.0.0"
  tags: ["turnkey", "defi", "trading", "yield", "evm", "solana", "svm", "delegated-access", "policy", "gas-sponsorship", "cross-chain", "infinex"]
  sdk_versions:
    "@turnkey/sdk-server": "^5.1.0"
    "@turnkey/viem": "^0.14.25"
    "@turnkey/ethers": "^1.3.25"
    "@turnkey/solana": "^0.5.16"
---

# Turnkey DeFi Integration: Trading & Yield on EVM + SVM

## Overview

Use this skill to build DeFi platforms that integrate Turnkey for cross-chain trading and yield operations across EVM and Solana (SVM) networks. This guide generalizes the Infinex architecture — Turnkey + Gelato delivering a unified DeFi UX with passkey auth, gasless transactions, and cross-chain operations — into a reusable pattern.

It covers:
- **Wallet architecture** — one sub-org per user, one HD wallet with both EVM and SVM accounts
- **Authentication** — passkey primary, OAuth/OTP fallback, session management
- **Delegated Access (DA)** — backend signing automation within strict policy bounds
- **Policy engine** — EVM and SVM transaction-level scoping for DeFi contracts
- **Gas sponsorship** — gasless EVM transactions and SVM fee payer patterns
- **Security** — defense in depth, key lifecycle, incident response

### Architecture at a glance

- **One Turnkey parent organization** for your platform
- **One sub-organization per end user** (created at signup)
- Each sub-org contains **one HD wallet** with both EVM and SVM accounts
- **User-controlled custody with Delegated Access**: the end user owns their sub-org and wallet; your backend holds a scoped P-256 API key within each sub-org for automated signing, governed by the policy engine
- Users can **revoke access** and **export their keys** at any time — this is non-custodial

### Supported curves and chains

| Curve | Chains | Turnkey tier |
|-------|--------|-------------|
| Secp256k1 | Ethereum, Arbitrum, Optimism, Base, Polygon, BSC, Avalanche, any EVM | Tier 4 (transaction parsing + policies) |
| Ed25519 | Solana, any SVM | Tier 4 (transaction parsing + policies + IDL support) |

Turnkey operates at the curve level. If the curve is supported, you can sign for that chain.

## Rules

- **Never expose parent organization API keys to the client.** All DA signing, sub-org creation, and policy management must run server-side.
- **Always verify the user's identity before creating a sub-organization.** Use passkey attestation, verified OAuth, or verified OTP — never create sub-orgs from unverified input.
- **Always scope DA policies as narrowly as possible.** Whitelist specific contract addresses, function selectors, and value ranges. Use DENY policies as hard caps.
- **Always validate transactions at the application layer before submitting to Turnkey.** The policy engine is a security boundary, not a substitute for business logic validation.

## Prerequisites

```bash
# Server-side (required)
npm install @turnkey/sdk-server

# EVM signing (pick one)
npm install @turnkey/viem viem          # recommended for new projects
npm install @turnkey/ethers ethers      # if you use ethers.js

# SVM signing
npm install @turnkey/solana @solana/web3.js

# Frontend (React)
npm install @turnkey/sdk-react
```

## Environment Variables

```env
TURNKEY_API_PUBLIC_KEY=    # Turnkey API key — public component (hex)
TURNKEY_API_PRIVATE_KEY=   # Turnkey API key — private component (P-256 hex)
TURNKEY_ORGANIZATION_ID=   # Turnkey parent organization UUID
```

Signing skills also use:

```env
SIGN_WITH=                 # Address or public key of the wallet account to sign with
EVM_RPC_URL=               # JSON-RPC endpoint for the target EVM chain
SOLANA_RPC_URL=            # Solana RPC endpoint
```

## Instructions

### Wallet setup

#### Create sub-org with multichain wallet

Each user gets a single HD wallet with accounts derived on both curves. One wallet, one seed, multiple chains.

```json
{
  "type": "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V7",
  "parameters": {
    "subOrganizationName": "user-<uid>",
    "rootUsers": [
      {
        "userName": "end-user",
        "authenticators": [
          {
            "authenticatorName": "user-passkey",
            "challenge": "<webauthn-challenge>",
            "attestation": {
              "credentialId": "<credential-id>",
              "clientDataJson": "<client-data-json>",
              "attestationObject": "<attestation-object>",
              "transports": ["AUTHENTICATOR_TRANSPORT_HYBRID"]
            }
          }
        ],
        "apiKeys": [],
        "oauthProviders": []
      }
    ],
    "rootQuorumThreshold": 1,
    "wallet": {
      "walletName": "Main Wallet",
      "accounts": [
        {
          "curve": "CURVE_SECP256K1",
          "pathFormat": "PATH_FORMAT_BIP32",
          "path": "m/44'/60'/0'/0/0",
          "addressFormat": "ADDRESS_FORMAT_ETHEREUM"
        },
        {
          "curve": "CURVE_ED25519",
          "pathFormat": "PATH_FORMAT_BIP32",
          "path": "m/44'/501'/0'/0'",
          "addressFormat": "ADDRESS_FORMAT_SOLANA"
        }
      ]
    }
  }
}
```

Using the React SDK, wallet creation is simpler:

```tsx
import { useTurnkey } from "@turnkey/sdk-react";

const { createWallet } = useTurnkey();

const walletId = await createWallet({
  walletName: "Main Wallet",
  accounts: ["ADDRESS_FORMAT_ETHEREUM", "ADDRESS_FORMAT_SOLANA"],
});
```

#### Adding accounts later

Derive additional accounts from the same wallet seed at any time:

```tsx
const { createWalletAccounts } = useTurnkey();

await createWalletAccounts({
  walletId: existingWalletId,
  accounts: ["ADDRESS_FORMAT_ETHEREUM"],
});
```

#### HD wallet default paths

- Ethereum: `m/44'/60'/0'/0/0`
- Solana: `m/44'/501'/0'/0'`

Paths cannot be reused within the same HD wallet. Additional accounts auto-increment the path index.

#### SDK packages

| Chain | Package | Usage |
|-------|---------|-------|
| EVM (viem) | `@turnkey/viem` | Drop-in `Account` for viem wallet clients |
| EVM (ethers) | `@turnkey/ethers` | Drop-in `TurnkeySigner` for ethers.js |
| EVM (EIP-1193) | `@turnkey/eip-1193-provider` | Standard Ethereum provider interface |
| SVM | `@turnkey/solana` | `TurnkeySigner` wrapping `@solana/web3.js` |
| Gas sponsorship (EVM) | Built-in via `ethSendTransaction` | Set `sponsor: true` on any EVM transaction |
| React | `@turnkey/sdk-react` | Frontend hooks for auth, wallet creation, signing, sessions |
| Server | `@turnkey/sdk-server` | Backend client for DA signing, sub-org management, policy creation |

---

### Delegated Access setup

Delegated Access lets your backend sign transactions on behalf of users within strict policy bounds. The DA user is a non-root API key user inside the user's sub-org with zero permissions until policies are explicitly added.

#### 1. Create backend API key user in sub-org

Frontend-initiated (recommended) — the DA user is never granted root access:

```tsx
import { fetchOrCreateP256ApiKeyUser } from "@turnkey/sdk-react";

const daUser = await fetchOrCreateP256ApiKeyUser({
  publicKey: BACKEND_DA_PUBLIC_KEY,
  createParams: {
    userName: "Trading Automation",
    apiKeyName: "trading-backend-key",
  },
});
```

This is idempotent — calling with the same `publicKey` returns the existing user. Until policies are added, this user cannot do anything.

#### 2. Scope policies for DeFi operations

Policies define what the DA user can sign and under what conditions. All actions are implicitly denied unless a policy explicitly allows them.

**EVM: Allow swaps on Uniswap V3 Router**

```typescript
const policies = [
  {
    policyName: "Allow DA user to swap via Uniswap V3",
    effect: "EFFECT_ALLOW",
    consensus: `approvers.any(user, user.id == '${daUser.userId}')`,
    condition: `eth.tx.to == '0xE592427A0AEce92De3Edee1F18E0157C05861564'`,
    notes: "Scoped to Uniswap V3 SwapRouter on Ethereum mainnet",
  },
];
```

**EVM: Allow specific function selectors on a vault contract**

```typescript
const vaultPolicy = {
  policyName: "Allow DA user to deposit into Yearn vault",
  effect: "EFFECT_ALLOW",
  consensus: `approvers.any(user, user.id == '${daUserId}')`,
  condition: `eth.tx.to == '0xVAULT_ADDRESS' && eth.tx.data[0..4] == '0xd0e30db0'`,
};
```

**SVM: Allow Jupiter swap transactions**

```typescript
const jupiterPolicy = {
  policyName: "Allow DA user to execute Jupiter swaps",
  effect: "EFFECT_ALLOW",
  consensus: `approvers.any(user, user.id == '${daUserId}')`,
  condition: `solana.tx.instructions.count() <= 6 && solana.tx.instructions.any(ix, ix.program_id == 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4')`,
};
```

**SVM: Allow transfers only to a specific address**

```typescript
const transferPolicy = {
  policyName: "Allow DA user transfers to treasury only",
  effect: "EFFECT_ALLOW",
  consensus: `approvers.any(user, user.id == '${daUserId}')`,
  condition: `solana.tx.instructions.count() == 1 && solana.tx.transfers.count() == 1 && solana.tx.transfers.all(transfer, transfer.to == '<TREASURY_ADDRESS>')`,
};
```

**Dynamic per-order policies** — for limit orders and automation flows:

```typescript
const orderPolicy = {
  policyName: `Limit order ${orderId}: swap on Jupiter`,
  effect: "EFFECT_ALLOW",
  consensus: `approvers.any(user, user.id == '${daUserId}')`,
  condition: `solana.tx.recent_blockhash == '${recentBlockhash}'`,
};
```

`solana.tx.recent_blockhash` time-bounds a transaction to ~60–90 seconds.

#### 3. Backend signing

**EVM signing with viem:**

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { createAccount } from "@turnkey/viem";
import { createWalletClient, http } from "viem";
import { arbitrum } from "viem/chains";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const account = await createAccount({
  client,
  organizationId: userSubOrgId,
  signWith: userEvmAddress,
});

const walletClient = createWalletClient({
  account,
  chain: arbitrum,
  transport: http(process.env.EVM_RPC_URL!),
});

const hash = await walletClient.sendTransaction({
  to: UNISWAP_ROUTER,
  data: swapCalldata,
  value: 0n,
});
```

**EVM signing with ethers:**

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { TurnkeySigner } from "@turnkey/ethers";
import { ethers } from "ethers";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const signer = new TurnkeySigner({
  client,
  organizationId: userSubOrgId,
  signWith: userEvmAddress,
});

const provider = new ethers.JsonRpcProvider(process.env.EVM_RPC_URL!);
const connectedSigner = signer.connect(provider);

const tx = await connectedSigner.sendTransaction({
  to: UNISWAP_ROUTER,
  data: swapCalldata,
  value: 0,
});
```

**SVM signing with @turnkey/solana:**

```typescript
import { Turnkey } from "@turnkey/sdk-server";
import { TurnkeySigner } from "@turnkey/solana";
import { Connection, Transaction, PublicKey } from "@solana/web3.js";

const turnkey = new Turnkey({
  apiBaseUrl: "https://api.turnkey.com",
  apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
  apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
  defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID!,
});
const client = turnkey.apiClient();

const solSigner = new TurnkeySigner({
  organizationId: userSubOrgId,
  client,
});

const connection = new Connection(process.env.SOLANA_RPC_URL!);

const tx = new Transaction().add(jupiterSwapInstruction);
tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
tx.feePayer = new PublicKey(userSolanaAddress);

const signedTx = await solSigner.signTransaction(tx, userSolanaAddress);
const sig = await connection.sendRawTransaction(signedTx.serialize());
```

---

### Integration patterns for DeFi

#### Trading (swaps, limit orders, automation)

| Pattern | Implementation | Policy approach |
|---------|---------------|----------------|
| Market swap | User passkey sign (interactive) or DA backend sign to whitelisted router | Static policy per router contract |
| Limit order | Backend monitors price feed, DA-signs when conditions met | Dynamic policy per order, or static policy scoped to router |
| Stop loss | Same as limit order with price threshold trigger | Same as limit order |
| TWAP | Backend splits order across time intervals, each DA-signed | Static policy to router, app-layer enforces timing |
| DCA | Scheduled periodic buys via backend DA signing | Static policy to router + swap amount limits at app layer |

#### Yield operations

| Pattern | Implementation | Policy approach |
|---------|---------------|----------------|
| Deposit to vault | DA-signed approve + deposit to whitelisted vault | Static policy per vault address + function selector |
| Harvest rewards | Backend triggers periodic DA-signed claim transactions | Static policy per rewards contract |
| Auto-compound | Harvest + redeposit in sequence, both DA-signed | Policy covers both claim and deposit targets |
| Unstake/withdraw | Require user passkey co-sign for exits above threshold | Raise root quorum to 2-of-2 for high-value operations |

#### Cross-chain operations

Turnkey is chain-agnostic at the signing layer. Cross-chain routing (bridging, CCTP, Li.Fi) is handled at your application layer.

Common pattern:
1. Submit EVM bridge tx via `ethSendTransaction` with `sponsor: true` (e.g., CCTP burn on Base)
2. Wait for bridge finality at your application layer
3. Sign SVM claim tx via `@turnkey/solana` (e.g., CCTP mint on Solana)

Both use the same sub-org wallet, different accounts (Secp256k1 for EVM, Ed25519 for SVM). Policy engine evaluates each signing request independently.

#### Sessions for batched operations

For interactive flows where users sign multiple transactions in sequence (e.g., approve + swap + stake):

```typescript
const session = await turnkey.loginWithPasskey({
  sessionType: "SESSION_TYPE_READ_WRITE",
  expirationSeconds: 1800,
});
```

Sessions are backed by expiring API keys in IndexedDB (non-extractable). A user can have up to 10 active session keys; exceeding this auto-deletes the oldest.

---

### Transaction management and gas sponsorship

Turnkey provides built-in transaction management: construction, gas estimation, signing, broadcasting, and monitoring. Combined with gas sponsorship, users never need to hold native tokens.

#### EVM: Sponsored transactions

```typescript
const sendResult = await client.ethSendTransaction({
  transaction: {
    from: userEvmAddress,
    to: UNISWAP_ROUTER,
    value: "0",
    data: swapCalldata,
    caip2: "eip155:8453",
    sponsor: true,
  },
});
```

Using the React SDK:

```tsx
const { handleSendTransaction, wallets } = useTurnkey();

await handleSendTransaction({
  transaction: {
    from: wallets[0].accounts[0].address,
    to: UNISWAP_ROUTER,
    value: "0",
    data: swapCalldata,
    caip2: "eip155:8453",
    sponsor: true,
  },
});
```

**Supported chains:** Base (eip155:8453), Polygon (eip155:137), Ethereum (eip155:1). Contact Turnkey for additional chains.

#### Transaction statuses

| Status | Description |
|--------|-------------|
| INITIALIZED | Transaction constructed and signed, gas sponsorship prepared, not yet broadcast |
| BROADCASTING | Actively broadcasting, awaiting inclusion |
| INCLUDED | Included in a block |
| FAILED | Could not be included, will not be retried automatically |

For reverted transactions, Turnkey runs simulation to produce structured execution traces and decoded revert reasons.

#### Spend limits

USD-denominated gas limits at two levels: all-org and per sub-org. Configure in the Turnkey dashboard.

```typescript
const resp = await client.getGasUsage({});
if (resp.usageUsd > resp.windowLimitUsd * 0.9) {
  console.warn("Approaching gas sponsorship limit");
}
```

#### Policy compatibility

Policies work identically for sponsored and non-sponsored transactions using the same `eth.tx` namespace. Toggle `sponsor: true/false` without changing policies.

#### SVM: Fee payer pattern

Solana gas sponsorship uses a fee payer. Your backend funds a fee payer account:

```typescript
import { TurnkeySigner } from "@turnkey/solana";
import { Connection, Transaction, PublicKey } from "@solana/web3.js";

const connection = new Connection(process.env.SOLANA_RPC_URL!);

const tx = new Transaction().add(userSwapInstruction);
tx.feePayer = new PublicKey(PLATFORM_FEE_PAYER_ADDRESS);
tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

const signedTx = await turnkeySigner.signTransaction(tx, userSolanaAddress);
const sig = await connection.sendRawTransaction(signedTx.serialize());
```

See also: [turnkey-solana-paymaster](https://github.com/tkhq/turnkey-solana-paymaster), [Solana gasless transactions guide](https://docs.turnkey.com/reference/solana-gasless-transactions)

---

### Policy engine reference

#### EVM transaction fields

| Field | Description | Example |
|-------|-------------|---------|
| `eth.tx.to` | Destination address | `eth.tx.to == '0xUNISWAP_ROUTER'` |
| `eth.tx.value` | ETH value in wei | `eth.tx.value < 1000000000000000000` (< 1 ETH) |
| `eth.tx.data[0..4]` | Function selector (first 4 bytes) | `eth.tx.data[0..4] == '0xa9059cbb'` (ERC-20 transfer) |
| `eth.tx.data[...]` | Full calldata inspection | Deep calldata parsing for argument validation |

#### SVM transaction fields

| Field | Description | Example |
|-------|-------------|---------|
| `solana.tx.instructions.count()` | Number of instructions | `solana.tx.instructions.count() <= 5` |
| `solana.tx.instructions.any(ix, ...)` | Instruction-level conditions | `...any(ix, ix.program_id == '<PROGRAM_ID>')` |
| `solana.tx.transfers.count()` | Number of transfers | `solana.tx.transfers.count() == 1` |
| `solana.tx.transfers.all(transfer, ...)` | Transfer conditions | `...all(t, t.to == '<ADDRESS>')` |
| `solana.tx.recent_blockhash` | Blockhash for time-bounding | Valid ~60–90 seconds |

#### Solana IDLs for richer policy enforcement

Upload Solana IDLs to Turnkey's policy engine for decoded instruction-level policies. Instead of matching raw program IDs, you can write policies against decoded instruction arguments (e.g., max swap amount, specific token mint). See: [Smart contract interfaces guide](https://docs.turnkey.com/concepts/policies/smart-contract-interfaces)

#### Policy composition

Combine conditions for defense-in-depth:

```text
eth.tx.to == '0xE592427A0AEce92De3Edee1F18E0157C05861564' &&
eth.tx.data[0..4] == '0x414bf389' &&
eth.tx.value < 1000000000000000000
```

Add DENY policies as guardrails — DENY takes precedence over ALLOW:

```typescript
const denyPolicy = {
  policyName: "Deny all transactions above 10 ETH",
  effect: "EFFECT_DENY",
  consensus: `approvers.any(user, user.id == '${daUserId}')`,
  condition: `eth.tx.value > 10000000000000000000`,
};
```

#### Policy evaluation order

1. If a **root quorum user** takes the action → always ALLOW (bypasses all policies)
2. If any applicable policy evaluates to **EFFECT_DENY** → DENY (even if others ALLOW)
3. If one or more policies evaluate to **EFFECT_ALLOW** (and none DENY) → ALLOW
4. If no policies match → **implicit deny**

**Gotchas:**
- The policy engine does **not short-circuit**. If any clause errors, that policy's evaluation errors entirely.
- Avoid combining conditions that reference different resource types in a single policy (e.g., `wallet.id == '...' || private_key.id == '...'` will always error). Break these into separate policies.
- **EIP-712 note:** All hex-encoded strings (addresses, selectors, bytes) must be **lowercase**. The policy engine normalizes EIP-712 messages to lowercase.
- **int type limit:** The policy engine's `int` type is limited to 128 bits (i128). EVM smart contracts support up to int256, but values exceeding the 128-bit signed range cannot be used in policy conditions.

---

### Validating policy configuration

#### Positive and negative signing tests

After configuring DA policies, validate with both allowed and denied transactions:

```typescript
// Positive test: transaction that matches the allowed policy
try {
  const hash = await walletClient.sendTransaction({
    to: UNISWAP_ROUTER,
    data: swapCalldata,
    value: 0n,
  });
  console.log("PASS: Allowed transaction signed successfully", hash);
} catch (e) {
  console.error("FAIL: Allowed transaction was rejected", e);
}

// Negative test: transaction to a non-whitelisted address
try {
  const hash = await walletClient.sendTransaction({
    to: "0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF",
    data: "0x",
    value: 0n,
  });
  console.error("FAIL: Unauthorized transaction was signed!");
} catch (e) {
  console.log("PASS: Unauthorized transaction correctly denied");
}
```

Run these tests on every chain and for every DA policy before enabling automated signing in production.

#### Pre-production policy checklist

**DA user setup:**
- DA user is created as non-root (frontend-initiated recommended)
- DA user has zero permissions before policies are added
- Only one DA user exists per sub-org

**Policy scoping:**
- Each ALLOW policy targets the minimum set of contracts/addresses needed
- Function selectors are specified where possible (not just `eth.tx.to`)
- DENY guardrail policies exist for value caps and unauthorized contracts
- No policies use `||` across different resource types
- EIP-712 hex strings are lowercase
- Solana policies constrain instruction count, not just program ID

**Validation tests:**
- Positive test passes on each chain for each allowed operation
- Negative test is denied on each chain for each restricted operation
- DA user cannot create/delete wallets, users, or policies
- Root quorum user is not blocked by DENY policies that target DA user only

**Operational:**
- DA API key stored in HSM/vault, not in env vars or code
- Key rotation schedule is defined (recommended: quarterly minimum)
- Audit log monitoring configured for denied signing attempts
- Webhook alerts set up for policy evaluation failures

---

### Security best practices

#### Defense in depth for signing automation

1. **Policy engine (first line):** Scope DA policies as narrowly as possible. Whitelist specific contract addresses, function selectors, and value ranges. Use DENY policies as hard caps.
2. **Application-layer validation (second line):** Before submitting to Turnkey, validate the transaction at your application layer. Don't rely solely on the policy engine for business rule enforcement.
3. **Monitoring and alerting (third line):** Monitor the Turnkey audit log for denied signing attempts and unexpected activity. Set up webhooks for real-time alerting.
4. **Rate limiting (fourth line):** Implement application-layer rate limits on signing requests, independent of Turnkey's API rate limits.

#### DA API key lifecycle

| Practice | Recommendation |
|----------|---------------|
| Storage | HSM or secrets vault (AWS Secrets Manager, HashiCorp Vault). Never in env vars or code. |
| Rotation | Quarterly minimum. Create new key, update policies, delete old key. |
| Monitoring | Log every use. Alert on usage outside expected hours or IPs. |
| Revocation | If compromised: immediately delete the DA user or remove all ALLOW policies. |
| Short-lived keys | For time-sensitive operations, consider keys with `expirationSeconds`. |
| Scope separation | Different DA users for different risk levels. |

#### Root quorum configuration

For production DeFi applications:
- Set root quorum threshold to **2-of-N** for the parent organization
- Root users should have **multiple authenticators** (passkey + backup security key)
- Consider a "break glass" root user stored in a physical safe for disaster recovery

#### Incident response: compromised DA key

1. **Immediately** remove all ALLOW policies from the affected sub-org (or delete the DA user)
2. **Audit** the activity log for unauthorized signing
3. **Rotate** the DA key with fresh credentials
4. **Re-apply** policies to the new DA user
5. **Review** how the compromise occurred

The policy engine provides a strong containment boundary: even a compromised DA key can only sign transactions that match existing policies.

---

### Operational considerations

#### Performance

| Metric | Value |
|--------|-------|
| Signing latency (P50) | ~76ms |
| Signing latency (P95) | ~100ms |
| Signing latency (P99) | ~130ms |
| Wallet creation | 100–200ms end-to-end |
| Infrastructure | Horizontally scalable, multi-region |

#### Rate limits

- Contact Turnkey for pre-approved rate limits if you expect >60 RPS
- Burst traffic (2–3x sustained) is typical during market volatility
- Implement retry logic with exponential backoff
- A user can have up to 10 active session keys

#### Monitoring and audit

Turnkey provides a tamper-proof audit log queryable via API. Custom webhooks are available for signing events, policy evaluations, and user/wallet lifecycle events.

#### Shared responsibility model

Turnkey secures the platform (enclave code, key confidentiality, integrity, availability). Your team is responsible for proper auth flows, credential management, root quorum settings, policy definition, and backend infrastructure security.

See: [Shared responsibility model](https://docs.turnkey.com/security/shared-responsibility-model)

## Troubleshooting

**DA user can sign transactions that should be denied**
Policy is too broad. Review the `condition` field — ensure it specifies the exact contract address, function selector, and value range. Add DENY guardrail policies as hard caps. Run negative signing tests.

**DA user cannot sign transactions that should be allowed**
No matching ALLOW policy, or a DENY policy is overriding. List all policies in the sub-org via `getPolicies` and check for conflicting DENY rules. Remember: DENY always wins over ALLOW.

**Policy evaluation errors (not denied, but errored)**
A clause in the policy condition references a field that doesn't exist for this transaction type. Avoid combining `eth.tx.*` and `solana.tx.*` or `wallet.id` and `private_key.id` in a single policy. Break into separate policies.

**EIP-712 signing rejected despite matching policy**
Hex strings in EIP-712 policies must be lowercase. The policy engine normalizes messages to lowercase, so `0xABCD` in your policy won't match the normalized `0xabcd`.

**Gasless (sponsored) transaction fails**
Check spend limits in the Turnkey dashboard. Verify the chain is supported for sponsorship (Base, Polygon, Ethereum). Ensure the transaction is valid and would succeed even without sponsorship.

**Session expired during batched operations**
Default session is 15 minutes. Use `expirationSeconds` to extend. Sessions can be refreshed to extend their lifetime. Maximum 10 active session keys per user.

**Signing latency higher than expected**
Turnkey P50 is ~76ms, P99 ~130ms. If you see much higher latency, check your network path to the Turnkey API. Multi-region deployment (us-east-1, eu-central-1, ap-southeast-1) is available.

**Sub-org creation fails**
Verify the parent org API key has permission. Check that the passkey attestation data is valid. Ensure the root quorum threshold is valid (≥1).

## Examples

For complete, self-contained code examples:

- **EVM DA signing** (viem + ethers) — see `references/evm-da-signing-examples.md`
- **SVM DA signing** (Solana) — see `references/svm-da-signing-examples.md`

## Quick Reference

| Resource | Link |
|----------|------|
| Docs | [docs.turnkey.com](https://docs.turnkey.com) |
| Ethereum (EVM) integration | [Ethereum guide](https://docs.turnkey.com/networks/ethereum) |
| Solana (SVM) integration | [Solana guide](https://docs.turnkey.com/networks/solana) |
| Delegated Access overview | [DA overview](https://docs.turnkey.com/concepts/policies/delegated-access-overview) |
| DA frontend setup | [Client-side DA guide](https://docs.turnkey.com/concepts/policies/delegated-access-frontend) |
| DA backend setup | [Server-side DA guide](https://docs.turnkey.com/concepts/policies/delegated-access-backend) |
| Policy language reference | [Policy reference](https://docs.turnkey.com/concepts/policies/language) |
| Solana IDLs in policies | [Smart contract interfaces](https://docs.turnkey.com/concepts/policies/smart-contract-interfaces) |
| Gas sponsorship (EVM) | [Sponsored transactions](https://docs.turnkey.com/signing-automation/code-examples/sending-sponsored-transactions) |
| Gasless transactions (SVM) | [Solana gasless guide](https://docs.turnkey.com/reference/solana-gasless-transactions) |
| Sessions | [Sessions guide](https://docs.turnkey.com/authentication/sessions) |
| Wallet export/import | [Export guide](https://docs.turnkey.com/embedded-wallets/code-examples/export) |
| Shared responsibility model | [Security model](https://docs.turnkey.com/security/shared-responsibility-model) |
| SDK repo | [github.com/tkhq/sdk](https://github.com/tkhq/sdk) |
| Status page | [turnkey-status.com](https://www.turnkey-status.com) |

## Related Skills

- `skills/core/turnkey-wallet-management/SKILL.md` — wallet creation and account derivation
- `skills/core/turnkey-transaction-signing/SKILL.md` — stamping model and raw signing
- `skills/signing/turnkey-ethereum-evm/SKILL.md` — EVM signing with ethers.js or viem
- `skills/signing/turnkey-solana-signing/SKILL.md` — Solana transaction signing
- `skills/auth/turnkey-otp-auth/SKILL.md` — OTP authentication and sub-org management
