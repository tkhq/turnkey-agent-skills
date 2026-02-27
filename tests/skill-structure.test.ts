/**
 * Layer 1 — Skill structure tests
 *
 * Validates every SKILL.md in the project:
 * - YAML frontmatter is present and has required fields
 * - name is snake_case (required by OpenClaw indexing)
 * - All required markdown sections are present
 * - Cross-references in Related Skills point to files that actually exist
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import matter from "gray-matter";
import { findSkillFiles, relativePath, SKILLS_ROOT, PROJECT_ROOT } from "./helpers.js";

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

      it("has a description field", () => {
        expect(parsed.data).toHaveProperty("description");
        expect(typeof parsed.data.description).toBe("string");
        expect((parsed.data.description as string).length).toBeGreaterThan(0);
      });

      it("description fits on one line (no newlines)", () => {
        // Multi-line descriptions break some skill indexers
        expect(parsed.data.description).not.toContain("\n");
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
