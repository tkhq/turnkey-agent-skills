/** Execute the documented tk contract against loopback fixtures, never a live org. */
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const binary = process.env.TK_CLI_BINARY;
const exec = promisify(execFile);
const org = "11111111-1111-4111-8111-111111111111";

describe.skipIf(!binary)("tk repository command contract", () => {
  it("logs in by name and preserves success, pending, and error recovery records", async () => {
    const directory = mkdtempSync(join(tmpdir(), "tk-contract-"));
    const requests: string[] = [];
    const activity = { id: "fixture-activity", status: "ACTIVITY_STATUS_CONSENSUS_NEEDED" };
    const server = createServer((req, res) => {
      requests.push(req.url!);
      req.resume();
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/public/v1/query/whoami") {
        res.end(JSON.stringify({ organizationId: org, organizationName: "fixture", userId: "fixture-user", username: "fixture" }));
      } else if (req.url === "/public/v1/submit/create_wallet") {
        res.end(JSON.stringify({ activity }));
      } else if (req.url === "/public/v1/query/get_activity") {
        res.end(JSON.stringify({ activity }));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ message: "unexpected fixture route" }));
      }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("missing loopback address");
    const env = { ...process.env };
    for (const name of Object.keys(env)) {
      if (name.startsWith("TURNKEY_") || name.startsWith("TK_") || /^(HTTPS?|ALL)_PROXY$/i.test(name)) delete env[name];
    }
    const run = async (args: string[], expectedExit = 0) => {
      let stdout: string;
      let code = 0;
      try {
        ({ stdout } = await exec(binary!, ["--config", join(directory, "registry.toml"), "--message-format", "json", ...args], { env }));
      } catch (error) {
        const failed = error as { stdout: string; code: number };
        stdout = failed.stdout;
        code = failed.code;
      }
      expect(code, stdout).toBe(expectedExit);
      const lines = stdout!.trim().split("\n");
      expect(lines).toHaveLength(1);
      return JSON.parse(lines[0]);
    };
    try {
      const key = join(directory, "key.json");
      await run(["api-key", "generate", "--output", key]);
      const login = await run(["--organization-id", org, "--api-base-url", `http://127.0.0.1:${address.port}`, "login", "fixture", "--api-key-file", key]);
      expect(login.reason).toBe("command_result");
      const identity = await run(["--profile", "fixture", "whoami"]);
      expect(identity.data.organizationId).toBe(org);
      const pending = await run(["--profile", "fixture", "wallet", "create", "--input-json", JSON.stringify({ walletName: "fixture", accounts: [] })]);
      expect(pending.schemaVersion).toBe(1);
      expect(pending.status).toBe("pending");
      expect(pending.activity).toEqual(activity);
      expect(pending.data.activity).toEqual(activity);
      const timeout = await run(["--profile", "fixture", "activity", "wait", activity.id, "--timeout", "1"], 1);
      expect(timeout).toMatchObject({ reason: "command_error", code: "wait_timeout", details: { activity } });
      expect(timeout).not.toHaveProperty("schemaVersion");
      const usage = await run(["login", "--api-key-file", key], 2);
      expect(usage).toMatchObject({ reason: "command_error", code: "usage_error" });
      expect(requests.filter((path) => path === "/public/v1/submit/create_wallet")).toHaveLength(1);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      rmSync(directory, { recursive: true, force: true });
    }
  }, 15000);
});
