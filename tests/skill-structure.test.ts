/**
 * Layer 1 — Skill structure tests
 *
 * Validates every SKILL.md in the project:
 * - YAML frontmatter is present and has required fields
 * - name is kebab-case (required by Anthropic skills spec and OpenClaw indexing)
 * - All required markdown sections are present
 * - Cross-references in Related Skills point to files that actually exist
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname, basename } from "path";
import { describe, it, expect } from "vitest";
import matter from "gray-matter";
import { findSkillFiles, findEvalsFiles, relativePath, SKILLS_ROOT, PROJECT_ROOT, ROOT_SKILL_FILE } from "./helpers.js";
import type { EvalsFile } from "./grader.js";

const REQUIRED_SECTIONS = [
  "Overview",
  "Prerequisites",
  "Environment Variables",
  "Troubleshooting",
  "Related Skills",
];

const skillFiles = findSkillFiles(SKILLS_ROOT);

// Sanity check: the test suite itself is not vacuously passing
describe("skill discovery", () => {
  it("finds at least one SKILL.md", () => {
    expect(skillFiles.length).toBeGreaterThan(0);
  });
});

for (const filePath of skillFiles) {
  const name = relativePath(filePath);
  const content = readFileSync(filePath, "utf-8");
  const parsed = matter(content);

  describe(name, () => {
    // -------------------------------------------------------------------------
    // Frontmatter
    // -------------------------------------------------------------------------
    describe("frontmatter", () => {
      it("has a name field", () => {
        expect(parsed.data).toHaveProperty("name");
        expect(typeof parsed.data.name).toBe("string");
        expect((parsed.data.name as string).length).toBeGreaterThan(0);
      });

      it("name is kebab-case", () => {
        // Must start with a lowercase letter and contain only lowercase letters,
        // digits, and hyphens. Required by the Anthropic skills spec and OpenClaw indexing.
        expect(parsed.data.name).toMatch(/^[a-z][a-z0-9-]*$/);
      });

      it("name matches parent directory (Agent Skills spec)", () => {
        const dirName = basename(dirname(filePath));
        expect(
          parsed.data.name,
          `SKILL.md name "${parsed.data.name}" does not match directory "${dirName}". The Agent Skills spec requires name === directory name.`,
        ).toBe(dirName);
      });

      it("has a description field", () => {
        expect(parsed.data).toHaveProperty("description");
        expect(typeof parsed.data.description).toBe("string");
        expect((parsed.data.description as string).length).toBeGreaterThan(0);
      });

      it("description fits on one line (no newlines)", () => {
        // Multi-line descriptions break some skill indexers
        expect(parsed.data.description).not.toContain("\n");
      });

      it("has sdk_versions with valid @turnkey/ entries", () => {
        expect(parsed.data).toHaveProperty("sdk_versions");
        const versions = parsed.data.sdk_versions;
        expect(typeof versions).toBe("object");
        expect(Array.isArray(versions)).toBe(false);
        for (const [pkg, ver] of Object.entries(versions as Record<string, unknown>)) {
          expect(pkg, `sdk_versions key "${pkg}" must start with @turnkey/`).toMatch(/^@turnkey\//);
          expect(typeof ver, `sdk_versions["${pkg}"] must be a string`).toBe("string");
          expect((ver as string).length, `sdk_versions["${pkg}"] must not be empty`).toBeGreaterThan(0);
        }
      });
    });

    // -------------------------------------------------------------------------
    // Required sections
    // -------------------------------------------------------------------------
    describe("required sections", () => {
      for (const section of REQUIRED_SECTIONS) {
        it(`has ## ${section}`, () => {
          expect(content, `Missing required section "## ${section}"`).toContain(`## ${section}`);
        });
      }

      it("has at least one content section (Instructions, Examples, or Option A/B)", () => {
        const hasInstructions = content.includes("## Instructions");
        const hasExamples = content.includes("## Examples");
        const hasOptions = content.includes("## Option"); // ethereum-evm style
        expect(hasInstructions || hasExamples || hasOptions).toBe(true);
      });
    });

    // -------------------------------------------------------------------------
    // Cross-references
    // -------------------------------------------------------------------------
    describe("Related Skills cross-references", () => {
      it("all referenced skill paths exist on disk", () => {
        // Extract the Related Skills section content
        const relatedMatch = content.match(
          /## Related Skills\n([\s\S]*?)(?=\n##\s|$)/
        );
        if (!relatedMatch) return;

        const relatedSection = relatedMatch[1];

        // Match backtick-quoted paths like `skills/core/wallet-management/SKILL.md`
        const pathPattern = /`(skills\/[^`]+\.md)`/g;
        const refs = [...relatedSection.matchAll(pathPattern)];

        for (const ref of refs) {
          const referencedPath = join(PROJECT_ROOT, ref[1]);
          expect(
            existsSync(referencedPath),
            `Broken reference: ${ref[1]} does not exist`
          ).toBe(true);
        }
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Root SKILL.md — package manifest, frontmatter only
//
// The root SKILL.md is a ClawHub package entry point, not a skill guide.
// It must have valid frontmatter but is not required to have the standard
// skill sections (Prerequisites, Troubleshooting, etc.).
// ---------------------------------------------------------------------------

const rootContent = readFileSync(ROOT_SKILL_FILE, "utf-8");
const rootParsed = matter(rootContent);

// ---------------------------------------------------------------------------
// evals.json ↔ SKILL.md cross-validation
//
// Each evals.json has a skill_name field that must match the name in its
// parent SKILL.md frontmatter. Drift between these causes confusing workspace
// directory names and broken eval filtering.
// ---------------------------------------------------------------------------

const evalsFiles = findEvalsFiles(SKILLS_ROOT);

describe("evals.json skill_name matches SKILL.md name", () => {
  for (const evalsPath of evalsFiles) {
    const evalsData: EvalsFile = JSON.parse(readFileSync(evalsPath, "utf-8"));
    // evals/evals.json → skill dir is two levels up
    const skillDir = join(evalsPath, "..", "..");
    const skillMdPath = join(skillDir, "SKILL.md");

    it(`${relativePath(evalsPath)}`, () => {
      expect(existsSync(skillMdPath), `No SKILL.md found at ${skillDir}`).toBe(true);
      const skillParsed = matter(readFileSync(skillMdPath, "utf-8"));
      expect(
        evalsData.skill_name,
        `evals.json skill_name "${evalsData.skill_name}" does not match SKILL.md name "${skillParsed.data.name}"`,
      ).toBe(skillParsed.data.name);
    });
  }
});

describe("SKILL.md (root package manifest)", () => {
  describe("frontmatter", () => {
    it("has a name field", () => {
      expect(rootParsed.data).toHaveProperty("name");
      expect(typeof rootParsed.data.name).toBe("string");
      expect((rootParsed.data.name as string).length).toBeGreaterThan(0);
    });

    it("name is kebab-case", () => {
      expect(rootParsed.data.name).toMatch(/^[a-z][a-z0-9-]*$/);
    });

    it("has a description field", () => {
      expect(rootParsed.data).toHaveProperty("description");
      expect(typeof rootParsed.data.description).toBe("string");
      expect((rootParsed.data.description as string).length).toBeGreaterThan(0);
    });

    it("description fits on one line (no newlines)", () => {
      expect(rootParsed.data.description).not.toContain("\n");
    });

    it("has a version field", () => {
      expect(rootParsed.data).toHaveProperty("version");
      expect(typeof rootParsed.data.version).toBe("string");
    });

    it("has a tags field (array)", () => {
      expect(rootParsed.data).toHaveProperty("tags");
      expect(Array.isArray(rootParsed.data.tags)).toBe(true);
      expect((rootParsed.data.tags as unknown[]).length).toBeGreaterThan(0);
    });
  });
});
