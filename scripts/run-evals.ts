#!/usr/bin/env npx tsx
/**
 * Automated eval runner — discovers all evals, runs them through an LLM,
 * grades the output, and prints a summary.
 *
 * Usage:
 *   npx tsx scripts/run-evals.ts [options]
 *
 * Providers:
 *   --provider claude     Use Claude CLI in --print mode (default)
 *   --provider openai     Use OpenAI chat completions API (needs OPENAI_API_KEY)
 *   --provider custom     Use a custom command (requires --command)
 *
 * Options:
 *   --skill <name>       Run only evals for this skill (e.g., turnkey-ethereum-evm)
 *   --eval <id>          Run only this eval ID (requires --skill)
 *   --without-skill      Also run a baseline without skill context
 *   --model <model>      Model name (provider-specific, e.g. gpt-4o, claude-sonnet-4-20250514)
 *   --command <cmd>       Shell command for --provider custom (reads stdin, writes stdout)
 *   --concurrency <n>    Max parallel runs (default: 4)
 *   --dry-run            Print prompts without executing
 *   --verbose            Print full LLM responses
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname, resolve } from "path";
import { spawn } from "child_process";
import {
  findEvalsFiles,
  PROJECT_ROOT,
  SKILLS_ROOT,
} from "../tests/helpers.js";
import {
  runAssertions,
  describeAssertion,
  type Assertion,
  type AssertionResult,
  type Eval,
  type EvalsFile,
} from "../tests/grader.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProviderName = "claude" | "openai" | "custom";

interface ProviderResponse {
  response: string;
  error?: string;
}

/** A provider takes a prompt string and returns the LLM's text response. */
type Provider = (prompt: string) => Promise<ProviderResponse>;

interface TaskResult {
  skill: string;
  evalId: number;
  mode: "with_skill" | "without_skill";
  provider: string;
  prompt: string;
  rawResponse: string;
  extractedCode: string;
  assertions: AssertionResult[];
  error?: string;
}

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

interface CliOpts {
  provider: ProviderName;
  skill?: string;
  eval?: number;
  withoutSkill: boolean;
  model?: string;
  command?: string;
  concurrency: number;
  dryRun: boolean;
  verbose: boolean;
}

function parseArgs(): CliOpts {
  const args = process.argv.slice(2);
  const opts: CliOpts = {
    provider: "claude",
    withoutSkill: false,
    concurrency: 4,
    dryRun: false,
    verbose: false,
  };
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--provider":
        opts.provider = args[++i] as ProviderName;
        if (!["claude", "openai", "custom"].includes(opts.provider)) {
          console.error(
            `Unknown provider: ${opts.provider} (expected claude, openai, or custom)`,
          );
          process.exit(1);
        }
        break;
      case "--skill":
        opts.skill = args[++i];
        break;
      case "--eval":
        opts.eval = parseInt(args[++i], 10);
        break;
      case "--without-skill":
        opts.withoutSkill = true;
        break;
      case "--model":
        opts.model = args[++i];
        break;
      case "--command":
        opts.command = args[++i];
        break;
      case "--concurrency":
        opts.concurrency = parseInt(args[++i], 10);
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--verbose":
        opts.verbose = true;
        break;
      default:
        console.error(`Unknown flag: ${args[i]}`);
        process.exit(1);
    }
  }
  if (opts.eval !== undefined && !opts.skill) {
    console.error("--eval requires --skill");
    process.exit(1);
  }
  if (opts.provider === "custom" && !opts.command) {
    console.error("--provider custom requires --command");
    process.exit(1);
  }
  if (opts.provider === "openai" && !process.env.OPENAI_API_KEY) {
    console.error("--provider openai requires OPENAI_API_KEY env var");
    process.exit(1);
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Eval discovery
// ---------------------------------------------------------------------------

function discoverEvals(): { file: EvalsFile; evalsJsonPath: string }[] {
  const paths = findEvalsFiles(SKILLS_ROOT);
  return paths.map((p) => ({
    file: JSON.parse(readFileSync(p, "utf-8")) as EvalsFile,
    evalsJsonPath: p,
  }));
}

// ---------------------------------------------------------------------------
// Skill context builder
// ---------------------------------------------------------------------------

function buildSkillContext(evalsJsonPath: string, evalItem: Eval): string {
  const skillDir = dirname(dirname(evalsJsonPath)); // evals/evals.json -> skill dir
  const skillMdPath = join(skillDir, "SKILL.md");
  let context = "";

  if (existsSync(skillMdPath)) {
    context += `=== SKILL.md ===\n${readFileSync(skillMdPath, "utf-8")}\n\n`;
  }

  // Also include the root SKILL.md for cross-skill context
  const rootSkillPath = join(PROJECT_ROOT, "SKILL.md");
  if (existsSync(rootSkillPath)) {
    context += `=== ROOT SKILL.md ===\n${readFileSync(rootSkillPath, "utf-8")}\n\n`;
  }

  for (const filePath of evalItem.files) {
    const absPath = resolve(PROJECT_ROOT, filePath);
    if (existsSync(absPath)) {
      context += `=== REFERENCE: ${filePath} ===\n${readFileSync(absPath, "utf-8")}\n\n`;
    } else {
      context += `=== REFERENCE: ${filePath} === (file not found)\n\n`;
    }
  }

  return context;
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildWithSkillPrompt(
  skillContext: string,
  evalPrompt: string,
): string {
  return `Use the following skill documentation and reference files to write your code.

${skillContext}---

Task: ${evalPrompt}

Respond with ONLY a single TypeScript code block. No explanations.`;
}

function buildWithoutSkillPrompt(evalPrompt: string): string {
  return `Task: ${evalPrompt}

Respond with ONLY a single TypeScript code block. No explanations.`;
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

const EVAL_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

/** Spawn a child process, pipe prompt via stdin, return stdout. */
function spawnWithStdin(
  command: string,
  args: string[],
  prompt: string,
  env?: NodeJS.ProcessEnv,
): Promise<ProviderResponse> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env: env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
      shell: command.includes(" "), // use shell for custom commands
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ response: stdout, error: "Eval exceeded 3 minute timeout" });
    }, EVAL_TIMEOUT_MS);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve({
          response: stdout,
          error: `Exited with code ${code}: ${stderr.slice(0, 200)}`,
        });
      } else {
        resolve({ response: stdout });
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function createClaudeProvider(model?: string): Provider {
  return (prompt: string) => {
    const args = [
      "--print",
      "--output-format",
      "text",
      "--verbose",
      "--no-session-persistence",
    ];
    if (model) args.push("--model", model);

    // Strip CLAUDE_CODE env vars to avoid nested-session guard
    const env = { ...process.env };
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE;
    delete env.CLAUDE_CODE_ENTRY_POINT;

    // Prevent GPG/YubiKey PIN prompts — Claude CLI gathers git context on
    // startup which can trigger the GPG agent when commit signing is enabled.
    env.GIT_CONFIG_COUNT = "1";
    env.GIT_CONFIG_KEY_0 = "commit.gpgsign";
    env.GIT_CONFIG_VALUE_0 = "false";
    env.GIT_TERMINAL_PROMPT = "0";

    return spawnWithStdin("claude", args, prompt, env);
  };
}

function createOpenAIProvider(model?: string): Provider {
  const apiKey = process.env.OPENAI_API_KEY!;
  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const resolvedModel = model ?? "gpt-4o";

  return async (prompt: string): Promise<ProviderResponse> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), EVAL_TIMEOUT_MS);

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: resolvedModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text();
        return { response: "", error: `OpenAI API ${res.status}: ${body.slice(0, 200)}` };
      }

      const json = (await res.json()) as {
        choices: { message: { content: string } }[];
      };
      return { response: json.choices[0]?.message?.content ?? "" };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return { response: "", error: "Eval exceeded 3 minute timeout" };
      }
      return { response: "", error: String(err) };
    } finally {
      clearTimeout(timer);
    }
  };
}

function createCustomProvider(command: string): Provider {
  // Split on first space to separate command from default args,
  // but pass as shell command so user can use pipes, etc.
  return (prompt: string) =>
    spawnWithStdin("sh", ["-c", `${command}`], prompt);
}

function createProvider(opts: CliOpts): Provider {
  switch (opts.provider) {
    case "claude":
      return createClaudeProvider(opts.model);
    case "openai":
      return createOpenAIProvider(opts.model);
    case "custom":
      return createCustomProvider(opts.command!);
  }
}

function providerLabel(opts: CliOpts): string {
  const model = opts.model;
  switch (opts.provider) {
    case "claude":
      return model ? `claude (${model})` : "claude";
    case "openai":
      return `openai (${model ?? "gpt-4o"})`;
    case "custom":
      return `custom (${opts.command})`;
  }
}

// ---------------------------------------------------------------------------
// Code extraction
// ---------------------------------------------------------------------------

function extractCode(response: string): string {
  // Find all fenced code blocks
  const codeBlockRegex = /```(?:typescript|ts)?\s*\n([\s\S]*?)```/g;
  let largest = "";
  let match: RegExpExecArray | null;
  while ((match = codeBlockRegex.exec(response)) !== null) {
    if (match[1].length > largest.length) {
      largest = match[1];
    }
  }
  // If we found a code block, return it. Otherwise return raw response
  // (some evals like transaction-signing eval-3 expect prose, not code).
  return largest.trim() || response.trim();
}

// ---------------------------------------------------------------------------
// File output
// ---------------------------------------------------------------------------

function writeSolution(
  skillName: string,
  evalId: number,
  mode: "with_skill" | "without_skill",
  code: string,
): string {
  const parts = [PROJECT_ROOT, "evals-workspace", skillName, `eval-${evalId}`];
  if (mode === "without_skill") {
    parts.push("without_skill");
  }
  const dir = join(...parts);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, "solution.ts");
  writeFileSync(filePath, code, "utf-8");
  return filePath;
}

// ---------------------------------------------------------------------------
// Concurrency limiter
// ---------------------------------------------------------------------------

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = [];
  const executing = new Set<Promise<void>>();
  for (const [i, task] of tasks.entries()) {
    const p = task().then((r) => {
      results[i] = r;
    });
    const e = p.then(() => {
      executing.delete(e);
    });
    executing.add(e);
    if (executing.size >= limit) await Promise.race(executing);
  }
  await Promise.all(executing);
  return results;
}

// ---------------------------------------------------------------------------
// Single eval runner
// ---------------------------------------------------------------------------

async function runSingleEval(
  evalsJsonPath: string,
  skillName: string,
  evalItem: Eval,
  mode: "with_skill" | "without_skill",
  provider: Provider,
  opts: { dryRun: boolean; verbose: boolean; provider: ProviderName },
): Promise<TaskResult> {
  const prompt =
    mode === "with_skill"
      ? buildWithSkillPrompt(
          buildSkillContext(evalsJsonPath, evalItem),
          evalItem.prompt,
        )
      : buildWithoutSkillPrompt(evalItem.prompt);

  const label = `${skillName} / eval-${evalItem.id} (${mode})`;

  if (opts.dryRun) {
    console.log(`\n--- DRY RUN: ${label} ---`);
    console.log(`Prompt length: ${prompt.length} chars`);
    console.log(`Prompt preview:\n${prompt.slice(0, 300)}...\n`);
    return {
      skill: skillName,
      evalId: evalItem.id,
      mode,
      provider: opts.provider,
      prompt,
      rawResponse: "",
      extractedCode: "",
      assertions: [],
    };
  }

  console.log(`  Running: ${label}...`);

  const { response, error } = await provider(prompt);

  if (opts.verbose) {
    console.log(`\n--- Response: ${label} ---`);
    console.log(response);
  }

  if (error) {
    console.log(`  FAILED: ${label} — ${error}`);
    return {
      skill: skillName,
      evalId: evalItem.id,
      mode,
      provider: opts.provider,
      prompt,
      rawResponse: response,
      extractedCode: "",
      assertions: [],
      error,
    };
  }

  const code = extractCode(response);
  const solutionPath = writeSolution(skillName, evalItem.id, mode, code);

  const assertions = evalItem.assertions?.length
    ? runAssertions(code, evalItem.assertions, solutionPath)
    : [];

  const passed = assertions.filter((a) => a.passed).length;
  const total = assertions.length;
  const status = total > 0 ? `${passed}/${total} passed` : "no assertions";
  console.log(`  Done: ${label} — ${status}`);

  return {
    skill: skillName,
    evalId: evalItem.id,
    mode,
    provider: opts.provider,
    prompt,
    rawResponse: response,
    extractedCode: code,
    assertions,
  };
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function printSummary(results: TaskResult[]): void {
  console.log("\n=== Eval Results ===\n");

  for (const r of results) {
    if (r.error) {
      console.log(`${r.skill} / eval-${r.evalId} (${r.mode})`);
      console.log(`  [ERROR] ${r.error}\n`);
      continue;
    }
    if (r.assertions.length === 0) continue;

    console.log(`${r.skill} / eval-${r.evalId} (${r.mode})`);
    for (const a of r.assertions) {
      const icon = a.passed ? "PASS" : "FAIL";
      console.log(`  [${icon}] ${a.message}`);
    }
    const passed = r.assertions.filter((a) => a.passed).length;
    console.log(`  ${passed}/${r.assertions.length} passed\n`);
  }

  // Aggregate summary
  const byMode = (mode: "with_skill" | "without_skill") => {
    const modeResults = results.filter(
      (r) => r.mode === mode && !r.error && r.assertions.length > 0,
    );
    const totalAssertions = modeResults.reduce(
      (sum, r) => sum + r.assertions.length,
      0,
    );
    const passedAssertions = modeResults.reduce(
      (sum, r) => sum + r.assertions.filter((a) => a.passed).length,
      0,
    );
    const evalsFullyPassing = modeResults.filter((r) =>
      r.assertions.every((a) => a.passed),
    ).length;
    return {
      total: modeResults.length,
      passing: evalsFullyPassing,
      totalAssertions,
      passedAssertions,
    };
  };

  console.log("=== Summary ===\n");

  const withSkill = byMode("with_skill");
  console.log(
    `With skill:    ${withSkill.passing}/${withSkill.total} evals passing (${withSkill.passedAssertions}/${withSkill.totalAssertions} assertions)`,
  );

  if (results.some((r) => r.mode === "without_skill")) {
    const withoutSkill = byMode("without_skill");
    console.log(
      `Without skill: ${withoutSkill.passing}/${withoutSkill.total} evals passing (${withoutSkill.passedAssertions}/${withoutSkill.totalAssertions} assertions)`,
    );
  }

  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    console.log(`Errors:        ${errors.length} eval(s) failed to run`);
  }
}

function writeReport(results: TaskResult[]): void {
  const reportDir = join(PROJECT_ROOT, "evals-workspace");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, "report.json");

  const report = results.map((r) => ({
    skill: r.skill,
    evalId: r.evalId,
    mode: r.mode,
    provider: r.provider,
    error: r.error ?? null,
    assertions: r.assertions.map((a) => ({
      description: describeAssertion(a.assertion),
      passed: a.passed,
      message: a.message,
    })),
    passedCount: r.assertions.filter((a) => a.passed).length,
    totalCount: r.assertions.length,
  }));

  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\nReport written to ${reportPath}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const opts = parseArgs();
  const provider = createProvider(opts);

  // 1. Discover evals
  const allEvals = discoverEvals();
  console.log(`Provider: ${providerLabel(opts)}`);
  console.log(
    `Found ${allEvals.length} eval file(s) with ${allEvals.reduce((s, e) => s + e.file.evals.length, 0)} total evals`,
  );

  // 2. Apply filters
  const filtered: {
    evalsJsonPath: string;
    skillName: string;
    evalItem: Eval;
  }[] = [];

  for (const { file, evalsJsonPath } of allEvals) {
    if (opts.skill && file.skill_name !== opts.skill) continue;

    for (const evalItem of file.evals) {
      if (opts.eval !== undefined && evalItem.id !== opts.eval) continue;
      filtered.push({
        evalsJsonPath,
        skillName: file.skill_name,
        evalItem,
      });
    }
  }

  if (filtered.length === 0) {
    console.log("No evals matched the filters.");
    process.exit(0);
  }

  console.log(`Running ${filtered.length} eval(s)...`);

  // 3. Build task list
  const tasks: (() => Promise<TaskResult>)[] = [];

  for (const { evalsJsonPath, skillName, evalItem } of filtered) {
    tasks.push(() =>
      runSingleEval(
        evalsJsonPath, skillName, evalItem, "with_skill", provider, opts,
      ),
    );

    if (opts.withoutSkill) {
      tasks.push(() =>
        runSingleEval(
          evalsJsonPath, skillName, evalItem, "without_skill", provider, opts,
        ),
      );
    }
  }

  // 4. Run with concurrency
  const results = await runWithConcurrency(tasks, opts.concurrency);

  // 5. Print summary and write report
  if (!opts.dryRun) {
    printSummary(results);
    writeReport(results);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
