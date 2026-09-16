---
name: provisioning-agent-identity
description: "Set up a Turnkey organization for an unattended agent (LLM agent, service, or cron): user tags, a non-root agent user with one API key, secrets scoped by static property, and allow-always / allow-once policies. For an agent that should hold only short-lived keys, continue with provisioning-session-agent."
license: Apache-2.0
compatibility: "Requires tk 0.2.0 or later from tkhq/tk with the session and secret env commands; verify local capabilities with scripts/check-cli.sh before use."
metadata:
  author: turnkey
  tags: "workflow agent identity tags secrets policies allow-always allow-once"
---

# Provisioning Agent Identity

An agent is any principal that acts without a person watching: an LLM agent, a service, a cron job, a CI runner. This skill gives it a non-root user, tag-based policies, and secrets it can turn into its own environment. Read the root [CLI convention](../../SKILL.md) and the [agent policy patterns](../../references/agent-policy-patterns.md) first.

## Rules

Work as the operator's root profile (named by them, for example `admin`) and never reuse it as the agent's runtime credential. The agent user stays non-root; root bypasses every policy. Policies reference tag ids and static properties, never user or secret ids. Secret values never enter the transcript: import from a file or a piped producer, and verify exports by exit code and metadata only. Record every created id as soon as it exists.

## Instructions

1. **Verify root and the CLI.** `tk --profile admin --message-format json whoami`. Run `scripts/check-cli.sh /absolute/path/to/tk`; this skill needs `user create --user-name`, `policy create --name`, and `secret env`.

2. **Create the tags and record their ids.**

   ```sh
   tk --profile admin --message-format json user tag create --name agent
   tk --profile admin --message-format json user tag create --name human-approver
   tk --profile admin --message-format json user tag list
   ```

   Tag the human approver, usually the root user from step 1: `tk --profile admin --message-format json user update --input-json '{"userId":"HUMAN_USER_UUID","userTagIds":["HUMAN_APPROVER_TAG"]}'`.

3. **Generate the agent's credential where the agent will run.** `tk --message-format json --organization-id "$ORG_ID" profile create --profile-name agent` writes the private key under `~/.config/turnkey/tk/api-keys/` and reports `.data.publicKey`. Only the public key leaves that machine.

4. **Create the agent user.**

   ```sh
   tk --profile admin --message-format json user create --user-name agent --tag-name agent --public-key "$AGENT_PUBLIC_KEY"
   ```

   `--tag-name` resolves to the tag id; pass `--tag TAG_ID` instead if names are ambiguous. Save `.data.activity.result.createUsersResult.userIds[0]`. Then `tk --message-format json login --profile-name agent` on the agent's machine.

5. **Apply policies 1 to 3** from the [patterns reference](../../references/agent-policy-patterns.md): `agents-export-unilateral`, `agents-export-with-approval`, and `agents-no-api-keys-or-authenticators`. Explain each policy's effect before submitting. Save the policy ids.

6. **Import secrets** named `agent/<ENV_VAR>` with one `consensus` property each:

   ```sh
   tk --profile admin --message-format json secret import agent/API_TOKEN --property consensus=unilateral --from-file "$SECRET_INPUT_FILE"
   tk --profile admin --message-format json secret import agent/DEPLOY_KEY --property consensus=approval --from-file "$OTHER_INPUT_FILE"
   ```

7. **Verify as the agent, never as root.**

   ```sh
   tk --profile agent --message-format json secret env --name-prefix agent/ --property consensus=unilateral
   tk --profile agent --message-format json secret env --name-prefix agent/
   ```

   The first exits 0 and lists the unilateral variables under `.data.exported`; the second exits 1 with `code: approval_required` and the approval secret under `.details.pending`. Have the approver approve it, run the same command again, and confirm exit 0. Then run the self-issued key check from the reference's acceptance test and confirm the DENY policy matched in `policy evaluations`. Do not print `.data.env` in chat.

8. **Hand off.** Report the organization id, the three tag ids, the agent user id, the policy ids, the secret ids, and where the agent profile lives. Never report private key material or secret values.

## Runtime use

The agent's process, not the agent in conversation, runs `tk --profile agent secret env --name-prefix agent/ --property consensus=unilateral` at startup and sources the dotenv output. Hermes Agent takes it as `secrets.command`. A secret that needs approval is exported by the same command after the approval, so keep approval-gated secrets out of startup paths that cannot wait.

## Troubleshooting

- `approval_required` from `secret env`: an `approval` secret is in the selection. Approve `.details.pending[].activityId` or add `--property consensus=unilateral`.
- `unauthorized` on `login` right after `user create`: the create activity is still pending or was rejected; inspect it with `activity get` and wait for completion.
- `not_found` for `--tag-name`: the tag does not exist in this organization; create it or pass `--tag` with an id.
- `invalid_input` naming two tags: the name is ambiguous; pass `--tag TAG_ID`.
- A user create with only `--expires-in` keys fails with HTTP 400: every user needs one long-lived credential. Use `provisioning-session-agent`, which adds `--anchor-key`.

## Related Skills

- `provisioning-session-agent`: upgrade this agent to short-lived keys minted by a provisioner.
- `managing-secrets`: import, export, and pending-export recovery in depth.
- `managing-policies`: policy language, consensus, and evaluations.
- `managing-users`: users, tags, and key rotation.
- `provisioning-agent`: give an agent a scoped wallet for signing.
