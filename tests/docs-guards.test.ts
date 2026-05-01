/**
 * Layer 6 — Docs guards
 *
 * Block-aware checks that catch the two regression patterns for the
 * compressed-public-key fix (and protect against future drift):
 *
 *   1. Markdown TS code blocks containing `"04" +` — the canonical bug
 *      pattern from the old `generateApiKeyPair` snippet.
 *   2. JSON / env / shell blocks (or eval-fixture string values) containing
 *      a hex value that begins with `04` and is followed by hex chars —
 *      i.e. the wrong prefix for a Turnkey API public key, which must be
 *      33-byte SEC1-compressed (`02` or `03` prefix).
 *
 * The guards intentionally:
 *   - Distinguish prose from fenced code/JSON/env blocks. Explanatory prose
 *     is allowed to mention the uncompressed `04` form (for contrast in
 *     the "Generating API key pairs" section, etc.) but no fixture/example
 *     value may use it.
 *   - Walk eval-fixture JSON structurally (recursive string-value visit)
 *     rather than regex-matching the raw file. This catches `04…` values
 *     embedded mid-sentence in prompt strings, which a quote-anchored
 *     regex would miss.
 *   - Apply a strict-before-permissive ordering inside string values: a
 *     fully-spelled 130-hex-char uncompressed key (`/\b04[0-9a-f]{124,}\b/i`)
 *     is unconditional and exempt from any "uncompressed nearby" carve-out.
 */

import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";
import {
  ROOT_SKILL_FILE,
  SKILLS_ROOT,
  findEvalsFiles,
  findReferenceFiles,
  findSkillFiles,
  relativePath,
} from "./helpers.js";

// ---------------------------------------------------------------------------
// Markdown block extraction
// ---------------------------------------------------------------------------

interface FencedBlock {
  /** Lowercased language tag from the opening fence (`typescript`, `json`, `env`, `bash`, etc.). Empty string if none. */
  lang: string;
  /** Raw block body, between the opening and closing fences. */
  body: string;
  /** 1-indexed line number where the block body starts (i.e. the line after the opening fence). */
  startLine: number;
}

function extractFencedBlocks(markdown: string): FencedBlock[] {
  const blocks: FencedBlock[] = [];
  const regex = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(markdown)) !== null) {
    const lang = (match[1] ?? "").toLowerCase();
    const body = match[2];
    const startLine =
      markdown.slice(0, match.index).split("\n").length + 1;
    blocks.push({ lang, body, startLine });
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Eval JSON walker
// ---------------------------------------------------------------------------

const FULL_LENGTH_UNCOMPRESSED_RE = /\b04[0-9a-f]{124,}\b/i;
const SHORT_HEX_RE = /\b04[0-9a-f]{2,}/i;

function checkEvalString(
  value: string,
  jsonPath: string,
): string | null {
  // Strict, unconditional length check — exempt from any allow-list.
  if (FULL_LENGTH_UNCOMPRESSED_RE.test(value)) { // nosemgrep: ajinabraham.njsscan.dos.regex_dos.regex_dos
    return `${jsonPath}: contains a fully-spelled 130-hex-char uncompressed P-256 key (no exception applies). Use a 33-byte compressed value (02/03 prefix) instead.`;
  }

  const shortMatch = SHORT_HEX_RE.exec(value);
  if (!shortMatch) return null;

  const beforeWindow = value
    .slice(Math.max(0, shortMatch.index - 32), shortMatch.index)
    .toLowerCase();
  if (beforeWindow.includes("uncompressed")) return null;
  if (/^(https?:\/\/|\/|\.\.?\/)/.test(value)) return null; // nosemgrep: ajinabraham.njsscan.dos.regex_dos.regex_dos

  return `${jsonPath}: contains "${value.slice(
    Math.max(0, shortMatch.index - 8),
    Math.min(value.length, shortMatch.index + 16),
  )}" — looks like an uncompressed P-256 key prefix (\`04\`). Turnkey requires 33-byte compressed keys (\`02\` or \`03\` prefix).`;
}

function walkEvalJson(node: unknown, jsonPath: string): string[] {
  const violations: string[] = [];
  if (typeof node === "string") {
    const v = checkEvalString(node, jsonPath);
    if (v) violations.push(v);
  } else if (Array.isArray(node)) {
    node.forEach((child, i) => {
      violations.push(...walkEvalJson(child, `${jsonPath}[${i}]`));
    });
  } else if (node && typeof node === "object") {
    for (const [key, child] of Object.entries(node)) {
      violations.push(
        ...walkEvalJson(child, `${jsonPath}.${key}`),
      );
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// Per-block checks
// ---------------------------------------------------------------------------

const TS_LANGS = new Set(["typescript", "ts"]);
const STRUCTURED_LANGS = new Set([
  "json",
  "env",
  "dotenv",
  "bash",
  "sh",
  "shell",
]);
const SIGNING_ALLOW_PATTERN =
  /\b(activity\.action\s*==\s*'SIGN'|ACTIVITY_TYPE_(?:SIGN|ETH_SEND|SOL_SEND)|(?:eth|solana|bitcoin|tron|tempo)\.tx\.|eth\.eip_7702_authorization\.)/;
const KEY_SCOPE_PATTERN =
  /\b(?:wallet\.id|wallet_account\.address|private_key\.id)\b/;

function isIntentionalAntiPattern(markdown: string, startLine: number): boolean {
  const lines = markdown.split("\n");
  for (let i = startLine - 2; i >= Math.max(0, startLine - 16); i--) {
    const line = lines[i] ?? "";
    if (/^##\s+Anti-patterns/i.test(line)) return true;
    if (/^##\s+/.test(line)) return false;
  }
  return false;
}

function walkPolicyObjects(
  node: unknown,
  visit: (obj: Record<string, unknown>) => void,
): void {
  if (Array.isArray(node)) {
    node.forEach((child) => walkPolicyObjects(child, visit));
    return;
  }
  if (!node || typeof node !== "object") return;

  const obj = node as Record<string, unknown>;
  const effect = obj.effect ?? obj.policyEffect;
  const condition = obj.condition ?? obj.policyCondition;
  if (effect === "EFFECT_ALLOW" && typeof condition === "string") {
    visit(obj);
  }
  for (const child of Object.values(obj)) {
    walkPolicyObjects(child, visit);
  }
}

function checkPolicyAllowKeyScope(markdown: string): string[] {
  const violations: string[] = [];
  for (const block of extractFencedBlocks(markdown)) {
    if (block.lang !== "json") continue;
    if (isIntentionalAntiPattern(markdown, block.startLine)) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(block.body);
    } catch {
      continue;
    }

    walkPolicyObjects(parsed, (policy) => {
      const condition = (policy.condition ?? policy.policyCondition) as string;
      if (!SIGNING_ALLOW_PATTERN.test(condition)) return;
      if (KEY_SCOPE_PATTERN.test(condition)) return;

      const label =
        typeof policy.policyName === "string"
          ? ` policy "${policy.policyName}"`
          : "";
      violations.push(
        `block at line ${block.startLine}${label}: signing EFFECT_ALLOW condition lacks wallet.id, wallet_account.address, or private_key.id scope: ${condition}`,
      );
    });
  }
  return violations;
}

function checkMarkdownFile(absPath: string): string[] {
  const content = readFileSync(absPath, "utf-8");
  const blocks = extractFencedBlocks(content);
  const violations: string[] = [];

  for (const block of blocks) {
    if (TS_LANGS.has(block.lang)) {
      if (block.body.includes('"04" +')) {
        violations.push(
          `block at line ${block.startLine}: contains \`"04" +\` — this is the legacy uncompressed-key derivation pattern. Use the SEC1-compressed form (02/03 prefix + X) from the root SKILL.md \`generateApiKeyPair\` helper.`,
        );
      }
      continue;
    }

    if (!STRUCTURED_LANGS.has(block.lang)) {
      // Prose blocks (or unknown languages) are allowed to mention `04` for
      // explanatory contrast.
      continue;
    }

    const lines = block.body.split("\n");
    lines.forEach((line, i) => {
      if (/"publicKey"\s*:\s*"04/.test(line)) { // nosemgrep: ajinabraham.njsscan.dos.regex_dos.regex_dos
        violations.push(
          `block at line ${block.startLine + i}: \`"publicKey": "04..."\` — Turnkey requires 33-byte compressed keys (\`02\` or \`03\` prefix).`,
        );
      }
      if (/^TURNKEY_API_PUBLIC_KEY=04/.test(line)) { // nosemgrep: ajinabraham.njsscan.dos.regex_dos.regex_dos
        violations.push(
          `block at line ${block.startLine + i}: \`TURNKEY_API_PUBLIC_KEY=04...\` — Turnkey requires 33-byte compressed keys (\`02\` or \`03\` prefix).`,
        );
      }
    });
  }

  violations.push(...checkPolicyAllowKeyScope(content));

  return violations;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const markdownFiles = [
  ROOT_SKILL_FILE,
  ...findSkillFiles(SKILLS_ROOT),
  ...findReferenceFiles(SKILLS_ROOT),
];
const evalFiles = findEvalsFiles(SKILLS_ROOT);

describe("docs guards: markdown examples stay within security invariants", () => {
  for (const filePath of markdownFiles) {
    it(`${relativePath(filePath)} satisfies code/JSON/env block guards`, () => {
      const violations = checkMarkdownFile(filePath);
      expect(
        violations,
        `Found docs guard violations:\n  - ${violations.join("\n  - ")}`,
      ).toEqual([]);
    });
  }

  for (const filePath of evalFiles) {
    it(`${relativePath(filePath)} eval fixtures contain no uncompressed-key values`, () => {
      const content = readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(content);
      const violations = walkEvalJson(parsed, "$");
      expect(
        violations,
        `Found uncompressed-key violations in eval fixtures:\n  - ${violations.join("\n  - ")}`,
      ).toEqual([]);
    });
  }
});
