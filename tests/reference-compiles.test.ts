/**
 * Layer 3b — Reference file type-checking
 *
 * Extracts every TypeScript code block from reference files and runs them
 * through the full `checkCompiles` function (semantic type-checking with the
 * project's tsconfig). This catches breaking changes from SDK version bumps
 * that syntax-only validation in code-blocks.test.ts would miss.
 *
 * NOTE: Only reference files are tested here — SKILL.md code blocks are
 * intentionally partial snippets that won't pass semantic type-checking.
 */

import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";
import { checkCompiles } from "./grader.js";
import { findReferenceFiles, relativePath, SKILLS_ROOT } from "./helpers.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CodeBlock {
  code: string;
  /** 1-based index within the file */
  index: number;
  /** First non-empty line of the snippet, truncated, for test names */
  preview: string;
}

function extractTypeScriptBlocks(markdown: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const regex = /```(?:typescript|ts)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let index = 1;

  while ((match = regex.exec(markdown)) !== null) {
    const code = match[1];
    const firstLine = code
      .split("\n")
      .find((l) => l.trim().length > 0)
      ?.trim()
      .slice(0, 60) ?? "(empty)";
    blocks.push({ code, index: index++, preview: firstLine });
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const referenceFiles = findReferenceFiles(SKILLS_ROOT).filter(
  (f) => f.endsWith(".ts"),
);

describe("reference file discovery", () => {
  it("finds .ts reference files (may be zero)", () => {
    expect(Array.isArray(referenceFiles)).toBe(true);
  });
});

for (const filePath of referenceFiles) {
  const name = relativePath(filePath);
  const content = readFileSync(filePath, "utf-8");
  const blocks = extractTypeScriptBlocks(content);

  describe(`[compiles] ${name}`, () => {
    for (const block of blocks) {
      it(`block ${block.index}: compiles — "${block.preview}..."`, () => {
        const result = checkCompiles(block.code);
        expect(result.passed, result.passed ? "" : result.message).toBe(true);
      });
    }
  });
}
