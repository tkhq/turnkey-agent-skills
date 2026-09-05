/** Offline CLI credential boundary: opt in with TK_CLI_BINARY=/absolute/path/to/tk. */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { signWithApiKey } from "@turnkey/api-key-stamper";

const binary = process.env.TK_CLI_BINARY;
const directory = binary ? mkdtempSync(join(tmpdir(), "tk-skill-key-test-")) : undefined;
afterAll(() => { if (directory) rmSync(directory, { recursive: true, force: true }); });

// Legacy inline derivation no longer exists: crypto is owned by the CLI.
// An absent binary is an explicit skipped integration check, not success evidence.
describe.skipIf(!binary)("CLI key generation", () => {
  it("writes a private valid credential and exposes only public metadata", async () => {
    const outputPath = join(directory!, "key.json");
    const stdout = execFileSync(binary!, ["--message-format", "json", "api-key", "generate", "--output", outputPath], { encoding: "utf8" });
    const stored = JSON.parse(readFileSync(outputPath, "utf8"));
    const record = JSON.parse(stdout.trim().split("\n").at(-1)!);
    expect(stored.public_key).toMatch(/^0[23][0-9a-f]{64}$/);
    expect(stored.private_key).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.curve).toBe("p256");
    expect(record.schemaVersion).toBe(1);
    expect(record.data.publicKey).toBe(stored.public_key);
    expect(stdout).not.toContain(stored.private_key);
    if (process.platform !== "win32") expect(statSync(outputPath).mode & 0o777).toBe(0o600);
    const signature = await signWithApiKey({ content: "offline fixture", publicKey: stored.public_key, privateKey: stored.private_key });
    expect(signature).toMatch(/^[0-9a-f]+$/);
    const previous = readFileSync(outputPath);
    const second = spawnSync(binary!, ["api-key", "generate", "--output", outputPath], { encoding: "utf8" });
    expect(second.status).not.toBe(0);
    expect(readFileSync(outputPath)).toEqual(previous);
  });
});
