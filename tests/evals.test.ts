/**
 * Layer 4 - Eval grading self-tests
 *
 * Validates the assertion engine itself works correctly before trusting
 * any eval results. These are self-contained tests that do not require
 * LLM-generated solutions or API calls.
 *
 * Adapted from main branch. The per-eval workspace scanning is not included
 * since v2 evals use a different format (expected_behavior strings instead of
 * programmatic assertions).
 */

import { describe, it, expect } from "vitest";
import { runAssertions, checkCompiles } from "./grader.js";

describe("eval grader", () => {
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

  it("compiles assertion passes for valid TypeScript", () => {
    const code = `const x: number = 42;\nconsole.log(x);\n`;
    const [result] = runAssertions(code, [{ type: "compiles" }]);
    expect(result.passed, result.message).toBe(true);
  });

  it("compiles assertion fails for type errors", () => {
    const code = `const x: number = "not a number";\n`;
    const [result] = runAssertions(code, [{ type: "compiles" }]);
    expect(result.passed).toBe(false);
    expect(result.message).toContain("type error");
  });

  it("contains assertion works", () => {
    const code = `const apiUrl = "https://api.turnkey.com"`;
    const [pass] = runAssertions(code, [
      { type: "contains", value: "api.turnkey.com" },
    ]);
    const [fail] = runAssertions(code, [
      { type: "contains", value: "nonexistent" },
    ]);
    expect(pass.passed).toBe(true);
    expect(fail.passed).toBe(false);
  });

  it("order assertion works", () => {
    const code = `const a = 1;\nconst b = 2;\nconst c = 3;`;
    const [pass] = runAssertions(code, [
      { type: "order", before: "const a", after: "const c" },
    ]);
    const [fail] = runAssertions(code, [
      { type: "order", before: "const c", after: "const a" },
    ]);
    expect(pass.passed).toBe(true);
    expect(fail.passed).toBe(false);
  });

  it("regex assertion works", () => {
    const code = `const wallet = await createWallet({ name: "test" })`;
    const [pass] = runAssertions(code, [
      { type: "regex", pattern: "createWallet\\(.*\\)" },
    ]);
    const [fail] = runAssertions(code, [
      { type: "regex", pattern: "^deleteWallet" },
    ]);
    expect(pass.passed).toBe(true);
    expect(fail.passed).toBe(false);
  });
});
