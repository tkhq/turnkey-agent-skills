/**
 * Iterative eval + improve loop for Turnkey agent skills.
 * Runs trigger evaluation, improves description if failing, re-evaluates.
 *
 * Usage:
 *   npx tsx scripts/eval-loop.ts --skill creating-wallets
 *   npx tsx scripts/eval-loop.ts --skill creating-wallets --max-iterations 5
 *
 * Adapted from Anthropic's skill-creator run_loop.py (Apache 2.0).
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

interface IterationResult {
  iteration: number;
  description: string;
  accuracy: number;
  triggerAccuracy: number;
  falsePositiveRate: number;
  passed: boolean;
}

function parseArgs(): { skill: string; maxIterations: number; targetAccuracy: number } {
  const args = process.argv.slice(2);
  let skill = "";
  let maxIterations = 5;
  let targetAccuracy = 90;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--skill" && args[i + 1]) {
      skill = args[++i];
    } else if (args[i] === "--max-iterations" && args[i + 1]) {
      maxIterations = parseInt(args[++i], 10);
    } else if (args[i] === "--target-accuracy" && args[i + 1]) {
      targetAccuracy = parseInt(args[++i], 10);
    }
  }

  if (!skill) {
    console.error("Usage: eval-loop.ts --skill <name> [--max-iterations N] [--target-accuracy N]");
    process.exit(1);
  }

  return { skill, maxIterations, targetAccuracy };
}

function runTriggerEval(skill: string): { accuracy: number; triggerAccuracy: number; falsePositiveRate: number; passed: boolean } {
  try {
    execSync(
      `npx tsx scripts/eval-triggers.ts --skill ${skill}`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    // If it exits 0, all passed
  } catch {
    // Exit code 1 means some failed, which is expected
  }

  // Read results
  const resultsPath = path.join("skills", skill, "evals", "trigger-results.json");
  if (!fs.existsSync(resultsPath)) {
    return { accuracy: 0, triggerAccuracy: 0, falsePositiveRate: 100, passed: false };
  }

  const results = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
  return {
    accuracy: results.summary.accuracy,
    triggerAccuracy: results.summary.triggerAccuracy,
    falsePositiveRate: results.summary.falsePositiveRate,
    passed: results.summary.accuracy === 100,
  };
}

function runImproveDescription(skill: string): void {
  try {
    execSync(
      `npx tsx scripts/improve-description.ts --skill ${skill}`,
      { encoding: "utf-8", stdio: "inherit" }
    );
  } catch {
    console.error("Failed to improve description");
  }
}

function getDescription(skill: string): string {
  const skillMdPath = path.join("skills", skill, "SKILL.md");
  const content = fs.readFileSync(skillMdPath, "utf-8");
  const parsed = matter(content);
  return parsed.data.description || "";
}

// Main
const { skill, maxIterations, targetAccuracy } = parseArgs();

const skillDir = path.join("skills", skill);
if (!fs.existsSync(path.join(skillDir, "SKILL.md"))) {
  console.error(`Skill not found: ${skillDir}`);
  process.exit(1);
}

console.log(`Starting eval loop for: ${skill}`);
console.log(`Max iterations: ${maxIterations}`);
console.log(`Target accuracy: ${targetAccuracy}%`);
console.log("");

const history: IterationResult[] = [];

for (let i = 1; i <= maxIterations; i++) {
  console.log(`--- Iteration ${i}/${maxIterations} ---`);
  const description = getDescription(skill);

  // Run eval
  const evalResult = runTriggerEval(skill);

  const iterResult: IterationResult = {
    iteration: i,
    description,
    accuracy: evalResult.accuracy,
    triggerAccuracy: evalResult.triggerAccuracy,
    falsePositiveRate: evalResult.falsePositiveRate,
    passed: evalResult.triggerAccuracy >= targetAccuracy && evalResult.falsePositiveRate === 0,
  };
  history.push(iterResult);

  console.log(`Accuracy: ${evalResult.accuracy}% (trigger: ${evalResult.triggerAccuracy}%, false positive: ${evalResult.falsePositiveRate}%)`);

  if (iterResult.passed) {
    console.log(`\nTarget reached at iteration ${i}. Done.`);
    break;
  }

  if (i < maxIterations) {
    console.log("Improving description...\n");
    runImproveDescription(skill);
  } else {
    console.log(`\nMax iterations reached. Best accuracy: ${Math.max(...history.map((h) => h.accuracy))}%`);
  }
}

// Save history
const historyPath = path.join(skillDir, "evals", "loop-history.json");
fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
console.log(`\nLoop history saved to ${historyPath}`);

// Final summary
const best = history.reduce((a, b) => (a.accuracy > b.accuracy ? a : b));
console.log(`\nBest result: iteration ${best.iteration} with ${best.accuracy}% accuracy`);
console.log(`Description: "${best.description.substring(0, 100)}..."`);

process.exit(best.passed ? 0 : 1);
