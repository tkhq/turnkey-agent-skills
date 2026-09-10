---
name: getting-started
description: "Day-0 onboarding workflow for Turnkey: verify API credentials, create your first wallet, and optionally test signing. Use for first-time setup; for agent provisioning, use provisioning-agent."
license: Apache-2.0
compatibility: "Requires the unreleased unified tk CLI with shared auth/resource commands; verify local capabilities before use."
metadata:
  author: turnkey
  tags: "workflow onboarding getting-started first-wallet"
---

# Getting Started

## Rules

Read the root [CLI calling convention](../../SKILL.md#calling-the-api) and verify the local unreleased binary. Use `tk auth status` for local readiness and `tk whoami` for remote identity; inspect the selected organization before mutations. Root credentials bypass policy constraints, so use a separate non-root agent profile for constrained-operation tests.

## Instructions

```sh
tk --profile admin --message-format json auth status
tk --profile admin --message-format json whoami
tk --profile admin --message-format json wallet list
```

Reuse a matching wallet when that fits the request. To create an explicitly requested wallet, save these parameters to `wallet.json` and adjust the name/path to the intended account:

```json
{
  "walletName": "agent-wallet",
  "accounts": [{
    "curve": "CURVE_SECP256K1",
    "pathFormat": "PATH_FORMAT_BIP32",
    "path": "m/44'/60'/0'/0/0",
    "addressFormat": "ADDRESS_FORMAT_ETHEREUM"
  }],
  "mnemonicLength": 24
}
```

```sh
tk --profile admin --message-format json wallet create --input-file wallet.json > wallet-result.json
```

Check completion before reading `data.activity.result.createWalletResult.walletId`. If pending, retain its activity ID and use `tk activity wait ID --timeout 60`. List addresses separately:

```sh
tk --profile admin --message-format json wallet account list --wallet-id "$WALLET_ID"
```

For an authorized signing test, use `tk sign payload --input-file payload.json` with explicit `signWith`, `payload`, `encoding`, and `hashFunction`. This signs only; it does not broadcast or prove that an agent policy permits transactions. See [CLI examples](../../references/cli-coverage.md).

## Troubleshooting

- Missing commands mean the wrong binary or an incomplete local integration; do not substitute SDK scripts and claim CLI coverage.
- Authentication failure: inspect profile/org and verify the registered public key; do not print private credentials.
- Pending activity: resume by ID. Denied signing: inspect policy evaluations using the agent identity and the activity ID.

## Related Skills

- [Managing wallets](../managing-wallets/SKILL.md): account formats and adding a chain.
- [Provisioning agent](../provisioning-agent/SKILL.md): scoped non-root credentials.
- [Monitoring activities](../monitoring-activities/SKILL.md): pending work.
- [First-wallet API reference](references/first-wallet-walkthrough.md): retained parameter/result examples; CLI execution follows this entrypoint.
