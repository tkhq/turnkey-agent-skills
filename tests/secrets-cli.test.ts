/** CLI capability compatibility, without credentials or remote calls. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const directory = mkdtempSync(join(tmpdir(), "tk-secrets-capabilities-"));
afterAll(() => rmSync(directory, { recursive: true, force: true }));
const binary = process.env.TK_CLI_BINARY;

// This is a compatibility test, not a substitute for the CLI's crypto/transport
// tests or an authorized live import/approval/export acceptance run.
describe("skill CLI compatibility check", () => {
  it("rejects a pre-Secrets CLI even if every older command is available", () => {
    const legacy = join(directory, "legacy-tk");
    writeFileSync(legacy, `#!/usr/bin/env bash
if [[ "$1" == secret ]]; then exit 2; fi
printf '%s\\n' '<NAME> --message-format --input-json --input-file --api-key-file --output --timeout --wallet-id --user-id --body-file'
`, { mode: 0o700 });
    const result = spawnSync("bash", ["scripts/check-cli.sh", legacy], { encoding: "utf8" });
    expect(result.status).not.toBe(0);
    expect(result.stdout).not.toContain("Required local CLI commands are available");
  });

  it.skipIf(!binary)("accepts the actual CLI's documented Secrets surface", () => {
    const result = spawnSync("bash", ["scripts/check-cli.sh", binary!], { encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("Required local CLI commands are available");
  });
});
