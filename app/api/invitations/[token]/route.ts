import { NextRequest } from "next/server";
import { respond } from "@/lib/managed-invitations";
import { deliverNotification } from "@/lib/notifications";
import { failure, json, readJson } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const input = await readJson(request);
    const { token } = await params;
    const result = respond(token, input);
    const email = result.notificationId
      ? await deliverNotification(result.notificationId)
      : null;
    return json({ ok: true, status: result.invitation.status, email });
  } catch (error) {
    return failure(error);
  }
}
