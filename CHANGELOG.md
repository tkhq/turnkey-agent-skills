# Changelog

## [1.0.0](https://github.com/tkhq/turnkey-agent-skills/compare/v1.0.0...v1.0.0) (2026-05-19)


### Features

* add turnkey-oauth skill for OAuth/OIDC authentication with sub-org management ([985476c](https://github.com/tkhq/turnkey-agent-skills/commit/985476ca50829b7cc06bc8d1b1fe318604b0bba3))
* add turnkey-otp-auth skill for email OTP authentication with sub-org management ([7b623d0](https://github.com/tkhq/turnkey-agent-skills/commit/7b623d01b8f05d4dad7bd89c2a4ddaf911f7ab1c))


### Bug Fixes

* add testnet Bitcoin formats and ADDRESS_FORMAT_COMPRESSED to wallet-management skill ([cee6d19](https://github.com/tkhq/turnkey-agent-skills/commit/cee6d191568c2aaa30ba67616762bfa152460a0e))
* **ci:** gate dependency-review action on repo visibility ([7624fa1](https://github.com/tkhq/turnkey-agent-skills/commit/7624fa1b0a1e04b488b94ec5c2c02a28ec4908a1))
* **ci:** grant contents:read to lint-commit-messages job ([6145e31](https://github.com/tkhq/turnkey-agent-skills/commit/6145e31773692ba8d2f00e12f4665cb050692678))
* **ci:** suppress semgrep false positive on notRegex assertion ([55f3ced](https://github.com/tkhq/turnkey-agent-skills/commit/55f3ced3f42a9ffbceee4f35ed4089a201aad3dd))
* **ci:** suppress semgrep false positives in eval scripts ([900b96d](https://github.com/tkhq/turnkey-agent-skills/commit/900b96d111365bbc3d2ec2f937ce966f7369e59c))
* clean up references to old skill structure ([dcb5c84](https://github.com/tkhq/turnkey-agent-skills/commit/dcb5c8442f2fd57b9c4674c8e11f62ca9d069e07))
* policy DSL matches tags by ID, not name ([e9bb153](https://github.com/tkhq/turnkey-agent-skills/commit/e9bb153acf09954d5f90a10ca10e4eda89bc1d2e))
* policy DSL matches tags by ID, not name ([b372fbb](https://github.com/tkhq/turnkey-agent-skills/commit/b372fbbcdeda7591ff735f2c390bcec2181d37a8))
* remove broken checking-balances cross-references ([7bd9d75](https://github.com/tkhq/turnkey-agent-skills/commit/7bd9d75f598b73992555297c84234ac54a044251))
* **signing-transactions:** use KECCAK256 for UTF-8 message example ([6d5da36](https://github.com/tkhq/turnkey-agent-skills/commit/6d5da366a52c4c090aee36ecefd8ae7be6303d82))
* **skills:** emit compressed P-256 public keys in helper, prose, and examples ([056ee80](https://github.com/tkhq/turnkey-agent-skills/commit/056ee8003ea50287fc14da4a0fc3dfbaee50671b))
* Update README.md ([fc22909](https://github.com/tkhq/turnkey-agent-skills/commit/fc22909a405db22f3b994c372271b3d511b495d2))
* user tag IDs (not names) in userTags across create_users examples ([8f26739](https://github.com/tkhq/turnkey-agent-skills/commit/8f26739bdec0be70ee8b04675915808917524f1e))


### Miscellaneous Chores

* bootstrap release-please at 1.0.0 ([01b06ce](https://github.com/tkhq/turnkey-agent-skills/commit/01b06ceb7ea7bd6da89636ef52936fbd2f979852))

## Changelog

All notable changes to this project will be documented in this file.

This project follows [Semantic Versioning](https://semver.org). The SemVer contract for this skill bundle is documented in the [README](README.md#versioning).

Releases are automated by [release-please](https://github.com/googleapis/release-please) from [Conventional Commits](https://www.conventionalcommits.org/) on `main`.
