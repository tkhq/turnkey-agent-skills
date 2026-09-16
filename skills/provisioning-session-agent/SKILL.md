---
name: provisioning-session-agent
description: "Upgrade an agent user to short-lived API keys: add a provisioner user that may only register expiring keys with human approval, deny the agent self-service credentials, and run the tk session request / provision / activate / status loop across two containers."
license: Apache-2.0
compatibility: "Requires tk 0.2.0 or later from tkhq/tk with the session commands; verify local capabilities with scripts/check-cli.sh before use."
metadata:
  author: turnkey
  tags: "workflow agent session-keys expiring-api-keys provisioner rotation"
---

# Provisioning Session Agent

A session agent holds only expiring API keys. A separate provisioner identity registers each new key, and a human approves each registration from the console or the mobile app. This skill assumes `provisioning-agent-identity` is done: the `agent` and `human-approver` tags exist, the agent user exists, and policies 1 to 3 are applied. Read the [agent policy patterns](../../references/agent-policy-patterns.md) first.

## Rules

The agent and the provisioner never share a container or credential store. Only the agent's public key crosses between them; private keys are generated where they are used and never move. Every mint is approved by a `human-approver`; the provisioner alone cannot complete one. The agent user keeps one never-expiring anchor key whose private half was discarded, because Turnkey requires one long-lived credential per user. Do not weaken policies 3 to 5 to make a denied activity pass.

## Instructions

1. **Recreate or convert the agent user with an anchor key.** A new session agent is created as:

   ```sh
   tk --profile admin --message-format json user create --user-name agent --tag-name agent --public-key "$AGENT_PUBLIC_KEY" --expires-in 7d --anchor-key
   ```

   For an existing agent user that already holds a long-lived key, keep that key as the anchor for now and rotate onto expiring keys with the loop below; delete the old key with `api-key delete` once a session key is active. Record the agent user id.

2. **Create the provisioner.** On the provisioner's host: `tk --message-format json --organization-id "$ORG_ID" profile create --profile-name provisioner`. Then, as root:

   ```sh
   tk --profile admin --message-format json user tag create --name provisioner
   tk --profile admin --message-format json user create --user-name provisioner --tag-name provisioner --public-key "$PROVISIONER_PUBLIC_KEY"
   ```

   Its one long-lived key stays on the provisioner host. Log in there with `tk --message-format json login --profile-name provisioner`.

3. **Apply policies 4 and 5** from the reference: `provisioners-mint-agent-keys` and `provisioners-nothing-else`. Explain them before submitting; record the ids.

4. **Run the mint loop once, end to end.**

   On the agent host:

   ```sh
   tk --message-format json session request --profile-name agent
   ```

   Pass `.data.publicKey` and `.data.userId` to the provisioner host, then there:

   ```sh
   tk --profile provisioner --message-format json session provision --user-id "$AGENT_USER_ID" --public-key "$AGENT_SESSION_PUBLIC_KEY" --expires-in 7d
   ```

   The record shows `status: pending` and the activity id. The human approver checks `userId` and `expiresIn` on the phone or console and approves. Re-run the same provision command: it reports the registered key with `apiKeyId` and does not mint a second one. Back on the agent host:

   ```sh
   tk --message-format json session activate --profile-name agent
   tk --message-format json session status --profile-name agent
   ```

   `activate` fails with `unauthorized` until the key is registered and leaves the profile unchanged; after success it deletes the previous generated key file. `status` reports `expiresAt` and `secondsLeft`.

5. **Set up renewal.** The agent host runs `tk --message-format json session status --profile-name agent --warn-before 48h` on a schedule. Exit 1 with `code: session_expiring` means: run `session request`, ship the public key, and wait for `activate` to succeed. A key left unapproved past expiry breaks the agent's exports until a mint is approved; that is the accepted trade for having no long-lived key on the agent host.

6. **Verify the boundaries** with the reference's acceptance test as the provisioner profile: registering a key on the provisioner itself and deleting any key must both be denied.

7. **Hand off.** Report both profile locations, the provisioner user id, policy ids, and the current key's `expiresAt`. Never report private material.

## Transport between containers

`tk` does not move the public key or the completion signal between hosts; the operator chooses that. A shared directory the agent writes a request file into, a Unix socket, or a small HTTP service all work, because `session request` and `session provision` take and print plain values. Keep the provisioner's credential file out of anything the agent container can read.

## Troubleshooting

- `activate` says `unauthorized`: the key is not registered yet. Check the provision activity; it may await approval or have been rejected.
- `provision` returns `completed` with `alreadyRegistered: true` at once: the key is already on the user. This is the normal result of re-running after approval.
- `session_expiring` from `status`: request a new session now; the current key still works until `expiresAt`.
- `invalid_input` from `request` about a pending request: run `activate`, or `request --replace` to discard the unregistered key.
- `user create` with `--expires-in` fails with HTTP 400 `user missing valid credential`: add `--anchor-key`.
- A mint is denied although root approved: check policy 5's condition; the provisioner may have submitted something other than `CREATE_API_KEYS_V2`.

## Related Skills

- `provisioning-agent-identity`: the tags, agent user, secrets, and policies this skill builds on.
- `managing-policies`: consensus expressions and policy evaluations.
- `monitoring-activities`: approving, rejecting, and waiting on the mint activity.
- `managing-users`: deleting the old long-lived key once a session key is active.
