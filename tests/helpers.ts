import { readdirSync } from "fs";
import { join, resolve } from "path";

/** Recursively find all evals.json files under a directory. */
export function findEvalsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findEvalsFiles(fullPath));
    } else if (entry.name === "evals.json") {
      results.push(fullPath);
    }
  }
  return results;
}

export const PROJECT_ROOT = resolve(process.cwd());
export const SKILLS_ROOT = resolve(PROJECT_ROOT, "skills");
export const ROOT_SKILL_FILE = join(PROJECT_ROOT, "SKILL.md");

/** Recursively find all SKILL.md files under a directory. */
export function findSkillFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSkillFiles(fullPath));
    } else if (entry.name === "SKILL.md") {
      results.push(fullPath);
    }
  }
  return results;
}

/** Recursively find all .md files under any references/ directory. */
export function findReferenceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "references") {
        // Collect all .md files directly inside this references/ dir
        for (const ref of readdirSync(fullPath, { withFileTypes: true })) {
          if (!ref.isDirectory() && ref.name.endsWith(".md")) {
            results.push(join(fullPath, ref.name));
          }
        }
      } else {
        results.push(...findReferenceFiles(fullPath));
      }
    }
  }
  return results;
}

/** Return a path relative to the project root, for readable test names. */
export function relativePath(absolutePath: string): string {
  return absolutePath.replace(PROJECT_ROOT + "/", "");
}

export interface CodeBlock {
  code: string;
  /** 1-based index within the file, for readable test names */
  index: number;
  /** First non-empty line of the snippet, truncated, for test names */
  preview: string;
}

/** Extract every fenced ```typescript or ```ts code block from a markdown string. */
export function extractTypeScriptBlocks(markdown: string): CodeBlock[] {
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
