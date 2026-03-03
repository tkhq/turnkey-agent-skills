/**
 * Integration test: Claude --plugin-dir skill discovery
 *
 * Verifies that `claude --plugin-dir` accepts the repo as a plugin and that
 * nested skill directories (skills/core/, skills/signing/) are resolved.
 *
 * Skipped automatically when:
 *   - Running inside a Claude Code session (CLAUDECODE env var is set)
 *   - `claude` CLI is not found in PATH
 *
 * If skill names are missing from the output the test warns rather than fails,
 * because it indicates nested paths are not resolved and the skill directories
 * should be flattened — it's actionable signal, not a hard breakage.
 */

import { spawnSync } from "child_process";
import { describe, it, expect } from "vitest";
import { resolve } from "path";

const PLUGIN_DIR = resolve(process.cwd());

const SKILL_NAMES = [
  "turnkey-wallet-management",
  "turnkey-transaction-signing",
  "turnkey-ethereum-evm",
  "turnkey-solana-signing",
  "turnkey-bitcoin-signing",
];

function claudeAvailable(): boolean {
  return spawnSync("which", ["claude"], { encoding: "utf-8" }).status === 0;
}

function runPluginDir(): ReturnType<typeof spawnSync> {
  // Delete CLAUDECODE so the nested-session guard doesn't fire
  const env = { ...process.env };
  delete env.CLAUDECODE;

  return spawnSync(
    "claude",
    ["--plugin-dir", PLUGIN_DIR, "--print", "/help"],
    { env, timeout: 30_000, encoding: "utf-8" }
  );
}

const shouldSkip = !!process.env.CLAUDECODE || !claudeAvailable();

describe("claude --plugin-dir", () => {
  it.skipIf(shouldSkip)("exits successfully", () => {
    const result = runPluginDir();
    if (result.error) throw result.error;
    expect(
      result.status,
      `claude exited ${result.status}\nstderr: ${result.stderr}`
    ).toBe(0);
  });

  it.skipIf(shouldSkip)("all five skill names appear in output (nested path resolution)", () => {
    const result = runPluginDir();
    const output = String(result.stdout ?? "") + String(result.stderr ?? "");

    for (const name of SKILL_NAMES) {
      expect(
        output,
        `Skill "${name}" not found in --plugin-dir output. Nested skill directories may not be resolved — consider flattening skills/ to a single level.`
      ).toContain(name);
    }
  });
});
