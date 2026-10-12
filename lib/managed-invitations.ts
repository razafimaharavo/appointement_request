import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { db, transaction } from "./db";
import { HttpError } from "./http";
import {
  appointmentTimestamp,
  responseSchema,
  type DateResponse,
} from "./invitation";
export type InvitationRow = {
  id: string;
  token: string;
  first_name: string;
  status: "pending" | "accepted" | "declined" | "completed";
  created_at: number;
  updated_at: number;
  revoked_at: number | null;
  response_json: string | null;
};
export const nameSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .refine((v) => !/[\p{Cc}\p{Cf}]/u.test(v), "Prénom invalide.");
export function createInvitation(firstName: string) {
  const parsed = nameSchema.safeParse(firstName);
  if (!parsed.success)
    throw new HttpError(400, "Saisis un prénom de 1 à 60 caractères.");
  const id = randomUUID();
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  db()
    .prepare(
      "INSERT INTO invitations(id,token,first_name,created_at,updated_at) VALUES(?,?,?,?,?)",
    )
    .run(id, token, parsed.data, now, now);
  return getInvitation(token)!;
}
export function getInvitation(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return (
    (db().prepare("SELECT * FROM invitations WHERE token=?").get(token) as
      InvitationRow | undefined) || null
  );
}
export function activeInvitation(token: string) {
  const row = getInvitation(token);
  if (!row || row.revoked_at)
    throw new HttpError(404, "Ce lien n’est plus disponible.");
  return row;
}
export function listInvitations() {
  return db()
    .prepare("SELECT * FROM invitations ORDER BY created_at DESC")
    .all() as InvitationRow[];
}
export function revokeInvitation(id: string) {
  const result = db()
    .prepare(
      "UPDATE invitations SET revoked_at=?,updated_at=? WHERE id=? AND revoked_at IS NULL",
    )
    .run(Date.now(), Date.now(), id);
  if (
    !result.changes &&
    !db().prepare("SELECT id FROM invitations WHERE id=?").get(id)
  )
    throw new HttpError(404, "Invitation introuvable.");
}
export function notificationList(id: string) {
  return db()
    .prepare("SELECT id,kind,state FROM notifications WHERE invitation_id=?")
    .all(id) as { id: string; kind: string; state: string }[];
}
export type NotificationPayload = {
  firstName: string;
  kind: "declined" | "completed";
  response?: DateResponse;
};
export function respond(token: string, input: unknown) {
  const base = z
    .object({
      action: z.enum(["accept", "decline", "complete"]),
      response: z.unknown().optional(),
    })
    .strict()
    .safeParse(input);
  if (!base.success) throw new HttpError(400, "Réponse invalide.");
  return transaction(() => {
    const row = activeInvitation(token);
    const action = base.data.action;
    let response: DateResponse | undefined;
    if (action === "complete") {
      const parsed = responseSchema.safeParse({
        ...(base.data.response && typeof base.data.response === "object"
          ? base.data.response
          : {}),
        id: row.id,
      });
      if (!parsed.success)
        throw new HttpError(400, "Vérifie les informations du rendez-vous.");
      response = parsed.data;
      if (
        row.status !== "completed" &&
        appointmentTimestamp(response) <= Date.now()
      )
        throw new HttpError(400, "Choisis une date et une heure à venir.");
    }
    if (row.status === "completed") {
      if (
        action !== "complete" ||
        row.response_json !== JSON.stringify(response)
      )
        throw new HttpError(409, "Cette invitation a déjà été finalisée.");
    } else {
      const status =
        action === "accept"
          ? "accepted"
          : action === "decline"
            ? "declined"
            : "completed";
      db()
        .prepare(
          "UPDATE invitations SET status=?,response_json=?,updated_at=? WHERE id=?",
        )
        .run(
          status,
          response ? JSON.stringify(response) : null,
          Date.now(),
          row.id,
        );
    }
    let notificationId: string | null = null;
    if (action !== "accept") {
      const kind = action === "decline" ? "declined" : "completed";
      notificationId = `${row.id}-${kind}`;
      const payload: NotificationPayload = {
        firstName: row.first_name,
        kind,
        ...(response ? { response } : {}),
      };
      db()
        .prepare(
          "INSERT OR IGNORE INTO notifications(id,invitation_id,kind,payload_json) VALUES(?,?,?,?)",
        )
        .run(notificationId, row.id, kind, JSON.stringify(payload));
    }
    return { invitation: activeInvitation(token), notificationId };
  });
}
