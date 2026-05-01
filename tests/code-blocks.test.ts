/**
 * Layer 3 — Code block syntax tests
 *
 * Extracts every TypeScript code block (```typescript or ```ts) from each
 * SKILL.md and checks it for syntax errors using the TypeScript compiler API.
 *
 * NOTE: This is syntax-only validation, not type-checking. Snippets are
 * intentionally partial (they reference variables defined in surrounding prose)
 * so type errors are expected and ignored. Syntax errors, on the other hand,
 * indicate a broken example that an agent would fail to use correctly.
 *
 * Full type-checking of the complete example files is handled separately by
 * `npm run typecheck` (tsc --noEmit on examples/*.ts).
 */

import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";
import * as ts from "typescript";
import {
  findSkillFiles,
  findReferenceFiles,
  relativePath,
  SKILLS_ROOT,
  extractTypeScriptBlocks,
} from "./helpers.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the markdown contains at least one fenced code block of any language. */
function hasAnyCodeBlock(markdown: string): boolean {
  return /```(?:\w*)\n[\s\S]*?```/.test(markdown);
}

function getSyntaxErrors(code: string): string[] {
  const sourceFile = ts.createSourceFile(
    "snippet.ts",
    code,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true
  );

  // Build a minimal in-memory compiler host so TypeScript can run getSyntacticDiagnostics
  const host: ts.CompilerHost = {
    getSourceFile: (fileName) =>
      fileName === "snippet.ts" ? sourceFile : undefined,
    writeFile: () => {},
    getDefaultLibFileName: () => "lib.d.ts",
    useCaseSensitiveFileNames: () => true,
    getCanonicalFileName: (f) => f,
    getCurrentDirectory: () => "",
    getNewLine: () => "\n",
    fileExists: (fileName) => fileName === "snippet.ts",
    readFile: () => undefined,
    directoryExists: () => false,
    getDirectories: () => [],
  };

  const program = ts.createProgram(
    ["snippet.ts"],
    {
      noLib: true,
      noResolve: true,
      target: ts.ScriptTarget.ES2022,
    },
    host
  );

  const diagnostics = program.getSyntacticDiagnostics(sourceFile);
  return Array.from(diagnostics).map((d) =>
    ts.flattenDiagnosticMessageText(d.messageText, "\n")
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const skillFiles = findSkillFiles(SKILLS_ROOT);
const referenceFiles = findReferenceFiles(SKILLS_ROOT);

for (const filePath of [...skillFiles, ...referenceFiles]) {
  const name = relativePath(filePath);
  const content = readFileSync(filePath, "utf-8");
  const blocks = extractTypeScriptBlocks(content);

  describe(name, () => {
    it("has at least one code block", () => {
      expect(
        hasAnyCodeBlock(content),
        "Every skill/reference file should include at least one code example",
      ).toBe(true);
    });

    if (blocks.length === 0) {
      return;
    }

    for (const block of blocks) {
      it(`block ${block.index}: no syntax errors — "${block.preview}..."`, () => {
        const errors = getSyntaxErrors(block.code);
        expect(errors, `Syntax errors in block ${block.index}:\n${errors.join("\n")}`).toEqual([]);
      });
    }
  });
}
