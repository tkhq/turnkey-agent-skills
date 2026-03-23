/**
 * LLM-powered description improvement for Turnkey agent skills.
 * Analyzes trigger eval failures and generates improved descriptions.
 *
 * Usage:
 *   npx tsx skills/creating-skills/scripts/improve-description.ts --skill creating-wallets
 *
 * Adapted from Anthropic's skill-creator improve_description.py (Apache 2.0).
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

function parseArgs(): { skill: string; dryRun: boolean } {
  const args = process.argv.slice(2);
  let skill = "";
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--skill" && args[i + 1]) {
      skill = args[++i];
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    }
  }

  if (!skill) {
    console.error("Usage: improve-description.ts --skill <name> [--dry-run]");
    process.exit(1);
  }

  return { skill, dryRun };
}

function loadTriggerResults(
  skillName: string
): { results: Array<{ query: string; expected: boolean; pass: boolean }> } | null {
  const resultsPath = path.join(
    "skills",
    skillName,
    "evals",
    "trigger-results.json"
  );
  if (!fs.existsSync(resultsPath)) return null;
  return JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
}

function improveDescription(
  skillName: string,
  currentDescription: string,
  failures: Array<{ query: string; expected: boolean }>,
  previousAttempts: string[]
): string {
  const failureDetails = failures
    .map(
      (f) =>
        `- "${f.query}" (expected: ${f.expected ? "should trigger" : "should NOT trigger"})`
    )
    .join("\n");

  const previousAttemptsStr =
    previousAttempts.length > 0
      ? `\nPrevious description attempts (do NOT repeat these):\n${previousAttempts.map((a, i) => `${i + 1}. "${a}"`).join("\n")}\n`
      : "";

  const prompt = `You are improving a skill description for an AI agent skill called "${skillName}".

Current description (${currentDescription.length} chars):
"${currentDescription}"

This description failed the following trigger tests:
${failureDetails}
${previousAttemptsStr}
Rules:
- The description MUST be under 1024 characters
- Write in third person
- Include explicit trigger phrases ("Use when asked to...")
- Structure: [What it does] + [When to use it] + [Trigger phrases]
- Do NOT include XML tags
- Make the description more specific to improve trigger accuracy
- If a should_trigger query failed, add related keywords or phrases
- If a should_not_trigger query failed, add negative context to narrow scope

Return ONLY the improved description text. No quotes, no explanation, no markdown.`;

  try {
    const result = execSync(
      `claude -p "${prompt.replace(/"/g, '\\"').replace(/\n/g, "\\n")}" --output-format text 2>/dev/null`,
      {
        encoding: "utf-8",
        timeout: 60000,
      }
    );

    let improved = result.trim();

    // Strip quotes if wrapped
    if (
      (improved.startsWith('"') && improved.endsWith('"')) ||
      (improved.startsWith("'") && improved.endsWith("'"))
    ) {
      improved = improved.slice(1, -1);
    }

    // Enforce 1024 char limit
    if (improved.length > 1024) {
      improved = improved.substring(0, 1021) + "...";
    }

    return improved;
  } catch (e) {
    console.error("Failed to generate improved description:", e);
    return currentDescription;
  }
}

function updateSkillDescription(skillName: string, newDescription: string): void {
  const skillMdPath = path.join("skills", skillName, "SKILL.md");
  const content = fs.readFileSync(skillMdPath, "utf-8");
  const parsed = matter(content);

  parsed.data.description = newDescription;

  const updated = matter.stringify(parsed.content, parsed.data);
  fs.writeFileSync(skillMdPath, updated);
}

// Main
const { skill, dryRun } = parseArgs();

const skillMdPath = path.join("skills", skill, "SKILL.md");
if (!fs.existsSync(skillMdPath)) {
  console.error(`Skill not found: skills/${skill}`);
  process.exit(1);
}

const content = fs.readFileSync(skillMdPath, "utf-8");
const parsed = matter(content);
const currentDescription = parsed.data.description || "";

console.log(`Current description (${currentDescription.length} chars):`);
console.log(`  "${currentDescription}"`);
console.log("");

// Load trigger results
const triggerResults = loadTriggerResults(skill);
if (!triggerResults) {
  console.error(
    "No trigger results found. Run eval-triggers.ts first."
  );
  process.exit(1);
}

const failures = triggerResults.results
  .filter((r) => !r.pass)
  .map((r) => ({ query: r.query, expected: r.expected }));

if (failures.length === 0) {
  console.log("All triggers passed. No improvement needed.");
  process.exit(0);
}

console.log(`Found ${failures.length} trigger failure(s). Generating improvement...`);

// Load previous attempts from history file
const historyPath = path.join("skills", skill, "evals", "description-history.json");
let previousAttempts: string[] = [];
if (fs.existsSync(historyPath)) {
  previousAttempts = JSON.parse(fs.readFileSync(historyPath, "utf-8"));
}

const improved = improveDescription(
  skill,
  currentDescription,
  failures,
  previousAttempts
);

console.log(`\nImproved description (${improved.length} chars):`);
console.log(`  "${improved}"`);

if (dryRun) {
  console.log("\n(Dry run, no changes written)");
} else {
  updateSkillDescription(skill, improved);

  // Save to history
  previousAttempts.push(currentDescription);
  fs.writeFileSync(historyPath, JSON.stringify(previousAttempts, null, 2));

  console.log(`\nUpdated skills/${skill}/SKILL.md`);
  console.log(`History saved to ${historyPath}`);
}
