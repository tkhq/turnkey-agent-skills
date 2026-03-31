/**
 * Trigger evaluation for Turnkey agent skills.
 * Tests whether a skill's description causes Claude to load it for the right queries.
 *
 * Uses the Anthropic API directly with prompt caching for cost efficiency.
 * Supports --batch mode for 50% cost reduction via the Message Batches API.
 *
 * Usage:
 *   npx tsx scripts/eval-triggers.ts --skill managing-wallets-api
 *   npx tsx scripts/eval-triggers.ts --skill managing-wallets-api --batch
 *   npx tsx scripts/eval-triggers.ts --skill managing-wallets-api --threshold 85 --concurrency 8
 *   npx tsx scripts/eval-triggers.ts --skill managing-wallets-api --model claude-sonnet-4-20250514
 *   npx tsx scripts/eval-triggers.ts --skill managing-wallets-api --save-baseline
 *   npx tsx scripts/eval-triggers.ts --skill managing-wallets-api --check-baseline
 *
 * Adapted from Anthropic's skill-creator run_eval.py (Apache 2.0).
 */

import Anthropic from "@anthropic-ai/sdk";
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

interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  apiCalls: number;
}

interface BaselineEntry {
  skill: string;
  query: string;
  expected: boolean;
  triggered: boolean;
  pass: boolean;
}

interface Baseline {
  generatedAt: string;
  model: string;
  entries: BaselineEntry[];
}

const BASELINE_PATH = "evals-baseline.json";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

// ---------------------------------------------------------------------------
// Concurrency helper
// ---------------------------------------------------------------------------

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker())
  );
  return results;
}

// ---------------------------------------------------------------------------
// Skill discovery
// ---------------------------------------------------------------------------

function loadTriggers(skillName: string): TriggerTestCase {
  const triggersPath = path.join("skills", skillName, "evals", "triggers.json");
  if (!fs.existsSync(triggersPath)) {
    console.error(`No triggers.json found at ${triggersPath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(triggersPath, "utf-8"));
}

function loadAllSkillDescriptions(): Map<string, string> {
  const skillsDir = "skills";
  const descriptions = new Map<string, string>();
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillMdPath = path.join(skillsDir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) continue;
    const content = fs.readFileSync(skillMdPath, "utf-8");
    const parsed = matter(content);
    if (parsed.data.description) {
      descriptions.set(entry.name, parsed.data.description);
    }
  }
  return descriptions;
}

// ---------------------------------------------------------------------------
// Prompt and tool construction
// ---------------------------------------------------------------------------

function buildSystemPrompt(allSkills: Map<string, string>): string {
  const skillList = Array.from(allSkills.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, desc]) => `- **${name}**: ${desc}`)
    .join("\n");

  return `You are an AI assistant with access to a Skill tool that loads specialized knowledge for specific domains.
The Skill tool lets you load detailed documentation, API references, and step-by-step guides for a particular topic.
When the user's query clearly matches one of the available skills listed below, invoke the Skill tool with that skill's name.
If no skill is a clear match for the user's query, respond with a brief text message instead.
Do not invoke the Skill tool for general questions that do not fall within any skill's described scope.

Available skills:
${skillList}

When you decide to use a skill, call the Skill tool with the exact skill name from the list above.
Only invoke the Skill tool when the query is clearly within a skill's described scope.
For queries that could match multiple skills, choose the most specific match.`;
}

const SKILL_TOOL: Anthropic.Tool = {
  name: "Skill",
  description: "Load a specialized skill for domain-specific knowledge. Use this when the user's query matches an available skill.",
  input_schema: {
    type: "object" as const,
    properties: {
      skill: { type: "string", description: "The skill name to invoke" },
      args: { type: "string", description: "Optional arguments for the skill" },
    },
    required: ["skill"],
  },
};

// ---------------------------------------------------------------------------
// Check response for skill trigger
// ---------------------------------------------------------------------------

function responseTriggeredSkill(
  content: Anthropic.ContentBlock[],
  skillName: string
): boolean {
  for (const block of content) {
    if (
      block.type === "tool_use" &&
      block.name === "Skill" &&
      typeof (block.input as Record<string, unknown>)?.skill === "string" &&
      ((block.input as Record<string, unknown>).skill as string).includes(skillName)
    ) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Realtime API-based trigger test
// ---------------------------------------------------------------------------

async function testTriggerAPI(
  client: Anthropic,
  query: string,
  skillName: string,
  systemPrompt: string,
  model: string,
  usage: UsageStats
): Promise<boolean> {
  const response = await client.messages.create({
    model,
    max_tokens: 100,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [SKILL_TOOL],
    messages: [{ role: "user", content: query }],
  });

  // Accumulate usage
  usage.apiCalls++;
  usage.inputTokens += response.usage.input_tokens;
  usage.outputTokens += response.usage.output_tokens;
  const usageAny = response.usage as unknown as Record<string, number>;
  const cacheCreation = usageAny.cache_creation_input_tokens ?? 0;
  const cacheRead = usageAny.cache_read_input_tokens ?? 0;
  usage.cacheCreationTokens += cacheCreation;
  usage.cacheReadTokens += cacheRead;

  return responseTriggeredSkill(response.content, skillName);
}

// ---------------------------------------------------------------------------
// Batch API-based trigger test (50% cost reduction)
// ---------------------------------------------------------------------------

interface QueryTask {
  query: string;
  expected: boolean;
}

async function runBatchEval(
  client: Anthropic,
  queryTasks: QueryTask[],
  skillName: string,
  systemPrompt: string,
  model: string
): Promise<{ results: EvalResult[]; usage: UsageStats }> {
  const usage: UsageStats = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    apiCalls: queryTasks.length,
  };

  // Build batch requests
  const requests = queryTasks.map((qt, i) => ({
    custom_id: `eval-${i}`,
    params: {
      model,
      max_tokens: 100,
      system: [
        {
          type: "text" as const,
          text: systemPrompt,
          cache_control: { type: "ephemeral" as const },
        },
      ],
      tools: [SKILL_TOOL],
      messages: [{ role: "user" as const, content: qt.query }],
    },
  }));

  console.log(`Submitting batch of ${requests.length} requests...`);
  const batch = await client.messages.batches.create({ requests });
  console.log(`Batch created: ${batch.id} (status: ${batch.processing_status})`);

  // Poll until complete
  let current = batch;
  const startTime = Date.now();
  while (current.processing_status !== "ended") {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const counts = current.request_counts;
    console.log(`  [${elapsed}s] ${current.processing_status} - succeeded: ${counts.succeeded}, processing: ${counts.processing}, errored: ${counts.errored}`);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    current = await client.messages.batches.retrieve(batch.id);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const counts = current.request_counts;
  console.log(`  [${elapsed}s] Complete - succeeded: ${counts.succeeded}, errored: ${counts.errored}`);

  // Collect results
  const resultMap = new Map<string, Anthropic.Messages.Batches.MessageBatchIndividualResponse>();
  const decoder = await client.messages.batches.results(batch.id);
  for await (const result of decoder) {
    resultMap.set(result.custom_id, result);
  }

  // Grade results
  const results: EvalResult[] = [];
  for (let i = 0; i < queryTasks.length; i++) {
    const qt = queryTasks[i];
    const batchResult = resultMap.get(`eval-${i}`);

    let triggered = false;
    if (batchResult && batchResult.result.type === "succeeded") {
      const message = batchResult.result.message;
      triggered = responseTriggeredSkill(message.content, skillName);

      // Accumulate usage
      usage.inputTokens += message.usage.input_tokens;
      usage.outputTokens += message.usage.output_tokens;
      const usageAny = message.usage as unknown as Record<string, number>;
      usage.cacheCreationTokens += usageAny.cache_creation_input_tokens ?? 0;
      usage.cacheReadTokens += usageAny.cache_read_input_tokens ?? 0;
    } else if (batchResult) {
      console.error(`  [batch-error] "${qt.query}": result type "${batchResult.result.type}"`);
    } else {
      console.error(`  [batch-error] "${qt.query}": missing from batch results`);
    }

    const pass = qt.expected ? triggered : !triggered;
    const label = qt.expected ? "should trigger" : "should NOT trigger";
    console.log(`${pass ? "PASS" : "FAIL"}  [${label}]${qt.expected ? "     " : " "}"${qt.query}"`);
    results.push({ query: qt.query, expected: qt.expected, triggered, pass });
  }

  return { results, usage };
}

// ---------------------------------------------------------------------------
// Baseline management
// ---------------------------------------------------------------------------

function saveBaseline(results: EvalResult[], skill: string, model: string): void {
  let baseline: Baseline;

  if (fs.existsSync(BASELINE_PATH)) {
    baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf-8"));
    baseline.entries = baseline.entries.filter((e) => e.skill !== skill);
  } else {
    baseline = { generatedAt: "", model, entries: [] };
  }

  baseline.generatedAt = new Date().toISOString();
  baseline.model = model;

  for (const r of results) {
    baseline.entries.push({
      skill,
      query: r.query,
      expected: r.expected,
      triggered: r.triggered,
      pass: r.pass,
    });
  }

  baseline.entries.sort((a, b) =>
    a.skill === b.skill ? a.query.localeCompare(b.query) : a.skill.localeCompare(b.skill)
  );

  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + "\n");
  console.log(`\nBaseline updated for ${skill} in ${BASELINE_PATH}`);
}

function checkBaseline(results: EvalResult[], skill: string, model: string): boolean {
  if (!fs.existsSync(BASELINE_PATH)) {
    console.error(`\nNo baseline found at ${BASELINE_PATH}. Run with --save-baseline first.`);
    return true;
  }

  const baseline: Baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf-8"));

  if (baseline.model !== model) {
    console.warn(`\nWarning: baseline was generated with ${baseline.model}, current model is ${model}. Results may differ.`);
  }

  const baselineEntries = baseline.entries.filter((e) => e.skill === skill);
  if (baselineEntries.length === 0) {
    console.log(`\nNo baseline entries for ${skill}. Skipping comparison.`);
    return true;
  }

  let regressions = 0;
  let improvements = 0;

  for (const entry of baselineEntries) {
    const result = results.find((r) => r.query === entry.query);
    if (!result) continue;

    if (entry.pass && !result.pass) {
      console.log(`  [REGRESS] "${entry.query}" was passing, now failing`);
      regressions++;
    } else if (!entry.pass && result.pass) {
      console.log(`  [IMPROVED] "${entry.query}" was failing, now passing`);
      improvements++;
    }
  }

  console.log(`\nBaseline comparison for ${skill}: ${regressions} regression(s), ${improvements} improvement(s)`);
  return regressions === 0;
}

// ---------------------------------------------------------------------------
// Usage summary
// ---------------------------------------------------------------------------

function printUsageSummary(usage: UsageStats, batchMode: boolean): void {
  const totalTokens = usage.inputTokens + usage.outputTokens + usage.cacheCreationTokens + usage.cacheReadTokens;
  const discount = batchMode ? 0.5 : 1.0;
  const costInput = (usage.inputTokens / 1_000_000) * 3.0 * discount;
  const costOutput = (usage.outputTokens / 1_000_000) * 15.0 * discount;
  const costCacheCreate = (usage.cacheCreationTokens / 1_000_000) * 3.75 * discount;
  const costCacheRead = (usage.cacheReadTokens / 1_000_000) * 0.30 * discount;
  const totalCost = costInput + costOutput + costCacheCreate + costCacheRead;

  console.log(`\nToken usage${batchMode ? " (batch: 50% discount)" : ""}:`);
  console.log(`  API calls:       ${usage.apiCalls}`);
  console.log(`  Input tokens:    ${usage.inputTokens.toLocaleString()}`);
  console.log(`  Output tokens:   ${usage.outputTokens.toLocaleString()}`);
  console.log(`  Cache created:   ${usage.cacheCreationTokens.toLocaleString()}`);
  console.log(`  Cache read:      ${usage.cacheReadTokens.toLocaleString()}`);
  console.log(`  Total tokens:    ${totalTokens.toLocaleString()}`);
  console.log(`  Estimated cost:  $${totalCost.toFixed(4)} (Sonnet pricing${batchMode ? ", batch discount" : ""})`);
}

function computeCost(usage: UsageStats, batchMode: boolean): { totalTokens: number; totalCost: number } {
  const totalTokens = usage.inputTokens + usage.outputTokens + usage.cacheCreationTokens + usage.cacheReadTokens;
  const discount = batchMode ? 0.5 : 1.0;
  const totalCost =
    (usage.inputTokens / 1_000_000) * 3.0 * discount +
    (usage.outputTokens / 1_000_000) * 15.0 * discount +
    (usage.cacheCreationTokens / 1_000_000) * 3.75 * discount +
    (usage.cacheReadTokens / 1_000_000) * 0.30 * discount;
  return { totalTokens, totalCost };
}

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

interface CliOpts {
  skill: string;
  runs: number;
  threshold: number;
  concurrency: number;
  model: string;
  batch: boolean;
  saveBaselineFlag: boolean;
  checkBaselineFlag: boolean;
}

function parseArgs(): CliOpts {
  const args = process.argv.slice(2);
  let skill = "";
  let runs = 1;
  let threshold = 100;
  let concurrency = 1;
  let model = process.env.EVAL_MODEL || DEFAULT_MODEL;
  let batch = false;
  let saveBaselineFlag = false;
  let checkBaselineFlag = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--skill":
        skill = args[++i];
        break;
      case "--runs":
        runs = parseInt(args[++i], 10);
        break;
      case "--threshold":
        threshold = parseFloat(args[++i]);
        break;
      case "--concurrency":
        concurrency = parseInt(args[++i], 10);
        break;
      case "--model":
        model = args[++i];
        break;
      case "--batch":
        batch = true;
        break;
      case "--save-baseline":
        saveBaselineFlag = true;
        break;
      case "--check-baseline":
        checkBaselineFlag = true;
        break;
      default:
        break;
    }
  }

  if (!skill) {
    console.error("Usage: eval-triggers.ts --skill <skill-name> [--runs N] [--threshold N] [--concurrency N] [--model M] [--batch] [--save-baseline] [--check-baseline]");
    process.exit(1);
  }

  if (batch && runs > 1) {
    console.error("--batch mode does not support --runs > 1 (each query is sent once)");
    process.exit(1);
  }

  return { skill, runs, threshold, concurrency, model, batch, saveBaselineFlag, checkBaselineFlag };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set.");
    console.error("Set it in your environment or add it to .env:");
    console.error("  export ANTHROPIC_API_KEY=sk-ant-...");
    process.exit(1);
  }

  const { skill, runs, threshold, concurrency, model, batch, saveBaselineFlag, checkBaselineFlag } = parseArgs();

  const skillDir = path.join("skills", skill);
  if (!fs.existsSync(path.join(skillDir, "SKILL.md"))) {
    console.error(`Skill not found: ${skillDir}`);
    process.exit(1);
  }

  const triggers = loadTriggers(skill);
  const allDescriptions = loadAllSkillDescriptions();
  const systemPrompt = buildSystemPrompt(allDescriptions);

  const client = new Anthropic({ maxRetries: 3 });

  console.log(`Evaluating triggers for: ${skill}`);
  console.log(`Model: ${model}`);
  console.log(`Mode: ${batch ? "batch (50% discount)" : "realtime"}`);
  console.log(`Skills loaded: ${allDescriptions.size}`);
  if (!batch) console.log(`Runs per query: ${runs}`);
  console.log(`Threshold: ${threshold}%`);
  if (!batch) console.log(`Concurrency: ${concurrency}`);
  console.log(`Should trigger: ${triggers.should_trigger.length} queries`);
  console.log(`Should not trigger: ${triggers.should_not_trigger.length} queries`);
  console.log("");

  const queryTasks: QueryTask[] = [
    ...triggers.should_trigger.map((q) => ({ query: q, expected: true })),
    ...triggers.should_not_trigger.map((q) => ({ query: q, expected: false })),
  ];

  let results: EvalResult[];
  let usage: UsageStats;

  if (batch) {
    // Batch mode: submit all at once, poll for results
    const batchResult = await runBatchEval(client, queryTasks, skill, systemPrompt, model);
    results = batchResult.results;
    usage = batchResult.usage;
  } else {
    // Realtime mode: concurrent API calls with prompt caching
    usage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      apiCalls: 0,
    };

    const tasks = queryTasks.map((qt) => async (): Promise<EvalResult> => {
      let triggerCount = 0;
      for (let r = 0; r < runs; r++) {
        try {
          const triggered = await testTriggerAPI(client, qt.query, skill, systemPrompt, model, usage);
          if (triggered) triggerCount++;
        } catch (err: unknown) {
          if (err instanceof Anthropic.AuthenticationError) {
            console.error(`\nAuthentication failed. Check your ANTHROPIC_API_KEY.`);
            process.exit(1);
          }
          if (err instanceof Anthropic.RateLimitError) {
            console.error(`  [rate-limit] "${qt.query}" - retries exhausted, treating as not triggered`);
          } else if (err instanceof Anthropic.APIError) {
            console.error(`  [api-error] "${qt.query}": ${(err as Error).message}`);
          } else {
            console.error(`  [error] "${qt.query}": ${(err as Error).message}`);
          }
        }
      }
      const triggered = triggerCount > runs / 2; // Majority vote
      const pass = qt.expected ? triggered : !triggered;
      const label = qt.expected ? "should trigger" : "should NOT trigger";
      console.log(`${pass ? "PASS" : "FAIL"}  [${label}]${qt.expected ? "     " : " "}"${qt.query}" (${triggerCount}/${runs})`);
      return { query: qt.query, expected: qt.expected, triggered, pass };
    });

    results = await runWithConcurrency(tasks, concurrency);
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
  console.log(`Threshold: ${threshold}%`);

  const accuracyNum = parseFloat(accuracy);
  const passed_threshold = accuracyNum >= threshold;
  console.log(`Status: ${passed_threshold ? "PASS" : "FAIL"}`);

  printUsageSummary(usage, batch);
  const { totalTokens, totalCost } = computeCost(usage, batch);

  // Write results to file
  const outputPath = path.join(skillDir, "evals", "trigger-results.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        skill,
        timestamp: new Date().toISOString(),
        model,
        mode: batch ? "batch" : "realtime",
        runs,
        threshold,
        results,
        summary: {
          total,
          passed,
          accuracy: accuracyNum,
          triggerAccuracy: parseFloat(triggerAccuracy as string) || 0,
          falsePositiveRate: parseFloat(falsePositiveRate as string) || 0,
        },
        usage: {
          apiCalls: usage.apiCalls,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cacheCreationTokens: usage.cacheCreationTokens,
          cacheReadTokens: usage.cacheReadTokens,
          totalTokens,
          estimatedCost: parseFloat(totalCost.toFixed(4)),
        },
      },
      null,
      2
    )
  );
  console.log(`\nResults saved to ${outputPath}`);

  // Baseline operations
  if (saveBaselineFlag) {
    saveBaseline(results, skill, model);
  }

  let baselineOk = true;
  if (checkBaselineFlag) {
    baselineOk = checkBaseline(results, skill, model);
  }

  process.exit(passed_threshold && baselineOk ? 0 : 1);
}

main();
