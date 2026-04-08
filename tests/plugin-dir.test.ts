/**
 * Integration test: Claude --plugin-dir skill discovery
 *
 * Verifies that `claude --plugin-dir` accepts the repo as a plugin and that
 * skill directories are resolved.
 *
 * Skipped automatically when:
 *   - Running inside a Claude Code session (CLAUDECODE env var is set)
 *   - `claude` CLI is not found in PATH
 */

import { spawnSync } from "child_process";
import { describe, it, expect } from "vitest";
import { resolve } from "path";

const PLUGIN_DIR = resolve(process.cwd());

const SKILL_NAMES = [
  "signing-transactions",
  "managing-wallets",
  "managing-private-keys",
  "managing-users",
  "managing-policies",
  "monitoring-activities",
  "getting-started",
  "provisioning-agent",
  "managing-agent",
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

  it.skipIf(shouldSkip)("all skill names appear in output", () => {
    const result = runPluginDir();
    const output = String(result.stdout ?? "") + String(result.stderr ?? "");

    for (const name of SKILL_NAMES) {
      expect(
        output,
        `Skill "${name}" not found in --plugin-dir output.`
      ).toContain(name);
    }
  });
});
