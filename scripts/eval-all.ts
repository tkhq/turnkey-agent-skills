/**
 * Run trigger evaluations for all skills.
 * Discovers skills automatically, runs eval-triggers.ts for each, and prints a summary.
 *
 * Usage:
 *   npx tsx scripts/eval-all.ts
 *   npx tsx scripts/eval-all.ts --threshold 90 --concurrency 4
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function findSkillDirs(baseDir: string): string[] {
  if (!fs.existsSync(baseDir)) return [];
  return fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => {
      const dir = path.join(baseDir, name);
      return (
        fs.existsSync(path.join(dir, "SKILL.md")) &&
        fs.existsSync(path.join(dir, "evals", "triggers.json"))
      );
    });
}

function parseArgs(): { threshold: number; concurrency: number } {
  const args = process.argv.slice(2);
  let threshold = 90;
  let concurrency = 1;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--threshold" && args[i + 1]) {
      threshold = parseFloat(args[++i]);
    } else if (args[i] === "--concurrency" && args[i + 1]) {
      concurrency = parseInt(args[++i], 10);
    }
  }

  return { threshold, concurrency };
}

interface SkillResult {
  skill: string;
  accuracy: number;
  passed: boolean;
  error?: string;
}

function main() {
  const { threshold, concurrency } = parseArgs();
  const skills = findSkillDirs("skills");

  if (skills.length === 0) {
    console.error("No skills found with evals/triggers.json");
    process.exit(1);
  }

  console.log(`Running trigger evals for ${skills.length} skills`);
  console.log(`Threshold: ${threshold}%, Concurrency: ${concurrency}`);
  console.log("");

  const results: SkillResult[] = [];

  for (const skill of skills) {
    console.log(`--- ${skill} ---`);
    try {
      execSync(
        `npx tsx scripts/eval-triggers.ts --skill ${skill} --threshold ${threshold} --concurrency ${concurrency}`,
        { stdio: "inherit", timeout: 600000 }
      );

      const resultsPath = path.join("skills", skill, "evals", "trigger-results.json");
      const data = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
      results.push({ skill, accuracy: data.summary.accuracy, passed: true });
    } catch (err: any) {
      // Non-zero exit means threshold not met
      const resultsPath = path.join("skills", skill, "evals", "trigger-results.json");
      if (fs.existsSync(resultsPath)) {
        const data = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
        results.push({ skill, accuracy: data.summary.accuracy, passed: false });
      } else {
        results.push({ skill, accuracy: 0, passed: false, error: "eval failed" });
      }
    }
    console.log("");
  }

  // Summary table
  console.log("=== Summary ===");
  console.log("");
  console.log("| Skill | Accuracy | Status |");
  console.log("|-------|----------|--------|");
  for (const r of results) {
    const status = r.error ? "ERROR" : r.passed ? "PASS" : "FAIL";
    console.log(`| ${r.skill} | ${r.accuracy.toFixed(1)}% | ${status} |`);
  }
  console.log("");

  const failCount = results.filter((r) => !r.passed).length;
  if (failCount > 0) {
    console.log(`${failCount}/${results.length} skills failed the ${threshold}% threshold`);
    process.exit(1);
  }

  console.log(`All ${results.length} skills passed the ${threshold}% threshold`);
  process.exit(0);
}

main();
