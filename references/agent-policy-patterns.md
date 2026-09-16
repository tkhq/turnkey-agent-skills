# Agent policy patterns

An **agent** here is any principal that acts without a person watching: an LLM agent, a service, a cron job, a CI runner. The controls below constrain the unattended credential; what runs behind it does not matter. Policies reference **user tags** and **secret static properties**, never individual user or secret ids, so adding an agent is a user create plus a tag and adding a secret is one import.

## Vocabulary

| Pattern | Meaning | Consensus shape |
|---|---|---|
| **allow-always** | The agent may do this alone. | `approvers.any(user, user.tags.contains('AGENT_TAG'))` |
| **allow-once** | Each activity needs a human approval, from the console or the mobile app. | `approvers.any(user, user.tags.contains('AGENT_TAG')) && approvers.any(user, user.tags.contains('HUMAN_APPROVER_TAG'))` |

The human approvers carry the `human-approver` tag rather than being identified as root. In a small org the root user is the approver; the tag keeps the policy valid when approvers later are not root. A root approval also satisfies the root quorum, so allow-once policies mainly document intent and let the agent submit.

## Tags and properties

Create three user tags once and record their ids:

```sh
tk --profile admin --message-format json user tag create --name agent
tk --profile admin --message-format json user tag create --name provisioner
tk --profile admin --message-format json user tag create --name human-approver
tk --profile admin --message-format json user tag list
```

Tag the human who approves: `tk --profile admin --message-format json user update --input-json '{"userId":"HUMAN_USER_UUID","userTagIds":["HUMAN_APPROVER_TAG"]}'`.

Secrets carry exactly one `consensus` static property and are named `<agent>/<ENV_VAR>` so `tk secret env` can turn them into an environment:

| Property | Meaning |
|---|---|
| `consensus=unilateral` | any `agent`-tagged user may export it alone |
| `consensus=approval` | export needs a `human-approver` too |

Properties are immutable. To change a secret's level, import a new secret and delete the old one; never plan on narrowing access by editing properties.

Wallets follow the same idea later: tag or name wallets by trust level and write signing policies against `wallet.id` sets, not one address at a time.

## The six policies

Substitute the three tag ids. Each command is one `tk policy create`; the JSON form for `--input-json` follows for readers who prefer it.

### 1. agents-export-unilateral (allow-always)

```sh
tk --profile admin --message-format json policy create --name agents-export-unilateral --effect allow \
  --consensus "approvers.any(user, user.tags.contains('AGENT_TAG'))" \
  --condition "activity.type == 'ACTIVITY_TYPE_EXPORT_SECRETS' && secret.static_properties['consensus'] == 'unilateral'"
```

### 2. agents-export-with-approval (allow-once)

```sh
tk --profile admin --message-format json policy create --name agents-export-with-approval --effect allow \
  --consensus "approvers.any(user, user.tags.contains('AGENT_TAG')) && approvers.any(user, user.tags.contains('HUMAN_APPROVER_TAG'))" \
  --condition "activity.type == 'ACTIVITY_TYPE_EXPORT_SECRETS' && secret.static_properties['consensus'] == 'approval'"
```

### 3. agents-no-api-keys-or-authenticators (deny)

```sh
tk --profile admin --message-format json policy create --name agents-no-api-keys-or-authenticators --effect deny \
  --consensus "approvers.any(user, user.tags.contains('AGENT_TAG'))" \
  --condition "activity.resource == 'CREDENTIAL'"
```

### 4. provisioners-mint-agent-keys (allow-once)

```sh
tk --profile admin --message-format json policy create --name provisioners-mint-agent-keys --effect allow \
  --consensus "approvers.any(user, user.tags.contains('PROVISIONER_TAG')) && approvers.any(user, user.tags.contains('HUMAN_APPROVER_TAG'))" \
  --condition "activity.type == 'ACTIVITY_TYPE_CREATE_API_KEYS_V2'"
```

### 5. provisioners-nothing-else (deny)

```sh
tk --profile admin --message-format json policy create --name provisioners-nothing-else --effect deny \
  --consensus "approvers.any(user, user.tags.contains('PROVISIONER_TAG'))" \
  --condition "activity.type != 'ACTIVITY_TYPE_CREATE_API_KEYS_V2'"
```

### 6. provisioners-no-self-keys (deny, one per provisioner)

```sh
tk --profile admin --message-format json policy create --name provisioners-no-self-keys --effect deny \
  --consensus "approvers.any(user, user.tags.contains('PROVISIONER_TAG'))" \
  --condition "activity.type == 'ACTIVITY_TYPE_CREATE_API_KEYS_V2' && activity.params.user_id == 'PROVISIONER_USER_UUID'"
```

This is the one id-based policy. Without it, a provisioner proposing a key on *itself* is not denied but goes pending under policy 4, waiting for a human who might approve by habit. The target user's tags are not policy-visible, so the only hard stop names the provisioner's own user id. Create one per provisioner user. Verified live on 2026-09-16: without it the self-mint went pending; with it, HTTP 403.

The same policies as parameters objects (policy 6 omitted because it carries a user id):

```json
[
  {
    "policyName": "agents-export-unilateral",
    "effect": "EFFECT_ALLOW",
    "consensus": "approvers.any(user, user.tags.contains('AGENT_TAG'))",
    "condition": "activity.type == 'ACTIVITY_TYPE_EXPORT_SECRETS' && secret.static_properties['consensus'] == 'unilateral'",
    "notes": "allow-always: agents read unilateral secrets alone"
  },
  {
    "policyName": "agents-export-with-approval",
    "effect": "EFFECT_ALLOW",
    "consensus": "approvers.any(user, user.tags.contains('AGENT_TAG')) && approvers.any(user, user.tags.contains('HUMAN_APPROVER_TAG'))",
    "condition": "activity.type == 'ACTIVITY_TYPE_EXPORT_SECRETS' && secret.static_properties['consensus'] == 'approval'",
    "notes": "allow-once: a human approves each export of an approval secret"
  },
  {
    "policyName": "agents-no-api-keys-or-authenticators",
    "effect": "EFFECT_DENY",
    "consensus": "approvers.any(user, user.tags.contains('AGENT_TAG'))",
    "condition": "activity.resource == 'CREDENTIAL'",
    "notes": "agents never create or delete their own credentials"
  },
  {
    "policyName": "provisioners-mint-agent-keys",
    "effect": "EFFECT_ALLOW",
    "consensus": "approvers.any(user, user.tags.contains('PROVISIONER_TAG')) && approvers.any(user, user.tags.contains('HUMAN_APPROVER_TAG'))",
    "condition": "activity.type == 'ACTIVITY_TYPE_CREATE_API_KEYS_V2'",
    "notes": "allow-once: a human approves each expiring key a provisioner registers"
  },
  {
    "policyName": "provisioners-nothing-else",
    "effect": "EFFECT_DENY",
    "consensus": "approvers.any(user, user.tags.contains('PROVISIONER_TAG'))",
    "condition": "activity.type != 'ACTIVITY_TYPE_CREATE_API_KEYS_V2'",
    "notes": "a provisioner can only propose key registrations"
  }
]
```

Everything not listed is implicitly denied for non-root users.

In the acceptance test below, the provisioner self-mint must return `unauthorized` (403). If it returns `pending` instead, policy 6 is missing.

## Why the two DENY policies exist

Turnkey's policy engine default-allows a user creating or deleting **their own** API keys and authenticators when no policy decides. Without policy 3, an agent holding a seven-day key could register itself a permanent one. Without policies 5 and 6, the provisioner could delete other users' keys and propose keys on itself. Policies 3, 5, and 6 close these holes; do not remove them to make a denied activity succeed.

## What policies cannot see

For `ACTIVITY_TYPE_CREATE_API_KEYS_V2` the engine exposes `activity.params.user_id` as a string but not the target user's tags, and it does not expose `expirationSeconds`. The human approver is the check on both: `tk session provision` prints `userId`, `publicKey`, and `expiresIn` in its record, and the console or mobile app shows the activity's parameters. Approve only when the target is an agent user and the lifetime is the agreed one.

## Every user needs one long-lived credential

Organization validation rejects a user whose only credentials are expiring API keys. An agent that should live on session keys is created with `--anchor-key`, which registers a never-expiring key whose private half was generated locally and discarded. Nothing can use it; it exists to satisfy validation.

## Acceptance test for a fresh org

Run these from the agent's and provisioner's profiles after applying the policies. Each must behave as stated before the setup is handed over.

```sh
# allow-always: the agent gets exactly its unilateral secrets, exit 0
tk --profile agent --message-format json secret env --name-prefix agent/ --property consensus=unilateral
# allow-once: without the property filter an approval secret goes pending; exit 1, code approval_required
tk --profile agent --message-format json secret env --name-prefix agent/
# the agent cannot register a key on itself; exit 1, the DENY policy matches in policy evaluations
tk --profile agent --message-format json api-key register --input-json '{"userId":"AGENT_USER_UUID","apiKeys":[{"apiKeyName":"escape","publicKey":"REPLACE_WITH_COMPRESSED_PUBLIC_KEY","curveType":"API_KEY_CURVE_P256"}]}'
# the provisioner cannot register a key on itself or delete keys; both exit 1
tk --profile provisioner --message-format json api-key register --input-json '{"userId":"PROVISIONER_USER_UUID","apiKeys":[{"apiKeyName":"escape","publicKey":"REPLACE_WITH_COMPRESSED_PUBLIC_KEY","curveType":"API_KEY_CURVE_P256"}]}'
tk --profile provisioner --message-format json api-key delete --user-id AGENT_USER_UUID SOME_API_KEY_UUID
```

Inspect a denial with `tk --profile admin --message-format json policy evaluations "$ACTIVITY_ID"`.
