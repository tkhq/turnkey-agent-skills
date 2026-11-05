---
name: managing-agent
description: "Day-2 operations for a provisioned Turnkey agent: debug denied transactions, update policies (spending limits, allowlists), rotate API keys, revoke access, and add chains. Requires root credentials. For initial agent setup, use provisioning-agent."
license: Apache-2.0
compatibility: "Requires tk 0.8.0 or later with shared auth/resource commands; verify local capabilities before use."
metadata:
  author: turnkey
  tags: "workflow agent management key-rotation revocation debugging policy-update"
---

# Managing Agent

## Rules

Use the root [CLI convention](../../SKILL.md), explicit admin/agent profiles, and existing user authorization. A denied transaction may be the intended result; do not broaden policies without a corresponding requested access change.

## My agent's transaction was denied

```sh
tk --profile agent --message-format json whoami
tk --profile admin --message-format json activity get --id "$ACTIVITY_ID"
tk --profile admin --message-format json policy evaluations --activity-id "$ACTIVITY_ID"
tk --profile admin --message-format json policy list
```

Check DENY matches, wallet/account scope, amount units, chain-specific fields, and submitter participation in consensus. Use [debugging examples](references/policy-debugging-examples.md) for interpreting evaluations; they do not replace the CLI execution path.

## I need to change limits or recipients

Get the intended policy, prepare `policy-update.json` using `policyId` and the `policyEffect`/`policyCondition`/`policyConsensus`/`policyNotes` update fields, explain the resulting access, then submit the authorized update:

```sh
tk --profile admin --message-format json policy get --id "$POLICY_ID"
tk --profile admin --message-format json policy update --input-file policy-update.json
tk --profile admin --message-format json policy get --id "$POLICY_ID"
```

Wait for completion before the final inspection. Verify allowed/denied fixtures with agent credentials. [Policy-update examples](references/policy-update-examples.md) are field/semantic references.

## I need to rotate credentials

Create the replacement profile directly in protected storage, register its public key with `tk --profile admin api-key register --input-file public-keys.json`, and wait for completion. Verify with `tk --profile agent-next --message-format json whoami` before revoking the old key. See [managing users](../managing-users/SKILL.md#api-key-rotation). For another machine use the session request/provision/activate flow described in the root guide; do not transfer a plaintext private key.

## I need to revoke access

Inspect `tk --profile admin user get --id "$USER_ID"` to establish that this is the intended disposable non-root agent. For authorized complete revocation use `tk --profile admin user delete --id "$USER_ID"` and verify completion. If it may be a human/root/admin user or the target is ambiguous, clarify before deletion. Removing a single API key does not disable other credentials; deleting a local profile does not revoke remote access.

## I need to add a chain

Use `tk --profile admin wallet account create --input-file accounts.json` with the existing `walletId` and explicit derivation parameters. Then update only the requested policy scope. Test with a reviewed chain-appropriate signing input; generic transaction construction and broadcasting remain external dependencies.

## Troubleshooting

- Interrupted rotation: inspect registered keys and verify the replacement before removing either credential.
- Apparent successful CLI exit with no resource IDs: inspect pending activity state and resume by ID.
- Policy update has no effect: inspect the complete active policy set and confirm the agent profile is selected.

## Related Skills

- [Managing users](../managing-users/SKILL.md)
- [Managing policies](../managing-policies/SKILL.md)
- [Managing wallets](../managing-wallets/SKILL.md)
- [Monitoring activities](../monitoring-activities/SKILL.md)
