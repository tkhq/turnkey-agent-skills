/** Parse documented shell commands with the real CLI, isolated from credentials. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const binary = process.env.TK_CLI_BINARY;
if (process.env.CI && !binary) throw new Error("CI requires TK_CLI_BINARY; binary-backed checks must not be skipped");

function markdown(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const name = join(path, entry.name);
    return entry.isDirectory() ? markdown(name) : name.endsWith(".md") ? [name] : [];
  });
}

const commands = ["SKILL.md", ...markdown("skills"), ...markdown("references")].flatMap((file) => {
  const blocks = readFileSync(file, "utf8").matchAll(/```(?:sh|bash)\s*\n([\s\S]*?)```/g);
  return [...blocks].flatMap((block) => block[1].split("\n").filter((line) => /^tk\s/.test(line)).map((line) => ({ file, line })));
});

// No deliberate counter-examples currently appear in executable shell blocks.
// Add exact file+line exclusions here, with a reason, if one is introduced.
describe.skipIf(!binary)("documented tk shell syntax", () => {
  it.each(commands)("$file: $line", ({ line }) => {
    const home = mkdtempSync(join(tmpdir(), "tk-doc-syntax-"));
    const env: NodeJS.ProcessEnv = { ...process.env, HOME: home };
    for (const key of Object.keys(env)) {
      if (key.startsWith("TK_") || key.startsWith("TURNKEY_")) delete env[key];
    }
    const uuid = "11111111-1111-4111-8111-111111111111";
    const tokens = line.match(/"[^"]*"|'[^']*'|\S+/g)!.slice(1);
    const redirect = tokens.findIndex((token) => /^[>|]/.test(token));
    const args = (redirect < 0 ? tokens : tokens.slice(0, redirect)).map((token) =>
      token.replace(/^["']|["']$/g, "").replace(/\$\{?[A-Z_]+\}?/g, uuid));
    try {
      const result = spawnSync(binary!, ["--non-interactive", ...(args.includes("--message-format") ? [] : ["--message-format", "json"]), ...args], {
        env, cwd: home, encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "pipe"],
      });
      expect(result.error).toBeUndefined();
      expect(result.status, result.stdout + result.stderr).not.toBe(2);
      expect(result.status).not.toBeNull();
      expect(result.stdout).not.toContain('"code":"usage_error"');
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});
