/**
 * Layer 5 — Key derivation regression
 *
 * Compiles and executes the canonical `generateApiKeyPair` helper from the
 * root SKILL.md to assert the runtime output is exactly what the Turnkey
 * stamper accepts: a 33-byte SEC1-compressed P-256 public key (66 hex chars,
 * `02` or `03` prefix) and a 32-byte private scalar (64 hex chars). Then
 * round-trips the produced key pair through `@turnkey/api-key-stamper` —
 * which internally calls the strict `convertTurnkeyApiKeyToJwk` that
 * rejects non-33-byte public keys — to bind the invariant to the actual
 * production code path.
 *
 * Also performs a static equivalence check between the canonical helper and
 * the inline script in `provisioning-agent/SKILL.md` Step 2b, so the two
 * derivations cannot drift out of sync.
 *
 * The provisioning script is NOT executed; it has side effects (git
 * lookup, file writes, chmod) that are out of scope for this test. The
 * five derivation statements (`xHex`, `yBuf`, `prefix`, `publicKeyHex`,
 * `privateKeyHex`) are compared as strings.
 */

import { readFileSync } from "fs";
import path from "path";
import { describe, it, expect, beforeAll } from "vitest";
import * as ts from "typescript";
import { createRequire } from "module";
import { signWithApiKey, ApiKeyStamper } from "@turnkey/api-key-stamper";
import {
  ROOT_SKILL_FILE,
  SKILLS_ROOT,
  extractTypeScriptBlocks,
} from "./helpers.js";

const PROVISIONING_SKILL = path.join(
  SKILLS_ROOT,
  "provisioning-agent",
  "SKILL.md",
);

type GenerateApiKeyPair = () => {
  publicKeyHex: string;
  privateKeyHex: string;
};

function findBlockContaining(filePath: string, needle: string): string {
  const content = readFileSync(filePath, "utf-8");
  const blocks = extractTypeScriptBlocks(content);
  const block = blocks.find((b) => b.code.includes(needle));
  if (!block) {
    throw new Error(`No TypeScript block in ${filePath} contains ${needle}`);
  }
  return block.code;
}

function loadGenerateApiKeyPair(): GenerateApiKeyPair {
  const code = findBlockContaining(
    ROOT_SKILL_FILE,
    "export function generateApiKeyPair",
  );
  const transpiled = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;

  const moduleExports: Record<string, unknown> = {};
  const requireFn = createRequire(import.meta.url);
  const wrapper = new Function(
    "exports",
    "require",
    "module",
    transpiled,
  );
  wrapper(moduleExports, requireFn, { exports: moduleExports });

  const fn = moduleExports.generateApiKeyPair;
  if (typeof fn !== "function") {
    throw new Error(
      "generateApiKeyPair was not exported from the transpiled SKILL.md snippet",
    );
  }
  return fn as GenerateApiKeyPair;
}

/**
 * Extract the five derivation statements (in order) from a snippet that
 * defines them. Returns a normalized array (whitespace-trimmed) so a diff
 * surfaces semantic drift, not formatting churn.
 */
function extractDerivationStatements(code: string): string[] {
  const lines = code.split("\n").map((l) => l.trim());
  const wanted = [
    "const xHex =",
    "const yBuf =",
    "const prefix =",
    "const publicKeyHex =",
    "const privateKeyHex =",
  ];
  return wanted.map((needle) => {
    const line = lines.find((l) => l.startsWith(needle));
    if (!line) {
      throw new Error(
        `Could not find derivation line starting with "${needle}" in:\n${code}`,
      );
    }
    return line;
  });
}

describe("key-derivation regression", () => {
  let generateApiKeyPair: GenerateApiKeyPair;
  const samples: Array<{ publicKeyHex: string; privateKeyHex: string }> = [];

  beforeAll(() => {
    generateApiKeyPair = loadGenerateApiKeyPair();
    for (let i = 0; i < 200; i++) {
      samples.push(generateApiKeyPair());
    }
  });

  it("publicKeyHex is exactly 33 bytes (66 hex chars) prefixed with 02 or 03", () => {
    for (const { publicKeyHex } of samples) {
      expect(publicKeyHex).toMatch(/^0[23][0-9a-f]{64}$/);
    }
  });

  it("privateKeyHex is exactly 32 bytes (64 hex chars)", () => {
    for (const { privateKeyHex } of samples) {
      expect(privateKeyHex).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("both 02 and 03 prefixes appear across 200 samples", () => {
    const prefixes = new Set(
      samples.map((s) => s.publicKeyHex.slice(0, 2)),
    );
    expect(
      prefixes.has("02"),
      "expected at least one 02-prefixed key in 200 samples (regression: prefix may be hardcoded)",
    ).toBe(true);
    expect(
      prefixes.has("03"),
      "expected at least one 03-prefixed key in 200 samples (regression: prefix may be hardcoded)",
    ).toBe(true);
  });

  it("production-path round-trip via signWithApiKey", async () => {
    const { publicKeyHex, privateKeyHex } = generateApiKeyPair();
    const sig = await signWithApiKey({
      content: "test",
      publicKey: publicKeyHex,
      privateKey: privateKeyHex,
    });
    expect(sig).toMatch(/^[0-9a-f]+$/);
    expect(sig.length).toBeGreaterThan(0);
  });

  it("production-path round-trip via ApiKeyStamper.stamp", async () => {
    const { publicKeyHex, privateKeyHex } = generateApiKeyPair();
    const stamper = new ApiKeyStamper({
      apiPublicKey: publicKeyHex,
      apiPrivateKey: privateKeyHex,
    });
    const stamp = await stamper.stamp("test");
    expect(stamp.stampHeaderName).toBe("X-Stamp");
    expect(stamp.stampHeaderValue.length).toBeGreaterThan(0);
  });

  it("uncompressed (65-byte) keys are rejected by the stamper", async () => {
    const { privateKeyHex } = generateApiKeyPair();
    const uncompressed =
      "04" + "a".repeat(64) + "b".repeat(64);
    await expect(
      signWithApiKey({
        content: "test",
        publicKey: uncompressed,
        privateKey: privateKeyHex,
      }),
    ).rejects.toThrow();
  });

  it("provisioning-agent Step 2b derivation is byte-identical to the canonical helper", () => {
    const canonical = findBlockContaining(
      ROOT_SKILL_FILE,
      "export function generateApiKeyPair",
    );
    const provisioning = findBlockContaining(
      PROVISIONING_SKILL,
      "const xHex = Buffer.from(pubJwk.x",
    );

    expect(extractDerivationStatements(provisioning)).toEqual(
      extractDerivationStatements(canonical),
    );
  });
});
