/**
 * Layer 3b — Reference file type-checking
 *
 * Extracts self-contained TypeScript code blocks (those with `import`
 * statements) from reference markdown files and runs them through the full
 * `checkCompiles` function (semantic type-checking with the project's
 * tsconfig). This catches breaking changes from SDK version bumps that
 * syntax-only validation in code-blocks.test.ts would miss.
 *
 * Continuation snippets (blocks that reference variables defined in an
 * earlier block but contain no imports) are intentionally skipped here —
 * they get syntax-checked by code-blocks.test.ts.
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

/**
 * A block is self-contained if it imports from a @turnkey/ package.
 * Blocks that only import chain-specific utilities (viem, ethers,
 * @solana/web3.js) are continuations that reference variables from the
 * preceding setup block.
 */
function isSelfContained(block: CodeBlock): boolean {
  return /\bimport\s.*["']@turnkey\//.test(block.code);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const referenceFiles = findReferenceFiles(SKILLS_ROOT);

describe("reference file discovery", () => {
  it("finds reference files to scan", () => {
    expect(referenceFiles.length).toBeGreaterThan(0);
  });
});

let selfContainedCount = 0;

for (const filePath of referenceFiles) {
  const content = readFileSync(filePath, "utf-8");
  const blocks = extractTypeScriptBlocks(content);
  const compilable = blocks.filter(isSelfContained);

  if (compilable.length === 0) continue;

  selfContainedCount += compilable.length;
  const name = relativePath(filePath);

  describe(`[compiles] ${name}`, () => {
    for (const block of compilable) {
      it(`block ${block.index}: compiles — "${block.preview}..."`, () => {
        const result = checkCompiles(block.code);
        expect(result.passed, result.passed ? "" : result.message).toBe(true);
      });
    }
  });
}

describe("reference compile coverage", () => {
  it("type-checks at least one self-contained TypeScript block", () => {
    expect(
      selfContainedCount,
      "No self-contained TS blocks found — reference compile suite is vacuous",
    ).toBeGreaterThan(0);
  });
});
