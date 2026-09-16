/** Execute the documented tk contract against loopback fixtures, never a live org. */
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, existsSync, realpathSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const binary = process.env.TK_CLI_BINARY;
const exec = promisify(execFile);
const org = "11111111-1111-4111-8111-111111111111";

describe.skipIf(!binary)("tk repository command contract", () => {
  it("creates and logs in a profile and preserves success, pending, and error records", async () => {
    const directory = realpathSync(mkdtempSync(join(tmpdir(), "tk-contract-")));
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
      } else if (req.url === "/public/v1/query/list_activities") {
        res.end(JSON.stringify({ activities: [] }));
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
    const env = { ...process.env, HOME: directory };
    for (const name of Object.keys(env)) {
      if (name.startsWith("TURNKEY_") || name.startsWith("TK_") || /^(HTTPS?|ALL)_PROXY$/i.test(name)) delete env[name];
    }
    const run = async (args: string[], expectedExit = 0) => {
      let stdout: string;
      let code = 0;
      try {
        ({ stdout } = await exec(binary!, ["--message-format", "json", ...args], { env }));
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
      const generated = await run(["api-key", "generate", "--output", key]);
      expect(generated).toMatchObject({ reason: "command_result", command: "api-key.generate", status: "completed" });
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const created = await run(["--organization-id", org, "--api-base-url", baseUrl, "profile", "create", "--profile-name", "fixture", "--api-key-file", key]);
      expect(created).toMatchObject({ reason: "command_result", data: { profile: { organization_id: org } } });
      expect(created.data.publicKey).toMatch(/^0[23][0-9a-f]{64}$/);
      expect(created.data.nextStep).toContain("tk login --profile-name fixture");
      expect(requests).toHaveLength(0);
      const login = await run(["login", "--profile-name", "fixture"]);
      expect(login).toMatchObject({ reason: "command_result", command: "auth.login", data: { profile: "fixture" } });
      expect(login.data.identity.organizationId).toBe(org);
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
      const usage = await run(["login", "fixture"], 2);
      expect(usage).toMatchObject({ reason: "command_error", code: "usage_error" });
      const mismatch = await run(["--organization-id", "22222222-2222-4222-8222-222222222222", "login", "--profile-name", "fixture"], 1);
      expect(mismatch).toMatchObject({ reason: "command_error", code: "invalid_input" });
      expect(mismatch.message).toContain("profile set");
      expect(requests.filter((path) => path === "/public/v1/submit/create_wallet")).toHaveLength(1);
      // Secrets refuse endpoints without a known enclave quorum key before any bytes leave the machine.
      const source = join(directory, "synthetic.bin");
      writeFileSync(source, "synthetic fixture", { mode: 0o600 });
      const before = requests.length;
      const imported = await run(["--profile", "fixture", "secret", "import", "fixture", "--from-file", source], 1);
      expect(imported).toMatchObject({ reason: "command_error", code: "invalid_input" });
      expect(imported.message).toContain("quorum key");
      const output = join(directory, "recovered.bin");
      const exported = await run(["--profile", "fixture", "secret", "export", "--id", org, "--out", output], 1);
      expect(exported).toMatchObject({ reason: "command_error", code: "invalid_input" });
      expect(exported.message).toContain("quorum key");
      expect(existsSync(output)).toBe(false);
      writeFileSync(output, "", { mode: 0o600 });
      const refused = await run(["--profile", "fixture", "secret", "export", "--id", org, "--out", output], 1);
      expect(refused).toMatchObject({ code: "invalid_input" });
      expect(refused.message).toContain("refusing to overwrite");
      expect(requests).toHaveLength(before);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      rmSync(directory, { recursive: true, force: true });
    }
  }, 15000);
});
