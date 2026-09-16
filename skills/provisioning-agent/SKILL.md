---
name: provisioning-agent
description: "End-to-end workflow to give an AI agent a scoped Turnkey wallet: creates a wallet, a non-root agent user, and a wallet-scoped ALLOW policy, then verifies signing and outputs agent credentials. For day-2 operations, use managing-agent."
license: Apache-2.0
compatibility: "Requires tk 0.2.0 or later from tkhq/tk; verify local capabilities with scripts/check-cli.sh before use."
metadata:
  author: turnkey
  tags: "workflow agent wallet provisioning onboarding policies scoped-access"
---

# Provisioning Agent

## Rules

Provision a non-root identity, wallet, and scoped policy using the local unified CLI. Read the root [CLI convention](../../SKILL.md), including readiness and pending-result handling. Root membership bypasses the intended policy constraints; keep the agent non-root. Preserve the user's requested spending, recipient, chain, and resource scope.

## Instructions

1. Verify the admin identity with `tk --profile admin whoami`. List wallets before creating one, then reuse or create the intended wallet. Record its UUID and account addresses only after completion.
2. Create the agent profile locally: `tk --message-format json --organization-id "$ORG_ID" profile create --profile-name agent > agent-profile.json`. It generates the credential under `~/.config/turnkey/tk/api-keys/` and reports `.data.publicKey`; pass `--api-key-file` instead for a key generated with `tk api-key generate --output`. Register only the public key; no inline SDK/key-generation scripts.
3. List/create the intended user tag with `tk user tag list/create`. Then `tk --profile admin --message-format json user create --input-file users.json`. Use CreateUsersIntentV4 fields, including `userTags` (tag UUIDs), and public API-key entries. Save the created user ID and key-registration result.
4. Prepare a scoped policy file naming that user/tag and wallet. Explain its effect/condition/consensus and apply the already-authorized scope with `tk --profile admin --message-format json policy create --input-file policy.json`. List/get the policy after completion.
5. Login with the **agent profile**, then verify identity and authorized allowed/denied signing fixtures. Admin success does not test the agent's policies.

```sh
tk --message-format json login --profile-name agent
tk --profile agent --message-format json whoami
tk --profile agent --message-format json sign transaction --input-file allowed-transaction.json
tk --profile agent --message-format json sign transaction --input-file denied-transaction.json
```

Use reviewed serialized transaction fixtures matching the intended chain-aware policy. Raw payload signing is optional only when the requested policy explicitly permits that narrower test; do not broaden the policy to make a raw-payload test pass. Signing does not broadcast. Inspect the denied activity through `tk policy evaluations "$ACTIVITY_ID"` under a permitted identity.

## Recovery and handoff

After every mutation persist its activity ID and created resource IDs. Pending approval means pause dependent work and resume that activity. If interrupted, inspect saved IDs and remote resources before creating anything again. Do not reuse the admin profile in agent runtime. Handoff the selected profile/credential destination and policy/wallet/user IDs, excluding private material from the report.

[Agent personas](references/agent-personas.md) supply scoping prompts; they do not authorize extra operations. [Provisioning API examples](references/provisioning-walkthrough.md) retain parameter illustrations, but old CREATE_USERS_V3/envelope and key-generation instructions are superseded by the CLI's generated V4 request.

## Troubleshooting

- No supported CLI binary: stop dependent execution and identify the missing capability; there is no published-version claim.
- Policy denial: verify agent identity, resource scope, and consensus without granting root access.
- Registration still pending: complete it before logging in with the unregistered key.

## Related Skills

- [Managing users](../managing-users/SKILL.md): user/tag/key parameter fields.
- [Managing policies](../managing-policies/SKILL.md): scoped expressions.
- [Managing agent](../managing-agent/SKILL.md): rotation, denial, revocation.
- [Provisioning agent identity](../provisioning-agent-identity/SKILL.md): tags, property-scoped secrets, and allow-always / allow-once policies for an agent that needs secrets rather than a wallet.
- [Provisioning session agent](../provisioning-session-agent/SKILL.md): expiring keys minted by a provisioner.
