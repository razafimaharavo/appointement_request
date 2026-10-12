import { randomUUID } from "node:crypto";
import { db, transaction } from "./db";
import { sendPersonalizedMail } from "./mail";
import type { NotificationPayload } from "./managed-invitations";
type Notification = {
  id: string;
  state: string;
  payload_json: string;
  started_at: number | null;
  lease_until: number;
  claim: string | null;
};
/** Transactional outbox + bounded retries within Resend's 24h idempotency window. */
export async function deliverNotification(
  id: string,
  send = sendPersonalizedMail,
) {
  const claim = randomUUID();
  const selected = transaction(() => {
    const row = db()
      .prepare("SELECT * FROM notifications WHERE id=?")
      .get(id) as Notification | undefined;
    if (!row) return null;
    if (row.state === "sent" || row.state === "uncertain") return row;
    if (row.started_at && Date.now() - row.started_at > 23 * 3600000) {
      db()
        .prepare("UPDATE notifications SET state='uncertain' WHERE id=?")
        .run(id);
      return { ...row, state: "uncertain" };
    }
    if (row.lease_until > Date.now()) return { ...row, state: "sending" };
    // Missing configuration has not contacted the provider; don't start the retry window yet.
    if (
      send === sendPersonalizedMail &&
      (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
    )
      return { ...row, state: "pending" };
    db()
      .prepare(
        "UPDATE notifications SET state='sending',started_at=COALESCE(started_at,?),lease_until=?,claim=? WHERE id=?",
      )
      .run(Date.now(), Date.now() + 120000, claim, id);
    return { ...row, claim, state: "sending" };
  });
  if (!selected || selected.claim !== claim)
    return selected?.state || "pending";
  try {
    await send(JSON.parse(selected.payload_json) as NotificationPayload, id);
    db()
      .prepare(
        "UPDATE notifications SET state='sent',lease_until=0 WHERE id=? AND claim=?",
      )
      .run(id, claim);
    return "sent";
  } catch {
    db()
      .prepare(
        "UPDATE notifications SET state='pending',lease_until=0 WHERE id=? AND claim=?",
      )
      .run(id, claim);
    return "pending";
  }
}
