/**
 * Layer 4 — API request body schema validation
 *
 * Walks every SKILL.md / reference markdown file looking for the documented
 * convention:
 *
 *     ```
 *     POST /public/v1/{submit,query}/<endpoint>
 *     ```
 *
 *     ```json
 *     { ... documented request body ... }
 *     ```
 *
 * For each (endpoint, body) pair it looks up the intent type from
 * `tests/fixtures/endpoint-to-intent.json`, then validates the body against
 * the JSON Schema in `tests/fixtures/api-schemas.json`. This catches drift
 * like a missing required field (`oauthProviders`) or a stale activity-type
 * version that earlier syntax/type-checking layers cannot see.
 *
 * Body convention (matches the in-repo prose):
 *   - For most submit/query endpoints, the documented body is already the
 *     `parameters` payload (no envelope) — validated directly against the
 *     mapped intent schema.
 *   - A few examples (e.g. `getting-started/references/first-wallet-walkthrough.md`)
 *     show the full activity envelope `{ type, timestampMs, organizationId,
 *     parameters }`. Detected by the presence of both an `ACTIVITY_TYPE_*`
 *     `type` field and a `parameters` field; in that case `parameters` is
 *     validated against the intent schema and `type` is cross-checked
 *     against the mapped `activityType`.
 *
 * Skip mechanism:
 *   Place `<!-- schema-skip: <rationale> -->` between the endpoint header
 *   and the JSON body to opt that block out of validation. Rationale is
 *   mandatory; an empty rationale is rejected by the parser. A guardrail
 *   keeps total skips below 25% of validated blocks so coverage cannot
 *   silently erode.
 */

import { readFileSync } from "fs";
import { join } from "path";
import AjvModule, { type ValidateFunction, type Ajv as AjvType } from "ajv";
import { describe, it, expect } from "vitest";

import {
  findReferenceFiles,
  findSkillFiles,
  PROJECT_ROOT,
  relativePath,
  ROOT_SKILL_FILE,
  SKILLS_ROOT,
} from "./helpers.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface EndpointInfo {
  intent: string;
  activityType?: string;
}

const FIXTURES_DIR = join(PROJECT_ROOT, "tests", "fixtures");

const apiSchemas = JSON.parse(
  readFileSync(join(FIXTURES_DIR, "api-schemas.json"), "utf-8"),
) as { definitions: Record<string, unknown> };

const endpointMappingRaw = JSON.parse(
  readFileSync(join(FIXTURES_DIR, "endpoint-to-intent.json"), "utf-8"),
) as Record<string, EndpointInfo | string>;

const endpointMapping: Record<string, EndpointInfo> = {};
for (const [url, value] of Object.entries(endpointMappingRaw)) {
  if (url.startsWith("_")) continue;
  endpointMapping[url] = value as EndpointInfo;
}

// ---------------------------------------------------------------------------
// Markdown parsing
// ---------------------------------------------------------------------------

const ENDPOINT_PATTERN =
  /^POST\s+(\/public\/v1\/(?:submit|query)\/[a-z0-9_]+)\s*$/;
const SCHEMA_SKIP_PATTERN = /<!--\s*schema-skip:\s*([^>]*?)\s*-->/;

interface ExtractedBlock {
  endpoint: string;
  json: string;
  /** 1-based line number of the opening ```json fence, for error messages. */
  startLine: number;
  /** Rationale captured from a preceding `<!-- schema-skip: ... -->` comment. */
  skipped?: string;
}

/**
 * Walk a markdown document line-by-line, pairing every
 * `POST /public/v1/{submit,query}/<endpoint>` line that appears inside a
 * fenced code block with the next ```json fenced block in the same file.
 *
 * The two blocks may be separated by prose, headings, or other fenced
 * blocks. Anything that follows the endpoint header but is not the next
 * `json`-tagged fence is ignored (typical patterns: a `**Response:**`
 * heading, an Ajv-friendly note, etc.).
 */
export function extractEndpointJsonBlocks(markdown: string): ExtractedBlock[] {
  const lines = markdown.split("\n");
  const out: ExtractedBlock[] = [];

  let inFence = false;
  let fenceLang = "";
  let fenceBuf: string[] = [];
  let fenceStartLine = 0;

  let pendingEndpoint: { url: string; line: number } | null = null;
  let pendingSkip: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (inFence) {
      if (/^```\s*$/.test(line)) {
        // Closing fence
        if (pendingEndpoint && fenceLang === "json") {
          out.push({
            endpoint: pendingEndpoint.url,
            json: fenceBuf.join("\n"),
            startLine: fenceStartLine,
            skipped: pendingSkip ?? undefined,
          });
          pendingEndpoint = null;
          pendingSkip = null;
        } else if (!pendingEndpoint) {
          // Look for an endpoint marker inside any fenced block (the docs
          // wrap the endpoint header in its own ``` fence).
          for (const inner of fenceBuf) {
            const m = ENDPOINT_PATTERN.exec(inner.trim());
            if (m) {
              pendingEndpoint = { url: m[1], line: fenceStartLine };
              pendingSkip = null;
              break;
            }
          }
        }
        inFence = false;
        fenceLang = "";
        fenceBuf = [];
        continue;
      }
      fenceBuf.push(line);
      continue;
    }

    const fenceOpen = /^```(\w*)\s*$/.exec(line);
    if (fenceOpen) {
      inFence = true;
      fenceLang = fenceOpen[1];
      fenceBuf = [];
      fenceStartLine = lineNo;
      continue;
    }

    if (pendingEndpoint) {
      const skipMatch = SCHEMA_SKIP_PATTERN.exec(line);
      if (skipMatch && skipMatch[1].trim().length > 0) {
        pendingSkip = skipMatch[1].trim();
      }
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

// Ajv ships as an ESM default export under CJS-interop wrapping; the actual
// constructor lives at `.default` when loaded through `tsx`/Node ESM but is
// the module itself when bundlers strip the wrapper. Handle both.
const AjvCtor = ((AjvModule as unknown as { default?: typeof AjvModule })
  .default ?? AjvModule) as unknown as new (
  opts: Record<string, unknown>,
) => AjvType;

const ajv = new AjvCtor({
  strict: false,
  allErrors: true,
  // Ignore any `format` keywords that may appear on string fields — our
  // docs are full of placeholders like `<ORG_ID>` that wouldn't pass real
  // format checks (uuid, date-time, etc.). The test exists to catch
  // missing/extraneous fields and wrong types, not literal value drift.
  formats: {},
});
ajv.addSchema(apiSchemas, "turnkey-api");

const validatorCache = new Map<string, ValidateFunction>();

function getValidator(intent: string): ValidateFunction {
  const cached = validatorCache.get(intent);
  if (cached) return cached;
  const compiled = ajv.compile({
    $ref: `turnkey-api#/definitions/${intent}`,
  });
  validatorCache.set(intent, compiled);
  return compiled;
}

interface ValidationResult {
  passed: boolean;
  message: string;
}

function looksLikeEnvelope(body: unknown): body is {
  type: string;
  parameters: unknown;
} {
  if (!body || typeof body !== "object") return false;
  const obj = body as Record<string, unknown>;
  return (
    typeof obj.type === "string" &&
    obj.type.startsWith("ACTIVITY_TYPE_") &&
    "parameters" in obj
  );
}

function formatErrors(errors: ValidateFunction["errors"]): string {
  if (!errors || errors.length === 0) return "(no errors reported)";
  return errors
    .map((err) => {
      const path = err.instancePath || "(root)";
      const value =
        "data" in err && err.data !== undefined
          ? ` (value: ${JSON.stringify(err.data).slice(0, 80)})`
          : "";
      return `  - ${path} ${err.message}${value}`;
    })
    .join("\n");
}

export function validateEntry(
  entry: ExtractedBlock,
  fileLabel: string,
): ValidationResult {
  const info = endpointMapping[entry.endpoint];
  if (!info) {
    return {
      passed: false,
      message:
        `Endpoint ${entry.endpoint} (${fileLabel}:${entry.startLine}) is not in ` +
        `tests/fixtures/endpoint-to-intent.json. If the endpoint is real, ` +
        "regenerate the fixture via `npm run refresh-api-schemas`. " +
        "If the endpoint is intentionally undocumented in the SDK, mark " +
        "the JSON block with `<!-- schema-skip: <rationale> -->`.",
    };
  }

  let body: unknown;
  try {
    body = JSON.parse(entry.json);
  } catch (err) {
    const preview = entry.json.split("\n").slice(0, 6).join("\n");
    return {
      passed: false,
      message:
        `JSON.parse failed for ${entry.endpoint} at ` +
        `${fileLabel}:${entry.startLine}: ${(err as Error).message}\n` +
        `First lines:\n${preview}`,
    };
  }

  let payload: unknown = body;
  let envelopeNote = "";
  if (looksLikeEnvelope(body)) {
    if (info.activityType && body.type !== info.activityType) {
      return {
        passed: false,
        message:
          `Envelope at ${fileLabel}:${entry.startLine} has ` +
          `\`type: ${JSON.stringify(body.type)}\` but ` +
          `${entry.endpoint} expects \`${info.activityType}\`.`,
      };
    }
    payload = body.parameters;
    envelopeNote =
      ` (envelope detected — validating \`parameters\` against ${info.intent})`;
  }

  const validate = getValidator(info.intent);
  const ok = validate(payload);
  if (ok) {
    return { passed: true, message: "" };
  }

  return {
    passed: false,
    message:
      `${entry.endpoint} body at ${fileLabel}:${entry.startLine} ` +
      `does not match schema ${info.intent}${envelopeNote}:\n` +
      formatErrors(validate.errors),
  };
}

// ---------------------------------------------------------------------------
// Test generation
// ---------------------------------------------------------------------------

const skillFiles = findSkillFiles(SKILLS_ROOT);
const referenceFiles = findReferenceFiles(SKILLS_ROOT);
const allFiles = [ROOT_SKILL_FILE, ...skillFiles, ...referenceFiles];

let validatedCount = 0;
let skippedCount = 0;

describe("api-schema fixture sanity", () => {
  it("loaded the schemas fixture", () => {
    expect(
      apiSchemas.definitions && Object.keys(apiSchemas.definitions).length,
      "tests/fixtures/api-schemas.json is empty — run `npm run refresh-api-schemas`",
    ).toBeGreaterThan(0);
  });

  it("loaded the endpoint mapping fixture", () => {
    expect(
      Object.keys(endpointMapping).length,
      "tests/fixtures/endpoint-to-intent.json is empty — run `npm run refresh-api-schemas`",
    ).toBeGreaterThan(0);
  });
});

for (const filePath of allFiles) {
  const content = readFileSync(filePath, "utf-8");
  const entries = extractEndpointJsonBlocks(content);
  if (entries.length === 0) continue;

  const fileLabel = relativePath(filePath);

  describe(`[schema] ${fileLabel}`, () => {
    for (const entry of entries) {
      const label = `${entry.endpoint} (block at line ${entry.startLine})`;
      if (entry.skipped) {
        skippedCount++;
        it.skip(`${label} skipped: ${entry.skipped}`, () => {});
        continue;
      }
      validatedCount++;
      it(`${label} matches schema`, () => {
        const result = validateEntry(entry, fileLabel);
        expect(result.passed, result.message).toBe(true);
      });
    }
  });
}

describe("api-schema coverage", () => {
  it("validates at least one JSON body", () => {
    expect(
      validatedCount,
      "No JSON bodies validated — the suite is vacuous. Either the parser regressed " +
        "or every documented body is marked `<!-- schema-skip -->`.",
    ).toBeGreaterThan(0);
  });

  it("keeps skipped blocks below 25% of total", () => {
    const total = validatedCount + skippedCount;
    const ratio = total === 0 ? 0 : skippedCount / total;
    expect(
      ratio,
      `Too many JSON bodies are marked <!-- schema-skip -->: ${skippedCount} of ${total}. ` +
        "Either rewrite the offending blocks to satisfy the schema or improve the validator.",
    ).toBeLessThan(0.25);
  });
});
