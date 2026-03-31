/**
 * Layer 2 - JSON code block validation
 *
 * Extracts every JSON code block (```json) from SKILL.md and reference files,
 * validates them with JSON.parse. Blocks containing "..." truncation markers
 * are skipped (these are intentionally abbreviated examples).
 *
 * Adapted from main branch's TypeScript syntax checker for v2's JSON-based
 * API examples.
 */

import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";
import {
  findSkillFiles,
  findReferenceFiles,
  relativePath,
  SKILLS_ROOT,
} from "./helpers.js";

interface CodeBlock {
  code: string;
  index: number;
  preview: string;
}

function extractJsonBlocks(markdown: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const regex = /```json\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let index = 1;

  while ((match = regex.exec(markdown)) !== null) {
    const code = match[1];
    const firstLine = code
      .split("\n")
      .find((l) => l.trim().length > 0)
      ?.trim()
      .slice(0, 60) ?? "(empty)";
    blocks.push({ code: code.trim(), index: index++, preview: firstLine });
  }

  return blocks;
}

const skillFiles = findSkillFiles(SKILLS_ROOT);
const referenceFiles = findReferenceFiles(SKILLS_ROOT);

for (const filePath of [...skillFiles, ...referenceFiles]) {
  const name = relativePath(filePath);
  const content = readFileSync(filePath, "utf-8");
  const blocks = extractJsonBlocks(content);

  if (blocks.length === 0) continue;

  describe(name, () => {
    for (const block of blocks) {
      it(`block ${block.index}: valid JSON "${block.preview}..."`, () => {
        try {
          JSON.parse(block.code);
        } catch (err) {
          // Allow blocks with "..." truncation markers (intentionally abbreviated)
          if (block.code.includes("...")) {
            return; // skip: truncated example
          }
          expect.unreachable(
            `Invalid JSON in block ${block.index}: ${(err as Error).message}`
          );
        }
      });
    }
  });
}
