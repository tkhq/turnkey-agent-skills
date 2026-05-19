/**
 * Layer 1 — Skill structure tests
 *
 * Validates every SKILL.md in the project:
 * - YAML frontmatter is present and has required fields (name, description)
 * - name is kebab-case and matches parent directory (Agent Skills spec)
 * - Required markdown sections are present
 * - Cross-references in Related Skills point to skills that exist
 * - evals.json files are well-formed and reference valid assertion types
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname, basename } from "path";
import { describe, it, expect } from "vitest";
import matter from "gray-matter";
import { findSkillFiles, findEvalsFiles, relativePath, SKILLS_ROOT, PROJECT_ROOT, ROOT_SKILL_FILE } from "./helpers.js";
import type { EvalsFile } from "./grader.js";

/**
 * Required sections for skill SKILL.md files.
 * Skills must have Troubleshooting and Related Skills.
 * Prerequisites can appear as "Prerequisites" or inline in the overview.
 */
const REQUIRED_SECTIONS = [
  "Troubleshooting",
  "Related Skills",
];

/**
 * At least one of these section patterns must appear for the skill
 * to have substantive content (instructions, examples, phases, recipes, etc.)
 */
const CONTENT_SECTION_PATTERNS = [
  "## Instructions",
  "## Examples",
  "## Option",
  "## Phase",
  "## Step 1",
  "## Step 2",
  // Trigger-based recipes (managing-agent style)
  "## My ",
  "## I need",
  // Policy/signing patterns
  "## How policies work",
  "## Choosing an approach",
  "## Turnkey-managed",
  // Primitives with descriptive sections
  "## Activity lifecycle",
  "## When to use",
  // Good ALLOW templates, anti-patterns
  "## Good ALLOW",
  "## Anti-patterns",
  // Three approver patterns
  "## Three approver",
];

const skillFiles = findSkillFiles(SKILLS_ROOT);

// Collect all skill names upfront for cross-reference validation
const allSkillNames = new Set(
  skillFiles.map((f) => matter(readFileSync(f, "utf-8")).data.name as string),
);

// Sanity check: the test suite itself is not vacuously passing
describe("skill discovery", () => {
  it("finds at least one SKILL.md", () => {
    expect(skillFiles.length).toBeGreaterThan(0);
  });
});

describe("managing-users emergency revocation guidance", () => {
  const managingUsersSkill = readFileSync(
    join(SKILLS_ROOT, "managing-users", "SKILL.md"),
    "utf-8",
  );
  const apiKeyExamples = readFileSync(
    join(SKILLS_ROOT, "managing-users", "references", "api-key-examples.md"),
    "utf-8",
  );
  const evalsData = JSON.parse(
    readFileSync(join(SKILLS_ROOT, "managing-users", "evals", "evals.json"), "utf-8"),
  ) as EvalsFile;

  it("routes compromised disposable agents through get_user plus delete_users", () => {
    const emergencyDocs = `${managingUsersSkill}\n${apiKeyExamples}`;
    expect(emergencyDocs).toMatch(/\bget_user\b/);
    expect(emergencyDocs).toMatch(/\bdelete_users\b/);
    expect(emergencyDocs).toMatch(/disposable[,\s-]+non-root agent/i);
    expect(emergencyDocs).toMatch(/delete_api_keys[\s\S]*another valid credential/i);
    expect(emergencyDocs).not.toMatch(/delet(?:e|ing) all (?:of )?a user's API keys immediately revokes/i);
  });

  it("keeps the compromised-agent eval aligned with user deletion", () => {
    const compromisedEval = evalsData.evals.find((evalItem) =>
      evalItem.prompt.toLowerCase().includes("compromised"),
    );
    expect(compromisedEval, "Missing compromised-agent eval").toBeDefined();
    expect(compromisedEval?.expected_output).toMatch(/\bget_user\b/);
    expect(compromisedEval?.expected_output).toMatch(/\bdelete_users\b/);
    expect(compromisedEval?.expected_output).not.toMatch(/\bdelete_api_keys\b/);
    expect(compromisedEval?.assertions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "regex", pattern: expect.stringContaining("get_user") }),
        expect.objectContaining({ type: "regex", pattern: expect.stringContaining("delete_users") }),
        expect.objectContaining({ type: "not_regex", pattern: expect.stringContaining("delete_api_keys") }),
      ]),
    );
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

      it("description is under 1024 characters (Agent Skills spec)", () => {
        expect(
          (parsed.data.description as string).length,
          `Description is ${(parsed.data.description as string).length} chars, max is 1024`,
        ).toBeLessThanOrEqual(1024);
      });

      it("description fits on one line (no newlines)", () => {
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

      it("has at least one content section", () => {
        const hasContent = CONTENT_SECTION_PATTERNS.some((pattern) =>
          content.includes(pattern)
        );
        expect(
          hasContent,
          `No content section found. Expected at least one of: ${CONTENT_SECTION_PATTERNS.join(", ")}`,
        ).toBe(true);
      });

      it("has Rules section", () => {
        expect(
          content.includes("## Rules") || content.includes("## Rules (mandatory"),
          'Missing required section "## Rules"',
        ).toBe(true);
      });
    });

    // -------------------------------------------------------------------------
    // Cross-references in Related Skills
    // -------------------------------------------------------------------------
    describe("Related Skills cross-references", () => {
      it("all referenced skill names exist", () => {
        const relatedMatch = content.match(
          /## Related Skills\n([\s\S]*?)(?=\n##\s|$)/
        );
        if (!relatedMatch) return;

        const relatedSection = relatedMatch[1];

        // Match backtick-quoted skill names like `managing-wallets` or full paths like `skills/managing-wallets/SKILL.md`
        const namePattern = /`([a-z][a-z0-9-]*)`/g;
        const refs = [...relatedSection.matchAll(namePattern)];

        for (const ref of refs) {
          const refName = ref[1];
          // Skip non-skill references (like env var names, file extensions)
          if (refName.includes(".") || refName.includes("/")) continue;
          // Check if it's a known skill name
          if (allSkillNames.size > 0) {
            expect(
              allSkillNames.has(refName),
              `Related skill "${refName}" not found. Known skills: ${[...allSkillNames].join(", ")}`,
            ).toBe(true);
          }
        }
      });
    });

    // -------------------------------------------------------------------------
    // Line count
    // -------------------------------------------------------------------------
    it("SKILL.md body is under 500 lines", () => {
      const lines = parsed.content.split("\n").length;
      expect(
        lines,
        `SKILL.md body is ${lines} lines, max recommended is 500`,
      ).toBeLessThanOrEqual(500);
    });
  });
}

// ---------------------------------------------------------------------------
// Root SKILL.md — package manifest, frontmatter only
// ---------------------------------------------------------------------------

const rootContent = readFileSync(ROOT_SKILL_FILE, "utf-8");
const rootParsed = matter(rootContent);

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

    it("has metadata.tags field (non-empty string)", () => {
      expect(rootParsed.data).toHaveProperty("metadata");
      expect(rootParsed.data.metadata).toHaveProperty("tags");
      expect(typeof rootParsed.data.metadata.tags).toBe("string");
      expect((rootParsed.data.metadata.tags as string).trim().length).toBeGreaterThan(0);
    });
  });

  it("lists all skills in the skills/ directory", () => {
    for (const skillName of allSkillNames) {
      expect(
        rootContent,
        `Root SKILL.md does not reference skill "${skillName}"`,
      ).toContain(skillName);
    }
  });
});

// ---------------------------------------------------------------------------
// evals.json ↔ SKILL.md cross-validation
// ---------------------------------------------------------------------------

const evalsFiles = findEvalsFiles(SKILLS_ROOT);

describe("evals.json skill_name matches SKILL.md name", () => {
  for (const evalsPath of evalsFiles) {
    const evalsData: EvalsFile = JSON.parse(readFileSync(evalsPath, "utf-8"));
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

// ---------------------------------------------------------------------------
// evals.json schema validation
// ---------------------------------------------------------------------------

const VALID_ASSERTION_TYPES = [
  "imports",
  "calls",
  "env_var",
  "contains",
  "not_contains",
  "order",
  "regex",
  "not_regex",
  "compiles",
] as const;

const ASSERTION_FIELDS: Record<string, string[]> = {
  imports: ["value"],
  calls: ["value"],
  env_var: ["value"],
  contains: ["value"],
  not_contains: ["value"],
  order: ["before", "after"],
  regex: [],  // requires "value" or "pattern" — validated below
  compiles: [],
};

for (const evalsPath of evalsFiles) {
  const raw = readFileSync(evalsPath, "utf-8");
  const evalsData = JSON.parse(raw);
  const label = relativePath(evalsPath);

  describe(`${label} schema`, () => {
    it("has a non-empty skill_name string", () => {
      expect(typeof evalsData.skill_name).toBe("string");
      expect(evalsData.skill_name.length).toBeGreaterThan(0);
    });

    it("has a non-empty evals array", () => {
      expect(Array.isArray(evalsData.evals)).toBe(true);
      expect(evalsData.evals.length).toBeGreaterThan(0);
    });

    it("eval IDs are unique", () => {
      const ids = evalsData.evals.map((e: { id: number }) => e.id);
      expect(new Set(ids).size, `Duplicate eval IDs: ${ids}`).toBe(ids.length);
    });

    for (const evalItem of evalsData.evals) {
      describe(`eval ${evalItem.id}`, () => {
        it("has required fields (id, prompt, expected_output, files)", () => {
          expect(typeof evalItem.id, "id must be a number").toBe("number");
          expect(typeof evalItem.prompt, "prompt must be a string").toBe("string");
          expect(evalItem.prompt.length, "prompt must not be empty").toBeGreaterThan(0);
          expect(typeof evalItem.expected_output, "expected_output must be a string").toBe("string");
          expect(evalItem.expected_output.length, "expected_output must not be empty").toBeGreaterThan(0);
          expect(Array.isArray(evalItem.files), "files must be an array").toBe(true);
        });

        it("files resolve to existing paths", () => {
          for (const filePath of evalItem.files) {
            const absPath = join(PROJECT_ROOT, filePath);
            expect(
              existsSync(absPath),
              `File not found: ${filePath}`,
            ).toBe(true);
          }
        });

        if (evalItem.assertions?.length) {
          for (let i = 0; i < evalItem.assertions.length; i++) {
            const assertion = evalItem.assertions[i];

            it(`assertion[${i}] has valid type "${assertion.type}"`, () => {
              expect(
                (VALID_ASSERTION_TYPES as readonly string[]).includes(assertion.type),
                `Unknown assertion type "${assertion.type}". Valid types: ${VALID_ASSERTION_TYPES.join(", ")}`,
              ).toBe(true);
            });

            it(`assertion[${i}] has required fields for type "${assertion.type}"`, () => {
              const requiredFields = ASSERTION_FIELDS[assertion.type];
              if (!requiredFields) return;
              for (const field of requiredFields) {
                expect(
                  assertion[field] !== undefined && assertion[field] !== null,
                  `Assertion type "${assertion.type}" requires field "${field}"`,
                ).toBe(true);
              }
              // regex assertions require either "value" or "pattern"
              if (assertion.type === "regex") {
                expect(
                  assertion.value !== undefined || assertion.pattern !== undefined,
                  `Assertion type "regex" requires either "value" or "pattern"`,
                ).toBe(true);
              }
            });
          }
        }
      });
    }
  });
}
