import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { scryptSync } from "node:crypto";
import { db } from "../lib/db";
import {
  createInvitation,
  getInvitation,
  respond,
  revokeInvitation,
  notificationList,
} from "../lib/managed-invitations";
import { deliverNotification } from "../lib/notifications";
import { login, authenticated, logout } from "../lib/admin/auth";
const directory = mkdtempSync(path.join(tmpdir(), "invitation-db-test-"));
process.env.INVITATION_DATA_DIR = directory;
const salt = "a".repeat(32);
process.env.ADMIN_PASSWORD_HASH = `scrypt:${salt}:${scryptSync("correct-private-password", salt, 64).toString("hex")}`;
after(() => {
  db().close();
  rmSync(directory, { recursive: true, force: true });
});
const response = {
  accepted: true,
  date: "2090-10-10",
  time: "18:30",
  food: "Pizza",
  timezoneOffset: -180,
};
test("tokens are unique, validated; names are server-owned; completed answers immutable", () => {
  const a = createInvitation(" Sarah ");
  const b = createInvitation("Lina");
  assert.notEqual(a.token, b.token);
  assert.match(a.token, /^[a-f0-9]{64}$/);
  assert.equal(getInvitation("bad"), null);
  respond(a.token, { action: "accept" });
  assert.equal(getInvitation(a.token)?.status, "accepted");
  const finished = respond(a.token, {
    action: "complete",
    response: { ...response, firstName: "Spoofed", id: b.id },
  });
  const n = db()
    .prepare("SELECT payload_json FROM notifications WHERE id=?")
    .get(finished.notificationId!) as { payload_json: string };
  const data = JSON.parse(n.payload_json);
  assert.equal(data.firstName, "Sarah");
  assert.equal(data.response.id, a.id);
  respond(a.token, { action: "complete", response });
  assert.equal(notificationList(a.id).length, 1);
  assert.throws(
    () =>
      respond(a.token, {
        action: "complete",
        response: { ...response, food: "Sushi" },
      }),
    /finalisée/,
  );
  assert.throws(() => respond(a.token, { action: "decline" }), /finalisée/);
});
test("decline persists and can be reconsidered without resending the same notification", () => {
  const a = createInvitation("Julie");
  respond(a.token, { action: "decline" });
  respond(a.token, { action: "decline" });
  assert.equal(getInvitation(a.token)?.status, "declined");
  assert.equal(notificationList(a.id).length, 1);
  respond(a.token, { action: "accept" });
  assert.equal(getInvitation(a.token)?.status, "accepted");
  respond(a.token, { action: "complete", response });
  assert.equal(notificationList(a.id).length, 2);
});
test("invalid payload and revoked tokens cannot mutate a response", () => {
  const a = createInvitation("Zoé");
  assert.throws(
    () =>
      respond(a.token, {
        action: "complete",
        response: { ...response, date: "2020-01-01" },
      }),
    /venir/,
  );
  assert.equal(getInvitation(a.token)?.status, "pending");
  revokeInvitation(a.id);
  assert.throws(() => respond(a.token, { action: "accept" }), /disponible/);
  assert.throws(
    () => respond("f".repeat(64), { action: "accept" }),
    /disponible/,
  );
});
test("outbox claims prevent concurrent delivery and repeat delivery after success", async () => {
  const a = createInvitation("Emma");
  const { notificationId } = respond(a.token, { action: "decline" });
  let calls = 0;
  const send = async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 10));
  };
  await Promise.all([
    deliverNotification(notificationId!, send),
    deliverNotification(notificationId!, send),
  ]);
  await deliverNotification(notificationId!, send);
  assert.equal(calls, 1);
});
test("failed deliveries retry with the same key; uncertain old ones are blocked", async () => {
  const a = createInvitation("Anna");
  const { notificationId } = respond(a.token, { action: "decline" });
  let calls = 0;
  const keys: string[] = [];
  const send = async (_payload: unknown, id: string) => {
    calls++;
    keys.push(id);
    if (calls === 1) throw new Error("network");
  };
  assert.equal(await deliverNotification(notificationId!, send), "pending");
  assert.equal(await deliverNotification(notificationId!, send), "sent");
  assert.deepEqual(keys, [notificationId, notificationId]);
  const b = createInvitation("Eva");
  const n = respond(b.token, { action: "decline" }).notificationId!;
  db()
    .prepare("UPDATE notifications SET started_at=? WHERE id=?")
    .run(Date.now() - 24 * 3600000, n);
  assert.equal(await deliverNotification(n, send), "uncertain");
  assert.equal(calls, 2);
});
test("password verification, session revocation, rotation and expiry", async () => {
  await assert.rejects(login("incorrect"), /incorrect/);
  const token = await login("correct-private-password");
  assert.equal(authenticated(token), true);
  assert.equal(authenticated("a".repeat(64)), false);
  logout(token);
  assert.equal(authenticated(token), false);
  const second = await login("correct-private-password");
  db().prepare("UPDATE admin_sessions SET expires_at=0").run();
  assert.equal(authenticated(second), false);
  const third = await login("correct-private-password");
  const old = process.env.ADMIN_PASSWORD_HASH;
  process.env.ADMIN_PASSWORD_HASH = `scrypt:${salt}:${"0".repeat(128)}`;
  assert.equal(authenticated(third), false);
  process.env.ADMIN_PASSWORD_HASH = old;
});
test("login attempts are limited persistently", async () => {
  db().prepare("DELETE FROM login_attempts").run();
  for (let i = 0; i < 10; i++)
    await assert.rejects(login("wrong"), /incorrect/);
  await assert.rejects(login("correct-private-password"), /tentatives/);
});
