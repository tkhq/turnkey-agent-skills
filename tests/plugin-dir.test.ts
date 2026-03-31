/**
 * Integration test - Plugin directory loading
 *
 * Verifies that Claude CLI can discover skills when using --plugin-dir
 * with this repository. Skipped when claude CLI is not available (e.g. CI).
 *
 * Adapted from main branch for v2 skill names.
 */

import { execSync } from "child_process";
import { describe, it, expect } from "vitest";
import { PROJECT_ROOT } from "./helpers.js";

const SKILL_NAMES = [
  "agentic-wallet-workflow",
  "getting-started-workflow",
  "managing-organizations-api",
  "managing-policies-api",
  "managing-private-keys-api",
  "managing-users-api",
  "managing-wallets-api",
  "monitoring-activities-api",
  "querying-balances-api",
  "signing-transactions-api",
];

function claudeAvailable(): boolean {
  try {
    execSync("which claude", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

const shouldSkip = !!process.env.CLAUDECODE || !claudeAvailable();

describe.skipIf(shouldSkip)("plugin-dir integration", () => {
  it("claude --plugin-dir lists all skills", () => {
    const output = execSync(
      `claude --print /help --plugin-dir "${PROJECT_ROOT}" --output-format text --no-session-persistence`,
      {
        encoding: "utf-8",
        timeout: 30000,
        env: { ...process.env, DISABLE_INTERACTIVITY: "1" },
      }
    );

    for (const name of SKILL_NAMES) {
      expect(
        output.includes(name),
        `Skill "${name}" not found in claude --plugin-dir output`
      ).toBe(true);
    }
  });
});
