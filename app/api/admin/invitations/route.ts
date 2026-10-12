import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin, SESSION_COOKIE } from "@/lib/admin/auth";
import {
  createInvitation,
  listInvitations,
  notificationList,
} from "@/lib/managed-invitations";
import { failure, HttpError, json, readJson } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    requireAdmin(request.cookies.get(SESSION_COOKIE)?.value);
    return json({
      invitations: listInvitations().map((v) => ({
        ...v,
        notifications: notificationList(v.id),
      })),
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    requireAdmin(request.cookies.get(SESSION_COOKIE)?.value);
    const parsed = z
      .object({ firstName: z.string() })
      .strict()
      .safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Prénom requis.");
    return json({ invitation: createInvitation(parsed.data.firstName) }, 201);
  } catch (error) {
    return failure(error);
  }
}
