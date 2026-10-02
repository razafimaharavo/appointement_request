import { Client } from "basic-ftp";
import { Readable } from "node:stream";
import { access } from "node:fs/promises";
const required = [
  "FTP_SERVER",
  "FTP_USERNAME",
  "FTP_PASSWORD",
  "FTP_SERVER_DIR",
  "GITHUB_SHA",
  "GITHUB_RUN_ID",
  "GITHUB_RUN_ATTEMPT",
];
for (const key of required)
  if (!process.env[key]?.trim()) throw new Error(`Missing ${key}`);
const root = process.env.FTP_SERVER_DIR;
if (
  !root.startsWith("/") ||
  /[\r\n\\]/.test(root) ||
  root.split("/").includes("..")
)
  throw new Error("FTP_SERVER_DIR must be an absolute FTP path without ..");
const release = `${process.env.GITHUB_SHA}-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`;
if (!/^[a-f0-9]{40}-\d+-\d+$/.test(release))
  throw new Error("Invalid release identifier");
await access(".deploy/release/server.js");
const client = new Client(120000);
const uploadText = (text, target) =>
  client.uploadFrom(Readable.from([text]), target);
try {
  await client.access({
    host: process.env.FTP_SERVER,
    user: process.env.FTP_USERNAME,
    password: process.env.FTP_PASSWORD,
    port: 21,
    secure: true,
  });
  // Require an existing directory to avoid publishing into a mistyped path.
  await client.cd(root);
  const base = await client.pwd();
  await client.ensureDir(`releases/${release}`);
  await client.uploadFromDir(".deploy/release");
  await client.cd(base);
  await client.uploadFrom(".deploy/app.cjs", `app.cjs.${release}.tmp`);
  await client.rename(`app.cjs.${release}.tmp`, "app.cjs");
  await uploadText(JSON.stringify({ release }), `current.${release}.tmp`);
  // Switch only after the complete release has arrived. Never delete the old pointer first.
  await client.rename(`current.${release}.tmp`, "current.json");
  await client.ensureDir("tmp");
  await uploadText(`${release}\n${new Date().toISOString()}\n`, "restart.txt");
  console.log(`Release ${release} uploaded and Passenger restart requested.`);
} finally {
  client.close();
}
