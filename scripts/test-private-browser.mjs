import { spawn } from "node:child_process";
import { scryptSync } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
const directory = await mkdtemp(path.join(tmpdir(), "invitation-browser-"));
const probe = createServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const password = "local-browser-test-only";
const salt = "b".repeat(32);
const origin = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  PORT: String(port),
  HOSTNAME: "127.0.0.1",
  INVITATION_DATA_DIR: directory,
  RESEND_API_KEY: "",
  EMAIL_FROM: "",
  EMAIL_TO: "",
  ADMIN_PASSWORD_HASH: `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
};
const server = spawn(process.execPath, [".deploy/release/server.js"], {
  env,
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
server.stdout.on("data", (data) => {
  logs += data;
});
server.stderr.on("data", (data) => {
  logs += data;
});
const stopped = new Promise((resolve) => server.once("exit", resolve));
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error(logs);
    try {
      if ((await fetch(origin)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(200);
  }
  if (!ready) throw new Error("Test server not ready");
  const tests = spawn(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test"],
    {
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: origin,
        TEST_ADMIN_PASSWORD: password,
      },
      stdio: "inherit",
    },
  );
  const code = await new Promise((resolve) => tests.once("exit", resolve));
  if (code !== 0) process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
  await stopped;
  await rm(directory, { recursive: true, force: true });
}
