---
name: managing-users
description: "Manages Turnkey users, API keys, and user tags: create, update, and delete users; generate and rotate API keys; tag users for policy targeting; verify identity with whoami."
license: Apache-2.0
compatibility: "Requires the unreleased unified tk CLI with shared auth/resource commands; verify local capabilities before use."
metadata:
  author: turnkey
  tags: "users api-keys user-tags authentication identity key-rotation"
---

# Managing Users

## Rules

Use shared profiles and the root [CLI convention](../../SKILL.md). Register public keys only. Root quorum membership is separate from creating a user; a constrained agent must remain non-root because root authorization bypasses policies.

## Instructions

```sh
tk --profile admin --message-format json user list
tk --profile admin --message-format json user get "$USER_ID"
tk --profile admin --message-format json user create --input-file users.json
tk --profile admin --message-format json user update --input-file user-update.json
```

`users.json` contains `{"users": [...]}` using CreateUsersIntentV4: `userName`, optional `userEmail`/`userPhoneNumber`, `apiKeys`, `authenticators`, `oauthProviders`, and `userTags`. Tags are **tag UUIDs**, not names. API-key entries use `apiKeyName`, `publicKey`, `curveType: "API_KEY_CURVE_P256"` (optional `expirationSeconds`). Updates use `userId`, `userName`, `userEmail`, `userPhoneNumber`, and `userTagIds`; note the different create/update tag field names. Preserve intended membership when preparing updates.

```sh
tk --profile admin --message-format json user tag list
tk --profile admin --message-format json user tag create --input-file tag.json
tk --profile admin --message-format json user tag update --input-file tag-update.json
tk --profile admin --message-format json user tag delete "$TAG_ID"
```

Tag create uses `userTagName` and `userIds`. Tag update uses `userTagId`, optional `newUserTagName`, `addUserIds`, and `removeUserIds`.

## API-key rotation

```sh
tk --message-format json api-key generate --output "$NEW_KEY_FILE" > generated-key.json
tk --profile admin --message-format json api-key list --user-id "$USER_ID"
tk --profile admin --message-format json api-key register --input-file public-keys.json
```

`public-keys.json` contains `userId` and `apiKeys`; use only the generated public key. Wait for registration completion, then verify the replacement with a new profile before revocation:

```sh
tk --profile agent-next --organization-id "$ORG_ID" login --api-key-file "$NEW_KEY_FILE"
tk --profile agent-next --message-format json whoami
tk --profile admin --message-format json api-key delete --user-id "$USER_ID" "$OLD_KEY_ID"
```

Confirm whoami reports the intended user/org, then switch the agent runtime to the verified replacement. An authorized admin can revoke the old key; do not assume the agent has key-management permission. Preserve old access until replacement verification succeeds, unless the task explicitly requires immediate revocation.

## Revocation

For a compromised **disposable, non-root agent**, inspect `tk user get` (`get_user`) to match its ID/name/tags against the intended agent, then perform the authorized `tk user delete "$USER_ID"` (`delete_users`). If its identity or root/human role is unclear, resolve that before deletion. User deletion is permanent. Key-only revocation (`delete_api_keys`) leaves another valid credential able to authenticate; it does not establish full user revocation.

## Troubleshooting

- Inspect complete activity results and pending status before treating create/update/delete as effective.
- Invalid input fields are rejected; do not pass `organizationId` in dedicated command parameters.
- Empty list results are not a pagination instruction: these user/tag/key endpoints expose no CLI cursors.

## Related Skills

- [Managing policies](../managing-policies/SKILL.md): scoped agent access.
- [Managing agent](../managing-agent/SKILL.md): operational recovery.
- [User reference](references/user-management-examples.md) and [key reference](references/api-key-examples.md): retained API field examples; execute their operations using these commands.
