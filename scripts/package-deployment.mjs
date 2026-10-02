import { cp, mkdir, rm, access, readdir, lstat } from "node:fs/promises";
import path from "node:path";
const destination = path.resolve(".deploy");
await access(".next/standalone/server.js");
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
const allowed = (source) =>
  !path.basename(source).startsWith(".env") &&
  ![".git", ".data"].includes(path.basename(source));
await cp(".next/standalone", path.join(destination, "release"), {
  recursive: true,
  dereference: true,
  filter: allowed,
});
await cp(".next/static", path.join(destination, "release/.next/static"), {
  recursive: true,
  filter: allowed,
});
await cp("public", path.join(destination, "release/public"), {
  recursive: true,
  filter: allowed,
});
await cp("deployment/app.cjs", path.join(destination, "app.cjs"));
async function verify(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (!allowed(file) || (await lstat(file)).isSymbolicLink())
      throw new Error("Unsafe deployment file");
    if (entry.isDirectory()) await verify(file);
  }
}
await verify(destination);
console.log(
  "Standalone package prepared in .deploy (no env files or response ledger).",
);
