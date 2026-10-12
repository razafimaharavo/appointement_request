import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db, transaction } from "../db";
import { HttpError } from "../http";
const derive = promisify(scrypt);
export const SESSION_COOKIE = "invitation_admin";
export const SESSION_SECONDS = 8 * 3600;
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function configured() {
  return /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(
    process.env.ADMIN_PASSWORD_HASH || "",
  );
}
export async function login(password: string) {
  if (!configured())
    throw new HttpError(
      503,
      "L’accès administrateur doit être configuré sur le serveur.",
    );
  transaction(() => {
    const cutoff = Date.now() - 15 * 60000;
    db()
      .prepare("DELETE FROM login_attempts WHERE occurred_at < ?")
      .run(cutoff);
    const row = db()
      .prepare("SELECT COUNT(*) AS n FROM login_attempts")
      .get() as { n: number };
    if (row.n >= 10)
      throw new HttpError(429, "Trop de tentatives. Réessaie dans 15 minutes.");
    db().prepare("INSERT INTO login_attempts VALUES (?)").run(Date.now());
  });
  const credential = process.env.ADMIN_PASSWORD_HASH!;
  const [, salt, expected] = credential.split(":");
  const actual = (await derive(password, salt, 64)) as Buffer;
  if (!timingSafeEqual(actual, Buffer.from(expected, "hex")))
    throw new HttpError(401, "Mot de passe incorrect.");
  const token = randomBytes(32).toString("hex");
  db()
    .prepare("DELETE FROM admin_sessions WHERE expires_at <= ?")
    .run(Date.now());
  db()
    .prepare("INSERT INTO admin_sessions VALUES (?,?,?)")
    .run(hash(token), Date.now() + SESSION_SECONDS * 1000, hash(credential));
  return token;
}
export function authenticated(token?: string) {
  if (!configured() || !token || !/^[a-f0-9]{64}$/.test(token)) return false;
  return !!db()
    .prepare(
      "SELECT hash FROM admin_sessions WHERE hash=? AND expires_at>? AND credential_version=?",
    )
    .get(hash(token), Date.now(), hash(process.env.ADMIN_PASSWORD_HASH!));
}
export function requireAdmin(token?: string) {
  if (!authenticated(token))
    throw new HttpError(401, "Connecte-toi pour accéder à cet espace.");
}
export function logout(token?: string) {
  if (token)
    db().prepare("DELETE FROM admin_sessions WHERE hash=?").run(hash(token));
}
