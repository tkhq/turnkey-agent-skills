/**
 * Generates HTML reports from skill evaluation results.
 *
 * Usage:
 *   npx tsx skills/creating-skills/scripts/generate-report.ts --skill creating-wallets
 *
 * Adapted from Anthropic's skill-creator generate_report.py (Apache 2.0).
 */

import fs from "fs";
import path from "path";

function parseArgs(): { skill: string; output: string } {
  const args = process.argv.slice(2);
  let skill = "";
  let output = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--skill" && args[i + 1]) {
      skill = args[++i];
    } else if (args[i] === "--output" && args[i + 1]) {
      output = args[++i];
    }
  }

  if (!skill) {
    console.error("Usage: generate-report.ts --skill <name> [--output path.html]");
    process.exit(1);
  }

  if (!output) {
    output = path.join("skills", skill, "evals", "report.html");
  }

  return { skill, output };
}

function loadJson(filePath: string): unknown | null {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// Main
const { skill, output } = parseArgs();
const evalsDir = path.join("skills", skill, "evals");

const triggerResults = loadJson(path.join(evalsDir, "trigger-results.json")) as {
  skill: string;
  timestamp: string;
  results: Array<{ query: string; expected: boolean; triggered: boolean; pass: boolean }>;
  summary: { total: number; passed: number; accuracy: number; triggerAccuracy: number; falsePositiveRate: number };
} | null;

const loopHistory = loadJson(path.join(evalsDir, "loop-history.json")) as Array<{
  iteration: number;
  description: string;
  accuracy: number;
  triggerAccuracy: number;
  falsePositiveRate: number;
  passed: boolean;
}> | null;

const evals = loadJson(path.join(evalsDir, "evals.json")) as Array<{
  skills: string[];
  query: string;
  expected_behavior: string[];
}> | null;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Eval Report: ${skill}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; }
  h1 { border-bottom: 2px solid #e5e5e5; padding-bottom: 12px; }
  h2 { margin-top: 32px; color: #333; }
  .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin: 20px 0; }
  .card { background: #f8f9fa; border-radius: 8px; padding: 16px; text-align: center; }
  .card .value { font-size: 2em; font-weight: bold; }
  .card .label { color: #666; font-size: 0.9em; margin-top: 4px; }
  .pass { color: #22863a; }
  .fail { color: #cb2431; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
  th { background: #f8f9fa; font-weight: 600; }
  .icon { font-size: 1.2em; }
  .description-box { background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 8px 0; font-size: 0.9em; word-break: break-word; }
  .iteration { margin: 16px 0; padding: 16px; border: 1px solid #e5e5e5; border-radius: 8px; }
  .timestamp { color: #666; font-size: 0.85em; }
</style>
</head>
<body>
<h1>Eval Report: ${skill}</h1>
<p class="timestamp">Generated: ${new Date().toISOString()}</p>

${
  triggerResults
    ? `
<h2>Trigger Evaluation</h2>
<div class="summary">
  <div class="card"><div class="value ${triggerResults.summary.accuracy === 100 ? "pass" : "fail"}">${triggerResults.summary.accuracy}%</div><div class="label">Overall Accuracy</div></div>
  <div class="card"><div class="value">${triggerResults.summary.triggerAccuracy}%</div><div class="label">Trigger Rate</div></div>
  <div class="card"><div class="value">${triggerResults.summary.falsePositiveRate}%</div><div class="label">False Positive Rate</div></div>
  <div class="card"><div class="value">${triggerResults.summary.passed}/${triggerResults.summary.total}</div><div class="label">Tests Passed</div></div>
</div>

<table>
  <tr><th>Status</th><th>Type</th><th>Query</th></tr>
  ${triggerResults.results
    .map(
      (r) =>
        `<tr><td class="icon">${r.pass ? '<span class="pass">PASS</span>' : '<span class="fail">FAIL</span>'}</td><td>${r.expected ? "Should trigger" : "Should NOT trigger"}</td><td>${r.query}</td></tr>`
    )
    .join("\n  ")}
</table>
`
    : "<p>No trigger results found. Run eval-triggers.ts first.</p>"
}

${
  loopHistory && loopHistory.length > 0
    ? `
<h2>Improvement History</h2>
${loopHistory
  .map(
    (h) => `
<div class="iteration">
  <strong>Iteration ${h.iteration}</strong> - ${h.passed ? '<span class="pass">PASSED</span>' : '<span class="fail">FAILED</span>'} (${h.accuracy}%)
  <div class="description-box">${h.description}</div>
</div>`
  )
  .join("")}
`
    : ""
}

${
  evals
    ? `
<h2>Functional Evals (${evals.length} defined)</h2>
<table>
  <tr><th>#</th><th>Query</th><th>Expected Behaviors</th></tr>
  ${evals
    .map(
      (e, i) =>
        `<tr><td>${i + 1}</td><td>${e.query}</td><td><ul>${e.expected_behavior.map((b) => `<li>${b}</li>`).join("")}</ul></td></tr>`
    )
    .join("\n  ")}
</table>
`
    : ""
}

</body>
</html>`;

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html);
console.log(`Report generated: ${output}`);
