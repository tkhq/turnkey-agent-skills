---
name: managing-policies
description: "Manages Turnkey policies for access control and transaction governance: ALLOW/DENY policies, consensus expressions, allowlists, spending limits, multi-sig approval, smart contract ABIs, and policy evaluation debugging."
license: Apache-2.0
compatibility: "Requires the unreleased unified tk CLI with shared auth/resource commands; verify local capabilities before use."
metadata:
  author: turnkey
  tags: "policy access-control governance security allowlist deny consensus smart-contract"
---

# Managing Policies

## Rules

Use the root [CLI convention](../../SKILL.md). Present effect, consensus, condition, and their practical scope when preparing an authorized policy change. Existing authorization persists; seek clarification only where the intended change or authority is unresolved. Do not widen access merely to make a denied transaction succeed.

## How policies work

Root authorization bypasses policy constraints; DENY overrides matching ALLOW, and absent applicable ALLOW means denial for constrained operations. Scope signing ALLOW policies to the intended `wallet.id`, `wallet_account.address`, or `private_key.id`. Match the requested breadth rather than quietly granting access to every wallet.

Use integer amounts in the chain's smallest unit (ETH value is wei). Convert human amounts explicitly. `activity.action == 'SIGN'` includes multiple signing paths; use activity types when the scope is narrower. Avoid assuming boolean short-circuit evaluation protects access to fields absent from a particular resource type; split wallet/private-key policies when necessary.

### The submitter-in-consensus rule

Consensus must include a clause the submitting identity satisfies, along with the intended additional approvers. Otherwise the activity may be denied at submission instead of entering consensus-needed. User tag selectors use tag UUIDs. Diagnose with server policy evaluations; local expression checks do not prove authorization.

## Instructions

```sh
tk --profile admin --message-format json policy list
tk --profile admin --message-format json policy get "$POLICY_ID"
tk --profile admin --message-format json policy create --input-file policy.json
tk --profile admin --message-format json policy create-batch --input-file policies.json
tk --profile admin --message-format json policy update --input-file policy-update.json
tk --profile admin --message-format json policy delete "$POLICY_ID"
tk --profile admin --message-format json policy evaluations "$ACTIVITY_ID"
```

Create parameters: `policyName`, `effect`, optional `condition`/`consensus`/`time`, and `notes`. Batch creation uses `{"policies": [...]}`. Update parameters: `policyId`, optional `policyName`, `policyEffect`, `policyCondition`, `policyConsensus`, `policyNotes`, and `time`. Create field names such as `effect` are not accepted for updates. Delete accepts one or more positional policy UUIDs.

After completion, inspect the stored policy and active policy set. Test intended allowed/denied operations under **agent credentials**, with authorized fixtures; admin success is not evidence of agent access.

## Smart contract interfaces

Upload/list/delete of ABI/IDL interfaces remains an explicit `tk request` bridge, not a dedicated command. Use the current complete typed envelope for `/public/v1/submit/create_smart_contract_interface` or `/delete_smart_contract_interface`, and a complete query body for `/public/v1/query/list_smart_contract_interfaces`. See [request boundaries](../../references/cli-coverage.md); these bridge fixtures still require validation before use. An interface upload can affect decoded function/argument policy fields.

## Troubleshooting

A denied request can be the intended policy behavior. `policy evaluations` uses the activity ID and returns server diagnostics. Examine DENY matches, resource scope, consensus participation, smallest-unit values, and stale account/recipient assumptions before proposing a change. Preserve exact expressions in files; do not escape/rebuild them inside shell arguments.

## Related Skills

- [Policy language](references/policy-language.md): field semantics and chain namespaces.
- [Policy templates](references/policy-templates.md): adapt to the requested scope; no blanket authorization to apply them.
- [API field reference](references/policy-api-examples.md): parameter examples; CLI commands above replace SDK execution.
- [Monitoring activities](../monitoring-activities/SKILL.md): consensus.
- [Managing agent](../managing-agent/SKILL.md): denial diagnosis and updates.
