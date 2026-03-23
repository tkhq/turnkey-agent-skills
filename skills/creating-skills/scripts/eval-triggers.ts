/**
 * Trigger evaluation for Turnkey agent skills.
 * Tests whether a skill's description causes Claude to load it for the right queries.
 *
 * Usage:
 *   npx tsx skills/creating-skills/scripts/eval-triggers.ts --skill creating-wallets
 *   npx tsx skills/creating-skills/scripts/eval-triggers.ts --skill creating-wallets --runs 3
 *
 * Adapted from Anthropic's skill-creator run_eval.py (Apache 2.0).
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

interface TriggerTestCase {
  should_trigger: string[];
  should_not_trigger: string[];
}

interface EvalResult {
  query: string;
  expected: boolean;
  triggered: boolean;
  pass: boolean;
}

function loadTriggers(skillName: string): TriggerTestCase {
  const triggersPath = path.join("skills", skillName, "evals", "triggers.json");
  if (!fs.existsSync(triggersPath)) {
    console.error(`No triggers.json found at ${triggersPath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(triggersPath, "utf-8"));
}

function getSkillDescription(skillName: string): string {
  const skillMdPath = path.join("skills", skillName, "SKILL.md");
  const content = fs.readFileSync(skillMdPath, "utf-8");
  const parsed = matter(content);
  return parsed.data.description || "";
}

function testTrigger(
  query: string,
  skillName: string,
  pluginDir: string
): boolean {
  // Use claude -p with --plugin-dir to test if the skill triggers
  // We check if the skill name appears in the output stream events
  try {
    const result = execSync(
      `claude -p "${query.replace(/"/g, '\\"')}" --plugin-dir "${pluginDir}" --output-format stream-json 2>/dev/null`,
      {
        encoding: "utf-8",
        timeout: 60000,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    // Check if the skill was loaded by looking for skill name in stream events
    const lines = result.split("\n").filter((l) => l.trim());
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        // Look for skill loading events or skill name in the response
        if (
          event.type === "skill" &&
          event.skill_name === skillName
        ) {
          return true;
        }
        // Also check if the response references the skill content
        if (
          event.type === "assistant" &&
          event.message?.content &&
          JSON.stringify(event.message.content).includes(skillName)
        ) {
          return true;
        }
      } catch {
        // Skip non-JSON lines
      }
    }
    return false;
  } catch {
    // Command failed or timed out
    return false;
  }
}

function parseArgs(): { skill: string; runs: number } {
  const args = process.argv.slice(2);
  let skill = "";
  let runs = 1;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--skill" && args[i + 1]) {
      skill = args[++i];
    } else if (args[i] === "--runs" && args[i + 1]) {
      runs = parseInt(args[++i], 10);
    }
  }

  if (!skill) {
    console.error("Usage: eval-triggers.ts --skill <skill-name> [--runs N]");
    process.exit(1);
  }

  return { skill, runs };
}

// Main
const { skill, runs } = parseArgs();
const pluginDir = process.cwd();

// Verify skill exists
const skillDir = path.join("skills", skill);
if (!fs.existsSync(path.join(skillDir, "SKILL.md"))) {
  console.error(`Skill not found: ${skillDir}`);
  process.exit(1);
}

const triggers = loadTriggers(skill);
const description = getSkillDescription(skill);

console.log(`Evaluating triggers for: ${skill}`);
console.log(`Description (${description.length} chars): ${description.substring(0, 100)}...`);
console.log(`Runs per query: ${runs}`);
console.log(`Should trigger: ${triggers.should_trigger.length} queries`);
console.log(`Should not trigger: ${triggers.should_not_trigger.length} queries`);
console.log("");

const results: EvalResult[] = [];

// Test should_trigger queries
for (const query of triggers.should_trigger) {
  let triggerCount = 0;
  for (let r = 0; r < runs; r++) {
    const triggered = testTrigger(query, skill, pluginDir);
    if (triggered) triggerCount++;
  }
  const triggered = triggerCount > runs / 2; // Majority vote
  const pass = triggered === true;
  results.push({ query, expected: true, triggered, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  [should trigger]     "${query}" (${triggerCount}/${runs})`);
}

// Test should_not_trigger queries
for (const query of triggers.should_not_trigger) {
  let triggerCount = 0;
  for (let r = 0; r < runs; r++) {
    const triggered = testTrigger(query, skill, pluginDir);
    if (triggered) triggerCount++;
  }
  const triggered = triggerCount > runs / 2;
  const pass = triggered === false;
  results.push({ query, expected: false, triggered, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  [should NOT trigger] "${query}" (${triggerCount}/${runs})`);
}

// Summary
const passed = results.filter((r) => r.pass).length;
const total = results.length;
const accuracy = ((passed / total) * 100).toFixed(1);

console.log(`\nResults: ${passed}/${total} passed (${accuracy}%)`);

const shouldTriggerResults = results.filter((r) => r.expected);
const shouldNotTriggerResults = results.filter((r) => !r.expected);
const triggerAccuracy =
  shouldTriggerResults.length > 0
    ? (
        (shouldTriggerResults.filter((r) => r.pass).length /
          shouldTriggerResults.length) *
        100
      ).toFixed(1)
    : "N/A";
const falsePositiveRate =
  shouldNotTriggerResults.length > 0
    ? (
        (shouldNotTriggerResults.filter((r) => !r.pass).length /
          shouldNotTriggerResults.length) *
        100
      ).toFixed(1)
    : "N/A";

console.log(`Trigger accuracy: ${triggerAccuracy}%`);
console.log(`False positive rate: ${falsePositiveRate}%`);

// Write results to file
const outputPath = path.join(skillDir, "evals", "trigger-results.json");
fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      skill,
      timestamp: new Date().toISOString(),
      runs,
      results,
      summary: {
        total,
        passed,
        accuracy: parseFloat(accuracy),
        triggerAccuracy: parseFloat(triggerAccuracy as string) || 0,
        falsePositiveRate: parseFloat(falsePositiveRate as string) || 0,
      },
    },
    null,
    2
  )
);
console.log(`\nResults saved to ${outputPath}`);

process.exit(passed === total ? 0 : 1);
