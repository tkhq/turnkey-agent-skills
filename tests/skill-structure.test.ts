/**
 * Layer 1 - Skill structure tests
 *
 * Validates every SKILL.md in the project:
 * - YAML frontmatter is present and has required fields
 * - name is kebab-case and matches directory name
 * - All required markdown sections are present
 * - Cross-references in Related Skills point to real skill names
 * - evals.json and triggers.json conform to expected schemas
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname, basename } from "path";
import { describe, it, expect } from "vitest";
import matter from "gray-matter";
import {
  findSkillFiles,
  findEvalsFiles,
  relativePath,
  SKILLS_ROOT,
} from "./helpers.js";

const REQUIRED_SECTIONS = [
  "Quick Start",
  "Prerequisites",
  "Rules",
  "Related Skills",
];

const skillFiles = findSkillFiles(SKILLS_ROOT);

// Collect all skill names upfront for cross-reference validation
const allSkillNames = new Set(
  skillFiles.map(
    (f) => matter(readFileSync(f, "utf-8")).data.name as string
  )
);

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
    // -----------------------------------------------------------------------
    // Frontmatter
    // -----------------------------------------------------------------------
    describe("frontmatter", () => {
      it("has a name field", () => {
        expect(parsed.data).toHaveProperty("name");
        expect(typeof parsed.data.name).toBe("string");
        expect((parsed.data.name as string).length).toBeGreaterThan(0);
      });

      it("name is kebab-case", () => {
        expect(parsed.data.name).toMatch(/^[a-z][a-z0-9-]*$/);
      });

      it("name matches parent directory", () => {
        const dirName = basename(dirname(filePath));
        expect(
          parsed.data.name,
          `SKILL.md name "${parsed.data.name}" does not match directory "${dirName}".`
        ).toBe(dirName);
      });

      it("has a description field", () => {
        expect(parsed.data).toHaveProperty("description");
        expect(typeof parsed.data.description).toBe("string");
        expect((parsed.data.description as string).length).toBeGreaterThan(0);
      });

      it("description fits on one line (no newlines)", () => {
        expect(parsed.data.description).not.toContain("\n");
      });

      it("description is under 1024 characters", () => {
        expect((parsed.data.description as string).length).toBeLessThanOrEqual(
          1024
        );
      });

      it("has a license field", () => {
        expect(parsed.data).toHaveProperty("license");
        expect(typeof parsed.data.license).toBe("string");
      });

      it("has a compatibility field", () => {
        expect(parsed.data).toHaveProperty("compatibility");
        expect(typeof parsed.data.compatibility).toBe("string");
      });

      it("has metadata.version", () => {
        expect(parsed.data).toHaveProperty("metadata");
        expect(parsed.data.metadata).toHaveProperty("version");
        expect(typeof parsed.data.metadata.version).toBe("string");
      });

      it("has metadata.author", () => {
        expect(parsed.data.metadata).toHaveProperty("author");
        expect(typeof parsed.data.metadata.author).toBe("string");
        expect(
          (parsed.data.metadata.author as string).length
        ).toBeGreaterThan(0);
      });

      it("has metadata.tags (non-empty array)", () => {
        expect(parsed.data.metadata).toHaveProperty("tags");
        expect(Array.isArray(parsed.data.metadata.tags)).toBe(true);
        expect(
          (parsed.data.metadata.tags as unknown[]).length
        ).toBeGreaterThan(0);
      });
    });

    // -----------------------------------------------------------------------
    // Required sections
    // -----------------------------------------------------------------------
    describe("required sections", () => {
      for (const section of REQUIRED_SECTIONS) {
        it(`has section: ${section}`, () => {
          const pattern = new RegExp(`^## ${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "m");
          expect(
            pattern.test(parsed.content),
            `Missing required section "## ${section}"`
          ).toBe(true);
        });
      }

      it("has at least one content section (Instructions or Phase)", () => {
        const hasInstructions = /^## Instructions/m.test(parsed.content);
        const hasPhase = /^## Phase \d/m.test(parsed.content);
        const hasMakingRequests = /^## Making Requests/m.test(parsed.content);
        expect(
          hasInstructions || hasPhase || hasMakingRequests,
          "Missing content section: need ## Instructions, ## Phase N, or ## Making Requests"
        ).toBe(true);
      });
    });

    // -----------------------------------------------------------------------
    // Cross-references
    // -----------------------------------------------------------------------
    describe("Related Skills cross-references", () => {
      it("all referenced skill names exist", () => {
        const relatedMatch = parsed.content.match(
          /## Related Skills\n([\s\S]*?)(?=\n## |\n---\s*$|$)/
        );
        if (!relatedMatch) return;

        const namePattern = /`([a-z][a-z0-9-]+(?:-api|-workflow))`/g;
        const refs = [...relatedMatch[1].matchAll(namePattern)];
        for (const ref of refs) {
          expect(
            allSkillNames.has(ref[1]),
            `Broken reference: "${ref[1]}" is not a known skill. Known: ${[...allSkillNames].join(", ")}`
          ).toBe(true);
        }
      });
    });
  });
}

// ---------------------------------------------------------------------------
// evals.json schema validation
// ---------------------------------------------------------------------------

const evalsFiles = findEvalsFiles(SKILLS_ROOT);

describe("evals.json schema", () => {
  it("finds at least one evals.json", () => {
    expect(evalsFiles.length).toBeGreaterThan(0);
  });

  for (const evalsPath of evalsFiles) {
    const label = relativePath(evalsPath);
    const raw = readFileSync(evalsPath, "utf-8");
    let evalsData: unknown[];

    try {
      evalsData = JSON.parse(raw);
    } catch {
      describe(label, () => {
        it("is valid JSON", () => {
          expect.unreachable("evals.json is not valid JSON");
        });
      });
      continue;
    }

    describe(label, () => {
      it("is a non-empty array", () => {
        expect(Array.isArray(evalsData)).toBe(true);
        expect(evalsData.length).toBeGreaterThan(0);
      });

      for (let i = 0; i < evalsData.length; i++) {
        const entry = evalsData[i] as Record<string, unknown>;
        describe(`eval[${i}]`, () => {
          it("has skills array with at least one entry", () => {
            expect(Array.isArray(entry.skills)).toBe(true);
            expect((entry.skills as unknown[]).length).toBeGreaterThan(0);
            for (const s of entry.skills as unknown[]) {
              expect(typeof s).toBe("string");
            }
          });

          it("has a non-empty query string", () => {
            expect(typeof entry.query).toBe("string");
            expect((entry.query as string).length).toBeGreaterThan(0);
          });

          it("has expected_behavior array with at least one entry", () => {
            expect(Array.isArray(entry.expected_behavior)).toBe(true);
            expect(
              (entry.expected_behavior as unknown[]).length
            ).toBeGreaterThan(0);
          });
        });
      }
    });
  }
});

// ---------------------------------------------------------------------------
// triggers.json schema validation
// ---------------------------------------------------------------------------

describe("triggers.json schema", () => {
  const skillDirs = readdirSync(SKILLS_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(SKILLS_ROOT, d.name));

  for (const skillDir of skillDirs) {
    const triggersPath = join(skillDir, "evals", "triggers.json");
    if (!existsSync(triggersPath)) continue;

    const label = relativePath(triggersPath);
    const data = JSON.parse(readFileSync(triggersPath, "utf-8"));

    describe(label, () => {
      it("has should_trigger array with at least one entry", () => {
        expect(Array.isArray(data.should_trigger)).toBe(true);
        expect(data.should_trigger.length).toBeGreaterThan(0);
        for (const q of data.should_trigger) {
          expect(typeof q).toBe("string");
        }
      });

      it("has should_not_trigger array with at least one entry", () => {
        expect(Array.isArray(data.should_not_trigger)).toBe(true);
        expect(data.should_not_trigger.length).toBeGreaterThan(0);
        for (const q of data.should_not_trigger) {
          expect(typeof q).toBe("string");
        }
      });

      it("has no duplicate entries between arrays", () => {
        const all = new Set([
          ...data.should_trigger,
          ...data.should_not_trigger,
        ]);
        expect(all.size).toBe(
          data.should_trigger.length + data.should_not_trigger.length
        );
      });
    });
  }
});
