import { Resend } from "resend";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { formatDate, type DateResponse } from "./invitation";
const directory = path.join(
  process.env.INVITATION_DATA_DIR || path.join(process.cwd(), ".data"),
  "responses",
);
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export class MailError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
/** Durable local ledger. Production requires one Node instance with persistent .data storage. */
export async function sendDateResponse(value: DateResponse) {
  const { id, ...answers } = value;
  const digest = createHash("sha256")
    .update(JSON.stringify(answers))
    .digest("hex");
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, `${id}.json`);
  const lock = `${file}.lock`;
  try {
    await mkdir(lock);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      throw new MailError("Un envoi est déjà en cours.", 409);
    throw error;
  }
  try {
    let record: { digest: string; sent: boolean; started: number } | undefined;
    try {
      record = JSON.parse(await readFile(file, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (record && record.digest !== digest)
      throw new MailError("Cette réponse a déjà été finalisée.", 409);
    if (record?.sent) return;
    if (record && Date.now() - record.started > 23 * 3600000)
      throw new MailError(
        "L’envoi doit être vérifié avant une nouvelle tentative.",
        409,
      );
    if (
      !process.env.RESEND_API_KEY ||
      !process.env.EMAIL_FROM ||
      !process.env.EMAIL_TO
    )
      throw new MailError(
        "Le service de courrier n’est pas encore configuré.",
        503,
      );
    const save = async (v: object) => {
      await writeFile(`${file}.tmp`, JSON.stringify(v), { mode: 0o600 });
      await rename(`${file}.tmp`, file);
    };
    record ??= { digest, sent: false, started: Date.now() };
    await save(record);
    const date = escapeHtml(formatDate(value.date));
    const time = escapeHtml(value.time.replace(":", "h"));
    const food = escapeHtml(
      value.food === "Autre" ? value.otherFood! : value.food,
    );
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send(
      {
        from: process.env.EMAIL_FROM,
        to: process.env.EMAIL_TO,
        subject: "💕 Elle a répondu à ton invitation !",
        html: `<!doctype html><html lang="fr"><body style="margin:0;background:#fff0f3;padding:40px 16px;font-family:Arial,sans-serif;color:#442a32"><div style="max-width:480px;margin:auto;background:#fffdf9;border:1px solid #ffd6e0;border-radius:16px;padding:36px;text-align:center"><p style="color:#e94b70;font-size:32px">♥</p><h1 style="font-family:Georgia,serif;font-weight:normal">Elle a dit oui !</h1><p>Un joli moment à deux se prépare…</p><table style="width:100%;text-align:left;border-spacing:0 16px"><tr><th>Réponse</th><td>Oui 💗</td></tr><tr><th>Date</th><td>${date}</td></tr><tr><th>Heure</th><td>${time}</td></tr><tr><th>Plat</th><td>${food}</td></tr></table><p style="color:#b36079;font-style:italic">Il ne te reste plus qu’à préparer le rendez-vous. ✨</p></div></body></html>`,
        text: `Réponse : Oui\nDate : ${formatDate(value.date)}\nHeure : ${value.time}\nPlat : ${value.food === "Autre" ? value.otherFood : value.food}\n\nIl ne te reste plus qu'à préparer le rendez-vous. ✨`,
      },
      { idempotencyKey: `date-invitation/${id}` },
    );
    if (result.error)
      throw new MailError("Le petit mot n’a pas pu être envoyé.", 502);
    await save({ ...record, sent: true });
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}

/** Shared Resend transport for persistent, personalized notifications. */
export async function sendPersonalizedMail(
  payload: import("./managed-invitations").NotificationPayload,
  id: string,
) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
    throw new MailError("Service email non configuré.", 503);
  const name = escapeHtml(payload.firstName);
  const yes = payload.kind === "completed";
  const answer = payload.response;
  const details = answer
    ? `<tr><th>Date</th><td>${escapeHtml(formatDate(answer.date))}</td></tr><tr><th>Heure</th><td>${escapeHtml(answer.time.replace(":", "h"))}</td></tr><tr><th>Plat</th><td>${escapeHtml(answer.food === "Autre" ? answer.otherFood! : answer.food)}</td></tr>`
    : "";
  const closing = yes
    ? "Il ne te reste plus qu’à préparer le rendez-vous. ✨"
    : "Son choix est enregistré. Merci de respecter sa réponse. 🌷";
  const result = await new Resend(process.env.RESEND_API_KEY).emails.send(
    {
      from: process.env.EMAIL_FROM,
      to: "razafimaharavomarion@gmail.com",
      subject: yes
        ? `💕 ${payload.firstName} a accepté ton invitation !`
        : `🌷 ${payload.firstName} a décliné ton invitation`,
      html: `<!doctype html><html lang="fr"><body style="margin:0;padding:32px 16px;background:#fff0f3;color:#442a32;font-family:Arial,sans-serif"><div style="max-width:480px;margin:auto;padding:32px;border:1px solid #ffd6e0;border-radius:16px;background:#fffdf9"><h1 style="font-family:Georgia,serif;font-weight:normal">${yes ? "Un joli rendez-vous se prépare 💕" : "Une réponse à ton invitation 🌷"}</h1><table style="width:100%;text-align:left;border-spacing:0 16px"><tr><th>Prénom</th><td>${name}</td></tr><tr><th>Réponse</th><td>${yes ? "Oui 💗" : "Non"}</td></tr>${details}</table><p style="color:#b36079">${closing}</p></div></body></html>`,
      text: `Prénom : ${payload.firstName}\nRéponse : ${yes ? "Oui" : "Non"}${answer ? `\nDate : ${formatDate(answer.date)}\nHeure : ${answer.time}\nPlat : ${answer.food === "Autre" ? answer.otherFood : answer.food}` : ""}\n\n${closing}`,
    },
    { idempotencyKey: `personal-invitation/${id}` },
  );
  if (result.error) throw new MailError("Envoi indisponible.", 502);
}
