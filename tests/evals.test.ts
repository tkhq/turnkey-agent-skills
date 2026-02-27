/**
 * Layer 4 — Eval grading tests
 *
 * For each eval in evals.json, looks for a generated solution at:
 *   evals-workspace/<skill_name>/eval-<id>/solution.ts
 *
 * If the file exists, all assertions from the eval are run as individual tests.
 * If the file does not exist, no tests are registered for that eval — the
 * suite stays silent in CI where evals-workspace/ is empty.
 *
 * To run an eval:
 *   1. Give the agent the skill SKILL.md and prompt from evals.json
 *   2. Save the output to:  evals-workspace/<skill_name>/eval-<id>/solution.ts
 *   3. Run: npm test
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { runAssertions, describeAssertion, type Assertion } from "./grader.js";
import { PROJECT_ROOT, SKILLS_ROOT, findEvalsFiles } from "./helpers.js";

interface Eval {
  id: number;
  prompt: string;
  expected_output: string;
  files: string[];
  assertions?: Assertion[];
}

interface EvalsFile {
  skill_name: string;
  evals: Eval[];
}

describe("eval grader", () => {
  // Sanity check: verify the assertion engine itself works correctly
  // before trusting any eval results.
  it("assertion engine passes known-good code", () => {
    const code = `import { Turnkey } from "@turnkey/sdk-server"\nawait client.getWallets()\nprocess.env.TURNKEY_API_PUBLIC_KEY`;
    const results = runAssertions(code, [
      { type: "imports", value: "@turnkey/sdk-server" },
      { type: "calls", value: "getWallets" },
      { type: "env_var", value: "TURNKEY_API_PUBLIC_KEY" },
    ]);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it("assertion engine fails known-bad code", () => {
    const code = `import { something } from "other-pkg"\nfoo()`;
    const results = runAssertions(code, [
      { type: "imports", value: "@turnkey/sdk-server" },
      { type: "calls", value: "getWallets" },
      { type: "not_contains", value: "foo" },
    ]);
    expect(results.every((r) => !r.passed)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Per-eval suites — only registered when output files exist in evals-workspace/
  // ---------------------------------------------------------------------------

  const evalsFiles = findEvalsFiles(SKILLS_ROOT);

  for (const evalsFilePath of evalsFiles) {
    const evalsData: EvalsFile = JSON.parse(
      readFileSync(evalsFilePath, "utf-8")
    );

    for (const evalItem of evalsData.evals) {
      if (!evalItem.assertions?.length) continue;

      const outputPath = join(
        PROJECT_ROOT,
        "evals-workspace",
        evalsData.skill_name,
        `eval-${evalItem.id}`,
        "solution.ts"
      );

      if (!existsSync(outputPath)) continue;

      const code = readFileSync(outputPath, "utf-8");

      describe(`${evalsData.skill_name} / eval ${evalItem.id}`, () => {
        for (const assertion of evalItem.assertions!) {
          it(describeAssertion(assertion), () => {
            const [result] = runAssertions(code, [assertion]);
            expect(result.passed, result.message).toBe(true);
          });
        }
      });
    }
  }
});
