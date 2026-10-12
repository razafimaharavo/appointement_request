import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync, readFileSync } from "node:fs";
import path from "node:path";
let connection: DatabaseSync | undefined;
export function db() {
  if (connection) return connection;
  const directory =
    process.env.INVITATION_DATA_DIR || path.join(process.cwd(), ".data");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, "invitations.sqlite");
  const database = new DatabaseSync(file);
  chmodSync(file, 0o600);
  database.exec(
    "PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;",
  );
  try {
    database.exec("BEGIN IMMEDIATE");
    const version = database.prepare("PRAGMA user_version").get() as {
      user_version: number;
    };
    if (version.user_version === 0)
      database.exec(
        readFileSync(
          path.join(process.cwd(), "migrations", "001_invitations.sql"),
          "utf8",
        ),
      );
    if (version.user_version > 1)
      throw new Error("Database schema is newer than this application");
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    database.close();
    throw error;
  }
  connection = database;
  return database;
}
export function transaction<T>(fn: () => T): T {
  const database = db();
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
