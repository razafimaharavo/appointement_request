import { Client } from "basic-ftp";
import { parseFtpDirectory } from "./ftp-path.mjs";
import { withFtpRetry } from "./ftp-retry.mjs";
import { Readable } from "node:stream";
import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { rootCertificates } from "node:tls";
const required = [
  "FTP_SERVER",
  "FTP_USERNAME",
  "FTP_PASSWORD",
  "GITHUB_SHA",
  "GITHUB_RUN_ID",
  "GITHUB_RUN_ATTEMPT",
];
for (const key of required)
  if (!process.env[key]?.trim()) throw new Error(`Missing ${key}`);
const root = parseFtpDirectory(process.env.FTP_SERVER_DIR);
const ftpHost = process.env.FTP_SERVER.trim();
// o2switch currently omits its Let’s Encrypt Gen-Y chain from the FTPS
// handshake. Keep Node's default trust store and add only the missing public
// chain, so the host name and certificate signature remain verified.
const additionalCertificateAuthorities = await readFile(
  new URL("../certificates/letsencrypt-gen-y-chain.pem", import.meta.url),
  "utf8",
);
const release = `${process.env.GITHUB_SHA}-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`;
if (!/^[a-f0-9]{40}-\d+-\d+$/.test(release))
  throw new Error("Invalid release identifier");
console.log(`Version exécutée : ${release}`);
console.log(
  `FTP_SERVER_DIR reçu : ${JSON.stringify(process.env.FTP_SERVER_DIR)}`,
);
console.log(`Chemin FTP utilisé : ${JSON.stringify(root)}`);
await access(".deploy/release/server.js");
const files = [];
async function scan(directory, relative = "") {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    const local = path.join(directory, entry.name);
    const remote = path.posix.join(relative, entry.name);
    if (entry.isSymbolicLink())
      throw new Error("Unexpected symlink in deployment package");
    if (entry.isDirectory()) await scan(local, remote);
    else if (entry.isFile())
      files.push({ local, remote, size: (await stat(local)).size });
  }
}
await scan(".deploy/release");
const client = new Client(120000);
let base = "";
let phase = "connexion FTPS";
const directories = new Set();
const absolute = (relative) => path.posix.join(base, relative);
async function reconnect() {
  if (!client.closed && base) return;
  directories.clear();
  await client.access({
    host: ftpHost,
    user: process.env.FTP_USERNAME,
    password: process.env.FTP_PASSWORD,
    port: 21,
    secure: true,
    secureOptions: {
      ca: [...rootCertificates, additionalCertificateAuthorities],
      servername: ftpHost,
    },
  });
  // Always restore the configured root after reconnect; never fall back to another folder.
  await client.cd(root);
  base = await client.pwd();
  directories.add(base);
  console.log(
    `Connexion FTPS établie ; dossier cible confirmé : ${JSON.stringify(base)}`,
  );
}
async function run(label, operation) {
  phase = label;
  return withFtpRetry(operation, {
    reconnect,
    close: () => client.close(),
    onRetry: (attempt) =>
      console.log(
        `Connexion interrompue pendant « ${label} ». Reconnexion ${attempt}/3 ; reprise de cette opération.`,
      ),
  });
}
async function ensure(directory) {
  if (!directories.has(directory)) {
    const parent = path.posix.dirname(directory);
    await ensure(parent);
    await client.cd(parent);
    await client.ensureDir(path.posix.basename(directory));
    directories.add(directory);
  }
}
const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
let lastLog = 0;
// Progress callbacks are local only: no concurrent NOOP during a transfer.
client.trackProgress((info) => {
  if (Date.now() - lastLog > 15000) {
    lastLog = Date.now();
    console.log(
      `En cours : ${phase} (${Math.round(info.bytes / 1024)} Ko transférés)`,
    );
  }
});
try {
  console.log(
    `Transfert de ${files.length} fichiers (${(totalBytes / 1024 / 1024).toFixed(1)} Mo).`,
  );
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    await run(
      `fichier ${index + 1}/${files.length} : ${file.remote}`,
      async () => {
        const target = absolute(`releases/${release}/${file.remote}`);
        await ensure(path.posix.dirname(target));
        // A failed file is overwritten from byte zero. Confirmed files in this run are not resent.
        await client.uploadFrom(file.local, target);
      },
    );
    if ((index + 1) % 50 === 0 || index === files.length - 1)
      console.log(`Fichiers confirmés : ${index + 1}/${files.length}`);
  }
  console.log("Version entièrement transférée. Installation du lanceur.");
  await run("installation de app.cjs", async () => {
    const temp = absolute(`app.cjs.${release}.tmp`);
    await client.uploadFrom(".deploy/app.cjs", temp);
    await client.rename(temp, absolute("app.cjs"));
  });
  console.log("Activation de la nouvelle version.");
  await run("activation de current.json", async () => {
    const temp = absolute(`current.${release}.tmp`);
    await client.uploadFrom(Readable.from([JSON.stringify({ release })]), temp);
    // Replaying upload + rename also handles a lost rename acknowledgement safely.
    await client.rename(temp, absolute("current.json"));
  });
  await run("demande de redémarrage Passenger", async () => {
    await ensure(absolute("tmp"));
    await client.uploadFrom(
      Readable.from([`${release}\n${new Date().toISOString()}\n`]),
      absolute("tmp/restart.txt"),
    );
  });
  console.log(`Release ${release} uploaded and Passenger restart requested.`);
} catch (error) {
  console.error(`Échec pendant « ${phase} » : ${error.code || error.message}.`);
  console.error(
    "Aucune suppression des anciennes versions ni du registre .data. Consulter la dernière phase affichée pour savoir si la nouvelle version a été activée.",
  );
  process.exitCode = 1;
} finally {
  client.close();
}
