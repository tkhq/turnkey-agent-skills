# CLI conversion coverage and examples

This targets the unreleased [tkhq/tk unified CLI stack](https://github.com/tkhq/tk/pull/25), built with `cargo build -p tk --bin tk`. Verify capabilities with `scripts/check-cli.sh /absolute/path/to/tk` before executing a skill. No package version is a release gate yet.

| Maintained source | CLI-backed operation | Remaining boundary |
|---|---|---|
| getting-started + first-wallet walkthrough | auth status/whoami, wallet list/create/account list, sign payload | No ad hoc SDK setup |
| managing-users + user/key references | user list/get/create/update/delete, tag list/create/update/delete, api-key generate/register/list/delete | Root quorum management is separate; get-api-key-by-ID uses request if needed |
| managing-policies + API/templates/language references | policy list/get/create/create-batch/update/delete/evaluations | Contract interface requests use complete envelopes; no local policy proof |
| managing-wallets + wallet reference | wallet list/get/create/update and account list/create | Account get/deletion, import/export crypto, full pagination remain separate |
| monitoring-activities + activity/approver references | activity list/get/wait/approve/reject | App proof query bridge; proof verification is not retrieval |
| provisioning-agent + walkthrough/personas | Compose wallet/user/tag/key/policy operations with explicit profiles | Persist partial IDs; verify with agent credentials |
| managing-agent + diagnosis/update/rotation references | evaluations, policy updates, key rotation, user revocation, account creation | Preserve requested scope; no automatic recovery mutation |
| signing-transactions + four chain references | sign payload and serialized sign transaction | Full SDK construction/broadcast migration remains future work; managed sends not dedicated commands yet |
| examples/wallet-management.ts | wallet list/create/account list | Historical SDK example, retained explicitly |
| examples/ethereum-ethers.ts, ethereum-viem.ts | Replace Turnkey signing leg with sign transaction/payload | ethers/viem transaction construction and RPC broadcast remain SDK-based |
| examples/solana-signing.ts | Replace Turnkey signing leg with sign transaction | Blockhash/serialization/sendRawTransaction/confirmation remain external |
| examples/bitcoin-signing.ts | Replace Turnkey signing leg with sign transaction/payload | UTXO discovery, PSBT/sighash, finalization, broadcast remain external |
| scripts/run-evals.ts and skills/*/evals/evals.json | Legacy semantic/SDK evaluation inputs | Not converted CLI execution tests; do not claim they prove CLI workflows |
| tests/key-derivation.test.ts | Executes the selected local CLI's generation and checks stamper compatibility | Requires TK_CLI_BINARY; no network calls |
| scripts/refresh-api-schemas.ts | Maintains legacy reference parameter schema fixtures | Rust generated activity versions remain authoritative for dedicated CLI commands |

## Serialized signing parameters

Save a reviewed raw payload to `payload.json`, replacing the signer with the intended address or opaque key identifier:

```json
{
  "signWith": "REPLACE_WITH_SIGNER",
  "payload": "68656c6c6f",
  "encoding": "PAYLOAD_ENCODING_HEXADECIMAL",
  "hashFunction": "HASH_FUNCTION_SHA256"
}
```

```sh
tk --profile agent --message-format json sign payload --input-file payload.json
```

Serialized transaction parameters use `signWith`, `unsignedTransaction`, and `type` (for example `TRANSACTION_TYPE_ETHEREUM`). The CLI does not construct that transaction or broadcast the signed output. Verify the decoded destination, amount, network, and fees according to the user's requested transaction before signing.

## Request bridges

Dedicated commands accept parameters; request accepts the whole request. A read-only app-proof query can be prepared as:

```json
{
  "organizationId": "11111111-1111-4111-8111-111111111111",
  "activityId": "22222222-2222-4222-8222-222222222222"
}
```

```sh
tk --profile admin --message-format json request --path /public/v1/query/list_app_proofs --body-file app-proofs-query.json
```

For smart-contract interface upload/list/delete, use the current request types and full envelopes shown in the retained policy API reference after checking their fields against the CLI workspace's generated client. These mutation bridges are **not validated integration recipes in this artifact**. Do not silently execute the reference's old activity envelope or claim completion of the dedicated-policy surface includes ABI/IDL management.

## Response handling

Capture stdout in a result file and inspect the final JSON record. For wallet creation, completed results expose `.data.activity.result.createWalletResult.walletId`; user creation exposes `.data.activity.result.createUsersResult.userIds`. Pending records have no required result IDs. Retain `.activity.id`, wait separately, then inspect the completed result. Handle nonzero exits without discarding their JSON error record; use `.details.activity` on errors and reconcile `submission_unknown` before any repeat mutation. Errors carry `code` rather than the success-only `schemaVersion`/`data` contract.

The CLI's own mock tests validate transport, input shapes, and statuses. This skill artifact's optional binary checks verify command availability and offline key generation. Neither establishes live permissions, funded-chain behavior, managed-send access, or full end-to-end agent lifecycle success.
