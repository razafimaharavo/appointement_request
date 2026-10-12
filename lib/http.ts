import { NextRequest, NextResponse } from "next/server";
import { isSameOrigin } from "./request-origin";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  console.error(
    "Invitation operation failed:",
    error instanceof Error ? error.name : "Unknown",
  );
  return json({ error: "Le service est momentanément indisponible." }, 500);
}
export async function readJson(request: NextRequest): Promise<unknown> {
  const origin = request.headers.get("origin");
  if (
    !origin ||
    !isSameOrigin(origin, request.headers.get("host"), request.nextUrl.href)
  )
    throw new HttpError(403, "Origine non autorisée.");
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "JSON requis.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Données manquantes.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 4096) {
      await reader.cancel();
      throw new HttpError(413, "Données trop longues.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "JSON invalide.");
  }
}
