import { spawn } from "node:child_process";
import { createServer } from "node:net";
import {
  mkdtemp,
  mkdir,
  cp,
  symlink,
  writeFile,
  rm,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
const root = await mkdtemp(path.join(tmpdir(), "invitation-deploy-"));
const release = `${"a".repeat(40)}-1-1`;
await mkdir(path.join(root, "releases"));
await symlink(
  path.resolve(".deploy/release"),
  path.join(root, "releases", release),
  "dir",
);
await cp(".deploy/app.cjs", path.join(root, "app.cjs"));
await writeFile(path.join(root, "current.json"), JSON.stringify({ release }));
const probe = createServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const child = spawn(process.execPath, [path.join(root, "app.cjs")], {
  env: {
    ...process.env,
    PORT: String(port),
    RESEND_API_KEY: "",
    EMAIL_FROM: "",
    EMAIL_TO: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
child.stdout.on("data", (data) => {
  logs += data;
});
child.stderr.on("data", (data) => {
  logs += data;
});
const stopped = new Promise((resolve) => child.once("exit", resolve));
const origin = `http://127.0.0.1:${port}`;
try {
  let response;
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null)
      throw new Error(`Standalone startup failed: ${logs}`);
    try {
      response = await fetch(origin, { signal: AbortSignal.timeout(2000) });
      break;
    } catch {
      await delay(200);
    }
  }
  assert.equal(response?.status, 200, logs);
  const html = await response.text();
  assert.match(html, /Tu veux sortir/);
  const css = html.match(/href="([^" ]+\.css[^" ]*)"/);
  assert.ok(css, "Stylesheet must be included");
  assert.equal(
    (await fetch(new URL(css[1].replaceAll("&amp;", "&"), origin))).status,
    200,
  );
  const post = (source, body) =>
    fetch(`${origin}/api/send-date-response`, {
      method: "POST",
      headers: { origin: source, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal((await post("https://untrusted.example", {})).status, 403);
  assert.equal((await post(origin, {})).status, 400);
  assert.equal(
    (
      await post(origin, {
        id: crypto.randomUUID(),
        accepted: true,
        date: "2090-10-10",
        time: "18:30",
        food: "Pizza",
        timezoneOffset: -180,
      })
    ).status,
    503,
  );
  await access(path.join(root, ".data/responses"));
  console.log(
    "Packaged startup, page, CSS, API, origin protection and persistent data path: OK. No email sent.",
  );
} finally {
  child.kill("SIGTERM");
  await stopped;
  await rm(root, { recursive: true, force: true });
}
