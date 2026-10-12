import { NextRequest } from "next/server";
import { requireAdmin, SESSION_COOKIE } from "@/lib/admin/auth";
import { notificationList, revokeInvitation } from "@/lib/managed-invitations";
import { deliverNotification } from "@/lib/notifications";
import { failure, HttpError, json, readJson } from "@/lib/http";
import { z } from "zod";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireAdmin(request.cookies.get(SESSION_COOKIE)?.value);
    const { id } = await params;
    if (!z.uuid().safeParse(id).success)
      throw new HttpError(400, "Identifiant invalide.");
    const parsed = z
      .object({ action: z.enum(["revoke", "retry"]) })
      .strict()
      .safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Action invalide.");
    if (parsed.data.action === "revoke") revokeInvitation(id);
    else for (const n of notificationList(id)) await deliverNotification(n.id);
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
