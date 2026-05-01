/**
 * Eval grader — runs structured assertions against LLM-generated code.
 *
 * Assertion types:
 *   imports      — checks for an ES import or require() of a package
 *   calls        — checks that a function is called by name
 *   env_var      — checks that process.env.VAR_NAME is referenced
 *   contains     — plain substring match
 *   not_contains — negative substring match
 *   order        — first match of `before` must precede first match of `after`
 *   regex        — full regex match with optional flags
 *   compiles     — type-checks the code with the project's tsconfig
 */

import * as ts from "typescript";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { randomUUID } from "crypto";
import { join, dirname } from "path";

export type Assertion =
  | { type: "imports"; value: string }
  | { type: "calls"; value: string }
  | { type: "env_var"; value: string }
  | { type: "contains"; value: string }
  | { type: "not_contains"; value: string }
  | { type: "order"; before: string; after: string }
  | { type: "regex"; pattern?: string; value?: string; flags?: string }
  | { type: "compiles" };

export interface Eval {
  id: number;
  prompt: string;
  expected_output: string;
  files: string[];
  assertions?: Assertion[];
  /** When true, assertions run against the full LLM response (prose + code) instead of just extracted code. Use for evals that test refusals, routing, or warnings. */
  gradeFullResponse?: boolean;
}

export interface EvalsFile {
  skill_name: string;
  evals: Eval[];
}

export interface AssertionResult {
  passed: boolean;
  assertion: Assertion;
  message: string;
}

/** Project root — used to locate tsconfig.json and node_modules. */
const PROJECT_ROOT = join(dirname(new URL(import.meta.url).pathname), "..");

/**
 * Type-check a TypeScript string using the project's tsconfig.
 * Returns `{ passed: true }` or `{ passed: false, message }` with up to 5 errors.
 */
export function checkCompiles(
  code: string,
  filePath?: string,
): { passed: true } | { passed: false; message: string } {
  let tempFile: string | undefined;

  try {
    // If no filePath, write to a temp file inside the project for correct
    // node_modules resolution.
    const targetFile =
      filePath ??
      (() => {
        tempFile = join(PROJECT_ROOT, `.tmp-compiles-${randomUUID()}.ts`);
        writeFileSync(tempFile, code, "utf-8");
        return tempFile;
      })();

    // Load the project tsconfig
    const configPath = ts.findConfigFile(
      PROJECT_ROOT,
      ts.sys.fileExists,
      "tsconfig.json",
    );
    if (!configPath) {
      return { passed: false, message: "type error: tsconfig.json not found" };
    }

    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    if (configFile.error) {
      return {
        passed: false,
        message: `type error: failed to read tsconfig: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n")}`,
      };
    }

    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      PROJECT_ROOT,
    );

    // Create a compiler host and program for the single file
    const host = ts.createCompilerHost(parsed.options);
    const program = ts.createProgram([targetFile], parsed.options, host);
    const sourceFile = program.getSourceFile(targetFile);

    if (!sourceFile) {
      return { passed: false, message: "type error: could not parse source file" };
    }

    const diagnostics = [
      ...program.getSyntacticDiagnostics(sourceFile),
      ...program.getSemanticDiagnostics(sourceFile),
    ].filter((d) => d.category === ts.DiagnosticCategory.Error);

    if (diagnostics.length === 0) {
      return { passed: true };
    }

    const errors = diagnostics.slice(0, 5).map((d) => {
      const line =
        d.file && d.start !== undefined
          ? d.file.getLineAndCharacterOfPosition(d.start).line + 1
          : "?";
      const msg = ts.flattenDiagnosticMessageText(d.messageText, " ");
      return `  line ${line}: ${msg}`;
    });

    const suffix =
      diagnostics.length > 5
        ? `\n  ... and ${diagnostics.length - 5} more error(s)`
        : "";

    return {
      passed: false,
      message: `type error(s):\n${errors.join("\n")}${suffix}`,
    };
  } finally {
    if (tempFile && existsSync(tempFile)) {
      unlinkSync(tempFile);
    }
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function runAssertion(code: string, a: Assertion, filePath?: string): AssertionResult {
  switch (a.type) {
    case "imports": {
      const passed =
        code.includes(`from "${a.value}"`) ||
        code.includes(`from '${a.value}'`) ||
        code.includes(`require("${a.value}")`) ||
        code.includes(`require('${a.value}')`);
      return {
        passed,
        assertion: a,
        message: passed
          ? `imports "${a.value}"`
          : `missing import of "${a.value}"`,
      };
    }

    case "calls": {
      const pattern = new RegExp(`\\b${escapeRegex(a.value)}\\s*\\(`);
      const passed = pattern.test(code);
      return {
        passed,
        assertion: a,
        message: passed
          ? `calls ${a.value}()`
          : `missing call to ${a.value}()`,
      };
    }

    case "env_var": {
      const passed = code.includes(`process.env.${a.value}`);
      return {
        passed,
        assertion: a,
        message: passed
          ? `uses process.env.${a.value}`
          : `missing process.env.${a.value}`,
      };
    }

    case "contains": {
      const passed = code.includes(a.value);
      return {
        passed,
        assertion: a,
        message: passed ? `contains "${a.value}"` : `missing "${a.value}"`,
      };
    }

    case "not_contains": {
      const passed = !code.includes(a.value);
      return {
        passed,
        assertion: a,
        message: passed
          ? `does not contain "${a.value}"`
          : `should not contain "${a.value}"`,
      };
    }

    case "order": {
      const beforeIdx = code.indexOf(a.before);
      const afterIdx = code.indexOf(a.after);
      const passed =
        beforeIdx !== -1 && afterIdx !== -1 && beforeIdx < afterIdx;
      return {
        passed,
        assertion: a,
        message: passed
          ? `"${a.before}" appears before "${a.after}"`
          : beforeIdx === -1
          ? `"${a.before}" not found in output`
          : afterIdx === -1
          ? `"${a.after}" not found in output`
          : `"${a.before}" must appear before "${a.after}"`,
      };
    }

    case "regex": {
      const pattern = a.pattern ?? a.value;
      if (!pattern) {
        return {
          passed: false,
          assertion: a,
          message: "regex assertion missing 'pattern' (or 'value') field",
        };
      }
      const re = new RegExp(pattern, a.flags);
      const passed = re.test(code);
      return {
        passed,
        assertion: a,
        message: passed
          ? `matches /${pattern}/${a.flags ?? ""}`
          : `does not match /${pattern}/${a.flags ?? ""}`,
      };
    }

    case "compiles": {
      const result = checkCompiles(code, filePath);
      return {
        passed: result.passed,
        assertion: a,
        message: result.passed
          ? "compiles without type errors"
          : result.message,
      };
    }
  }
}

export function runAssertions(
  code: string,
  assertions: Assertion[],
  filePath?: string,
): AssertionResult[] {
  return assertions.map((a) => runAssertion(code, a, filePath));
}

/** Human-readable label for an assertion, used as a test name. */
export function describeAssertion(a: Assertion): string {
  switch (a.type) {
    case "imports":      return `imports "${a.value}"`;
    case "calls":        return `calls ${a.value}()`;
    case "env_var":      return `uses process.env.${a.value}`;
    case "contains":     return `contains "${a.value}"`;
    case "not_contains": return `does not contain "${a.value}"`;
    case "order":        return `${a.before} before ${a.after}`;
    case "regex":        return `matches /${a.pattern ?? a.value ?? "<missing>"}/${a.flags ?? ""}`;
    case "compiles":     return `compiles without type errors`;
  }
}
