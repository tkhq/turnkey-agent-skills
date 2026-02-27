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

/** Return a path relative to the project root, for readable test names. */
export function relativePath(absolutePath: string): string {
  return absolutePath.replace(PROJECT_ROOT + "/", "");
}
