import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
const hidden = new Writable({
  write(_chunk, _encoding, callback) {
    callback();
  },
});
const rl = createInterface({
  input: process.stdin,
  output: hidden,
  terminal: !!process.stdin.isTTY,
});
process.stdout.write(
  "Nouveau mot de passe administrateur (12 caractères minimum, saisie masquée) : ",
);
rl.question("", (password) => {
  rl.close();
  process.stdout.write("\n");
  if (password.length < 12 || password.length > 256) {
    console.error("Utiliser entre 12 et 256 caractères.");
    process.exitCode = 1;
    return;
  }
  const salt = randomBytes(16).toString("hex");
  const value = scryptSync(password, salt, 64).toString("hex");
  console.log(`ADMIN_PASSWORD_HASH=scrypt:${salt}:${value}`);
});
