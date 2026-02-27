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
 */

export type Assertion =
  | { type: "imports"; value: string }
  | { type: "calls"; value: string }
  | { type: "env_var"; value: string }
  | { type: "contains"; value: string }
  | { type: "not_contains"; value: string }
  | { type: "order"; before: string; after: string }
  | { type: "regex"; pattern: string; flags?: string };

export interface AssertionResult {
  passed: boolean;
  assertion: Assertion;
  message: string;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function runAssertion(code: string, a: Assertion): AssertionResult {
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
      const re = new RegExp(a.pattern, a.flags);
      const passed = re.test(code);
      return {
        passed,
        assertion: a,
        message: passed
          ? `matches /${a.pattern}/${a.flags ?? ""}`
          : `does not match /${a.pattern}/${a.flags ?? ""}`,
      };
    }
  }
}

export function runAssertions(
  code: string,
  assertions: Assertion[]
): AssertionResult[] {
  return assertions.map((a) => runAssertion(code, a));
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
    case "regex":        return `matches /${a.pattern}/${a.flags ?? ""}`;
  }
}
