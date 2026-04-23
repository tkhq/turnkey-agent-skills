/**
 * Layer 3b — Reference file type-checking
 *
 * Reference markdown files are structured as one or more H2 sections. A
 * typical shape is:
 *
 *   ## Setup              ← imports @turnkey/*, instantiates a client
 *   ## Do X with the SDK  ← uses `client`, no imports of its own
 *   ## Do Y with the SDK  ← uses `client`, no imports of its own
 *
 * The earlier version of this suite only type-checked blocks that imported
 * from `@turnkey/` directly, which meant the "Do X / Do Y" blocks — the
 * ones most likely to break on an SDK bump — were never semantically
 * verified. This file replaces that with a per-section compilation unit:
 *
 *   1. Parse each reference file into H2 sections.
 *   2. For each section with TypeScript blocks:
 *      a. If the section itself imports @turnkey and instantiates Turnkey,
 *         compile its blocks together (it is a self-contained setup).
 *      b. Otherwise, find the nearest earlier self-contained section in
 *         the same file and prepend its blocks as setup.
 *   3. Build one compilation unit per section:
 *         <hoisted, deduped imports>
 *         async function __check__() {
 *           // setup block
 *           { ...setup body... }
 *           // section block 1
 *           { ...block body... }
 *           ...
 *         }
 *         void __check__;
 *      Wrapping each block in `{ ... }` prevents cross-block `const`
 *      collisions (e.g., two snippets both declaring `const hash = ...`)
 *      while leaving setup variables visible through the async function's
 *      scope.
 *
 * This catches SDK breakage in the actual operation snippets, not just in
 * client instantiation. Continuation blocks that still contain a syntax
 * error are caught by `code-blocks.test.ts`.
 *
 * NOTE: Only reference files are tested here — SKILL.md code blocks are
 * intentionally partial and won't pass semantic type-checking.
 */

import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";
import { checkCompiles } from "./grader.js";
import { findReferenceFiles, relativePath, SKILLS_ROOT } from "./helpers.js";

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

interface CodeBlock {
  code: string;
  /** 1-based index within the containing file, for readable test names. */
  index: number;
  /** First non-empty line, truncated, for test names. */
  preview: string;
}

interface Section {
  heading: string;
  blocks: CodeBlock[];
  /** True if any block imports @turnkey/ AND instantiates `new Turnkey(`. */
  isSelfContainedSetup: boolean;
  /**
   * True if the section is marked with `<!-- compile-skip -->` (an HTML
   * comment anywhere in the section body). These sections are written as
   * deltas on top of earlier continuation state that the compile harness
   * can't reconstruct automatically; they are still syntax-checked by
   * `code-blocks.test.ts`.
   */
  skipCompile: boolean;
}

/**
 * Matches `<!-- compile-skip -->` or `<!-- compile-skip: any rationale -->`.
 * Authors should always include a rationale so skips don't accumulate
 * silently.
 */
const COMPILE_SKIP_MARKER = /<!--\s*compile-skip\b[^>]*-->/;

const TURNKEY_IMPORT = /\bimport\b[^;]*["']@turnkey\//;
const TURNKEY_INSTANTIATION = /\bnew\s+Turnkey\s*\(/;

function extractSections(markdown: string): Section[] {
  const sections: Section[] = [];
  let current: Section = {
    heading: "(prelude)",
    blocks: [],
    isSelfContainedSetup: false,
    skipCompile: false,
  };

  const lines = markdown.split("\n");
  let inFence = false;
  let fenceLang = "";
  let fenceBuf: string[] = [];
  let blockIndex = 1;

  const addBlock = (code: string) => {
    const firstLine =
      code
        .split("\n")
        .find((l) => l.trim().length > 0)
        ?.trim()
        .slice(0, 60) ?? "(empty)";
    const block: CodeBlock = {
      code,
      index: blockIndex++,
      preview: firstLine,
    };
    current.blocks.push(block);
    if (TURNKEY_IMPORT.test(code) && TURNKEY_INSTANTIATION.test(code)) {
      current.isSelfContainedSetup = true;
    }
  };

  for (const line of lines) {
    if (inFence) {
      if (/^```\s*$/.test(line)) {
        inFence = false;
        if (fenceLang === "typescript" || fenceLang === "ts") {
          addBlock(fenceBuf.join("\n"));
        }
        fenceBuf = [];
        fenceLang = "";
      } else {
        fenceBuf.push(line);
      }
      continue;
    }

    const fenceOpen = /^```(\w*)\s*$/.exec(line);
    if (fenceOpen) {
      inFence = true;
      fenceLang = fenceOpen[1];
      fenceBuf = [];
      continue;
    }

    const h2 = /^##\s+(.+?)\s*$/.exec(line);
    if (h2) {
      sections.push(current);
      current = {
        heading: h2[1],
        blocks: [],
        isSelfContainedSetup: false,
        skipCompile: false,
      };
      continue;
    }

    if (COMPILE_SKIP_MARKER.test(line)) {
      current.skipCompile = true;
    }
  }
  sections.push(current);

  return sections;
}

// ---------------------------------------------------------------------------
// Compilation unit assembly
// ---------------------------------------------------------------------------

/**
 * Split a TypeScript snippet into (import statements, remainder).
 * Handles both single-line and multi-line import forms.
 *
 * Dynamic `import(...)` expressions are left in the body (they aren't
 * top-level declarations, and reference files don't currently use them).
 */
function splitImports(code: string): {
  imports: string[];
  body: string;
} {
  const imports: string[] = [];
  const bodyLines: string[] = [];
  const lines = code.split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*import\s/.test(line) && !/\bimport\s*\(/.test(line)) {
      const buf: string[] = [line];
      while (!buf[buf.length - 1].includes(";") && i + 1 < lines.length) {
        i++;
        buf.push(lines[i]);
      }
      imports.push(buf.join("\n"));
      i++;
      continue;
    }
    bodyLines.push(line);
    i++;
  }

  return { imports, body: bodyLines.join("\n") };
}

interface ParsedImport {
  defaultName?: string;
  namespaceName?: string;
  /** Named bindings, stored with their optional alias: `{name, alias}`. */
  named: Array<{ name: string; alias?: string }>;
  /** True if the whole import is type-only (`import type { ... }`). */
  typeOnly: boolean;
  module: string;
}

/**
 * Parse a top-level ES import declaration. Handles the forms we use in
 * reference files:
 *   import X from "mod";
 *   import * as ns from "mod";
 *   import { a, b as c } from "mod";
 *   import X, { a } from "mod";
 *   import "mod";
 *   import type { T } from "mod";
 *
 * Returns `null` for anything else — those imports are kept verbatim.
 */
function parseImport(stmt: string): ParsedImport | null {
  // Normalize whitespace and strip trailing semicolons/newlines.
  const clean = stmt.replace(/\s+/g, " ").trim().replace(/;$/, "");

  const typeOnly = /^import\s+type\s/.test(clean);
  const body = typeOnly ? clean.replace(/^import\s+type\s/, "") : clean.replace(/^import\s/, "");

  // Side-effect import: `import "mod"`
  const sideEffect = /^["']([^"']+)["']$/.exec(body);
  if (sideEffect) {
    return { named: [], typeOnly, module: sideEffect[1] };
  }

  const fromMatch = /^(.+?)\s+from\s+["']([^"']+)["']$/.exec(body);
  if (!fromMatch) return null;

  const clause = fromMatch[1].trim();
  const module = fromMatch[2];

  const parsed: ParsedImport = { named: [], typeOnly, module };

  // Split clause by top-level comma, respecting { ... }.
  let depth = 0;
  let buf = "";
  const parts: string[] = [];
  for (const ch of clause) {
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    if (ch === "," && depth === 0) {
      parts.push(buf.trim());
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) parts.push(buf.trim());

  for (const part of parts) {
    if (part.startsWith("* as ")) {
      parsed.namespaceName = part.slice("* as ".length).trim();
    } else if (part.startsWith("{") && part.endsWith("}")) {
      const inner = part.slice(1, -1);
      for (const raw of inner.split(",")) {
        const s = raw.trim();
        if (!s) continue;
        const asMatch = /^(\S+)\s+as\s+(\S+)$/.exec(s);
        if (asMatch) {
          parsed.named.push({ name: asMatch[1], alias: asMatch[2] });
        } else {
          parsed.named.push({ name: s });
        }
      }
    } else {
      parsed.defaultName = part;
    }
  }

  return parsed;
}

/**
 * Merge a list of raw import statements into the minimum set of
 * unambiguous imports. Multiple `import { ... } from "M"` statements become
 * one; default/namespace imports are preserved. Statements we can't parse
 * are passed through verbatim, deduped by textual equality.
 *
 * This lets continuation snippets each show their own `import { parseEther }`
 * for readability without causing `Duplicate identifier` errors when we
 * hoist everything to module scope.
 */
function mergeImports(rawStatements: string[]): string[] {
  const byModule = new Map<string, ParsedImport>();
  const passthrough = new Set<string>();

  for (const raw of rawStatements) {
    const parsed = parseImport(raw);
    if (!parsed) {
      passthrough.add(raw.trim());
      continue;
    }
    // Keep value and type imports separate to preserve semantics.
    const key = `${parsed.typeOnly ? "type:" : "value:"}${parsed.module}`;
    const existing = byModule.get(key);
    if (!existing) {
      byModule.set(key, {
        defaultName: parsed.defaultName,
        namespaceName: parsed.namespaceName,
        named: [...parsed.named],
        typeOnly: parsed.typeOnly,
        module: parsed.module,
      });
      continue;
    }

    if (parsed.defaultName && !existing.defaultName) {
      existing.defaultName = parsed.defaultName;
    }
    if (parsed.namespaceName && !existing.namespaceName) {
      existing.namespaceName = parsed.namespaceName;
    }
    // Dedupe named bindings by (name, alias) pair.
    for (const entry of parsed.named) {
      const already = existing.named.find(
        (e) => e.name === entry.name && e.alias === entry.alias,
      );
      if (!already) existing.named.push(entry);
    }
  }

  const emitted: string[] = [];
  for (const imp of byModule.values()) {
    const parts: string[] = [];
    if (imp.defaultName) parts.push(imp.defaultName);
    if (imp.namespaceName) parts.push(`* as ${imp.namespaceName}`);
    if (imp.named.length > 0) {
      const names = imp.named
        .map((n) => (n.alias ? `${n.name} as ${n.alias}` : n.name))
        .join(", ");
      parts.push(`{ ${names} }`);
    }
    const prefix = imp.typeOnly ? "import type " : "import ";
    if (parts.length === 0) {
      emitted.push(`import "${imp.module}";`);
    } else {
      emitted.push(`${prefix}${parts.join(", ")} from "${imp.module}";`);
    }
  }
  emitted.push(...passthrough);
  return emitted;
}

function indent(code: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return code
    .split("\n")
    .map((l) => (l.length > 0 ? pad + l : l))
    .join("\n");
}

interface CompilationUnit {
  source: string;
  /** Block indices included, for error messages. */
  blockIndices: number[];
}

/**
 * Build a compilation unit that renders `setupBlocks` inline (shared scope,
 * so continuation blocks can reference their declarations) and each
 * continuation block in its own `{ ... }` scope (so redeclarations like
 * `const hash = ...` in sibling snippets don't collide).
 */
function buildUnit(
  setupBlocks: CodeBlock[],
  continuationBlocks: CodeBlock[],
): CompilationUnit {
  const rawImports: string[] = [];
  const setupBodies: string[] = [];
  const continuationBodies: { label: string; code: string }[] = [];

  for (const block of setupBlocks) {
    const split = splitImports(block.code);
    for (const imp of split.imports) rawImports.push(imp);
    setupBodies.push(split.body);
  }
  for (const block of continuationBlocks) {
    const split = splitImports(block.code);
    for (const imp of split.imports) rawImports.push(imp);
    continuationBodies.push({ label: `block ${block.index}`, code: split.body });
  }

  const out: string[] = [];
  for (const imp of mergeImports(rawImports)) out.push(imp);
  out.push("");
  out.push("async function __check__(): Promise<void> {");
  for (const body of setupBodies) {
    out.push(indent(body, 2));
  }
  for (const cb of continuationBodies) {
    out.push(`  // ${cb.label}`);
    out.push("  {");
    out.push(indent(cb.code, 4));
    out.push("  }");
  }
  out.push("}");
  out.push("void __check__;");

  return {
    source: out.join("\n"),
    blockIndices: [...setupBlocks, ...continuationBlocks].map((b) => b.index),
  };
}

// ---------------------------------------------------------------------------
// Test generation
// ---------------------------------------------------------------------------

interface SectionTest {
  file: string;
  heading: string;
  unit: CompilationUnit | null;
  /** Label used in the test name: self-contained, inherited setup, or skipped. */
  kind: "self-contained" | "inherited" | "skipped";
  setupFrom?: string;
  skipReason?: string;
}

/**
 * Within a self-contained section, "setup" is the prefix of blocks from the
 * start through the block that instantiates `new Turnkey(`. Anything after
 * that is a continuation snippet (Send X, Sign Y, etc.) that should be
 * scoped.
 */
function splitSectionBlocks(section: Section): {
  setup: CodeBlock[];
  continuation: CodeBlock[];
} {
  const turnkeyIdx = section.blocks.findIndex((b) =>
    TURNKEY_INSTANTIATION.test(b.code),
  );
  if (turnkeyIdx < 0) {
    // Defensive: caller should only invoke this for self-contained sections.
    return { setup: section.blocks, continuation: [] };
  }
  return {
    setup: section.blocks.slice(0, turnkeyIdx + 1),
    continuation: section.blocks.slice(turnkeyIdx + 1),
  };
}

function planTestsForFile(filePath: string): SectionTest[] {
  const content = readFileSync(filePath, "utf-8");
  const sections = extractSections(content);
  const tests: SectionTest[] = [];
  let lastSetup: { heading: string; blocks: CodeBlock[] } | null = null;

  for (const section of sections) {
    if (section.blocks.length === 0) continue;

    if (section.skipCompile) {
      tests.push({
        file: filePath,
        heading: section.heading,
        unit: null,
        kind: "skipped",
        skipReason: "marked <!-- compile-skip -->",
      });
      continue;
    }

    if (section.isSelfContainedSetup) {
      const { setup, continuation } = splitSectionBlocks(section);
      tests.push({
        file: filePath,
        heading: section.heading,
        unit: buildUnit(setup, continuation),
        kind: "self-contained",
      });
      lastSetup = { heading: section.heading, blocks: setup };
      continue;
    }

    if (lastSetup) {
      tests.push({
        file: filePath,
        heading: section.heading,
        unit: buildUnit(lastSetup.blocks, section.blocks),
        kind: "inherited",
        setupFrom: lastSetup.heading,
      });
    }
    // If there is no prior setup, we can't meaningfully type-check this
    // section — its identifiers are undefined. Syntax-only coverage in
    // code-blocks.test.ts still protects these.
  }

  return tests;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const referenceFiles = findReferenceFiles(SKILLS_ROOT);

describe("reference file discovery", () => {
  it("finds reference files to scan", () => {
    expect(referenceFiles.length).toBeGreaterThan(0);
  });
});

let compiledCount = 0;
let skippedCount = 0;

for (const filePath of referenceFiles) {
  const sectionTests = planTestsForFile(filePath);
  if (sectionTests.length === 0) continue;

  const name = relativePath(filePath);

  describe(`[compiles] ${name}`, () => {
    for (const t of sectionTests) {
      if (t.kind === "skipped") {
        skippedCount++;
        it.skip(
          `section "${t.heading}" skipped (${t.skipReason})`,
          () => {},
        );
        continue;
      }

      if (!t.unit) continue;
      compiledCount++;
      const suffix =
        t.kind === "self-contained"
          ? "self-contained"
          : `inherits setup from "${t.setupFrom}"`;
      const blockList = t.unit.blockIndices.join(",");
      const unit = t.unit;
      it(`section "${t.heading}" compiles (${suffix}, blocks ${blockList})`, () => {
        const result = checkCompiles(unit.source);
        expect(result.passed, result.passed ? "" : result.message).toBe(true);
      });
    }
  });
}

describe("reference compile coverage", () => {
  it("type-checks at least one section", () => {
    expect(
      compiledCount,
      "No sections are being type-checked — reference compile suite is vacuous",
    ).toBeGreaterThan(0);
  });

  // Guardrail so the suite can't silently drift toward skipping everything.
  // Threshold is intentionally loose (1 in 3) to tolerate the handful of
  // reference sections that are written as deltas on earlier continuation
  // state and can't be auto-linked without fragile heuristics. Tighten if
  // and when the compile harness gains cross-section chaining.
  it("keeps skipped sections below 33% of total", () => {
    const total = compiledCount + skippedCount;
    const ratio = total === 0 ? 0 : skippedCount / total;
    expect(
      ratio,
      `Too many sections are marked <!-- compile-skip -->: ${skippedCount} of ${total}. Restructure references or improve the compile harness.`,
    ).toBeLessThan(0.33);
  });
});
