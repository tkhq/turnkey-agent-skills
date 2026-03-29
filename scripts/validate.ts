/**
 * Structural validation for Turnkey agent skills.
 * Checks frontmatter, naming, required files, and character limits.
 *
 * Usage:
 *   npx tsx scripts/validate.ts [skills/skill-name]
 *
 * If no argument is provided, validates all skills in skills/.
 *
 * Adapted from Anthropic's skill-creator (Apache 2.0).
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

interface ValidationResult {
  skill: string;
  errors: string[];
  warnings: string[];
}

function findSkillDirs(baseDir: string): string[] {
  if (!fs.existsSync(baseDir)) return [];
  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(baseDir, d.name))
    .filter((dir) => fs.existsSync(path.join(dir, "SKILL.md")));
}

function validateSkill(skillDir: string): ValidationResult {
  const name = path.basename(skillDir);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check SKILL.md exists
  const skillMdPath = path.join(skillDir, "SKILL.md");
  if (!fs.existsSync(skillMdPath)) {
    errors.push("Missing SKILL.md");
    return { skill: name, errors, warnings };
  }

  // Parse frontmatter
  const content = fs.readFileSync(skillMdPath, "utf-8");
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(content);
  } catch {
    errors.push("Failed to parse YAML frontmatter");
    return { skill: name, errors, warnings };
  }

  const data = parsed.data;

  // Validate name field
  if (!data.name) {
    errors.push("Missing required field: name");
  } else {
    if (typeof data.name !== "string") {
      errors.push("Field 'name' must be a string");
    } else {
      if (data.name.length > 64) {
        errors.push(`Name exceeds 64 characters (${data.name.length})`);
      }
      if (!/^[a-z][a-z0-9-]*$/.test(data.name)) {
        errors.push(
          "Name must be kebab-case (lowercase letters, numbers, hyphens, starting with a letter)"
        );
      }
      if (data.name !== name) {
        errors.push(
          `Name '${data.name}' does not match directory name '${name}'`
        );
      }
      if (/claude|anthropic/i.test(data.name)) {
        errors.push("Name must not contain 'claude' or 'anthropic'");
      }
    }
  }

  // Validate description field
  if (!data.description) {
    errors.push("Missing required field: description");
  } else {
    if (typeof data.description !== "string") {
      errors.push("Field 'description' must be a string");
    } else {
      if (data.description.length > 1024) {
        errors.push(
          `Description exceeds 1024 characters (${data.description.length})`
        );
      }
      if (data.description.length === 0) {
        errors.push("Description must not be empty");
      }
      if (/<[^>]+>/.test(data.description)) {
        errors.push("Description must not contain XML tags");
      }
      if (!/use when/i.test(data.description)) {
        warnings.push(
          "Description should include 'Use when' trigger guidance"
        );
      }
    }
  }

  // Check line count
  const lines = parsed.content.split("\n").length;
  if (lines > 500) {
    errors.push(`SKILL.md body exceeds 500 lines (${lines})`);
  } else if (lines > 300) {
    warnings.push(`SKILL.md body is ${lines} lines (prefer under 300)`);
  }

  // Check for README.md (should not exist inside skill folders)
  if (fs.existsSync(path.join(skillDir, "README.md"))) {
    warnings.push("Skill folders should not contain README.md");
  }

  // Check evals directory
  const evalsDir = path.join(skillDir, "evals");
  if (!fs.existsSync(evalsDir)) {
    errors.push("Missing evals/ directory");
  } else {
    const evalsJson = path.join(evalsDir, "evals.json");
    const triggersJson = path.join(evalsDir, "triggers.json");

    if (!fs.existsSync(evalsJson)) {
      errors.push("Missing evals/evals.json");
    } else {
      try {
        const evals = JSON.parse(fs.readFileSync(evalsJson, "utf-8"));
        if (!Array.isArray(evals)) {
          errors.push("evals.json must be a JSON array");
        } else if (evals.length < 1) {
          warnings.push("evals.json should have at least 1 eval");
        }
      } catch {
        errors.push("evals.json is not valid JSON");
      }
    }

    if (!fs.existsSync(triggersJson)) {
      errors.push("Missing evals/triggers.json");
    } else {
      try {
        const triggers = JSON.parse(fs.readFileSync(triggersJson, "utf-8"));
        if (!triggers.should_trigger || !Array.isArray(triggers.should_trigger)) {
          errors.push("triggers.json must have a 'should_trigger' array");
        }
        if (
          !triggers.should_not_trigger ||
          !Array.isArray(triggers.should_not_trigger)
        ) {
          errors.push("triggers.json must have a 'should_not_trigger' array");
        }
      } catch {
        errors.push("triggers.json is not valid JSON");
      }
    }
  }

  return { skill: name, errors, warnings };
}

// Main
const args = process.argv.slice(2);
let skillDirs: string[];

if (args.length > 0) {
  // Validate specific skill
  const target = args[0];
  if (fs.existsSync(path.join(target, "SKILL.md"))) {
    skillDirs = [target];
  } else {
    console.error(`No SKILL.md found at ${target}`);
    process.exit(1);
  }
} else {
  // Validate all skills
  skillDirs = findSkillDirs("skills");
}

if (skillDirs.length === 0) {
  console.log("No skills found to validate.");
  process.exit(0);
}

let hasErrors = false;

for (const dir of skillDirs) {
  const result = validateSkill(dir);
  const status =
    result.errors.length > 0
      ? "FAIL"
      : result.warnings.length > 0
        ? "WARN"
        : "PASS";

  console.log(`\n${status}  ${result.skill}`);

  for (const err of result.errors) {
    console.log(`  ERROR: ${err}`);
    hasErrors = true;
  }
  for (const warn of result.warnings) {
    console.log(`  WARN:  ${warn}`);
  }
}

console.log(
  `\nValidated ${skillDirs.length} skill(s). ${hasErrors ? "Some skills have errors." : "All skills passed."}`
);
process.exit(hasErrors ? 1 : 0);
