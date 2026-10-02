import { NextRequest, NextResponse } from "next/server";
import { appointmentTimestamp, responseSchema } from "@/lib/invitation";
import { MailError, sendDateResponse } from "@/lib/mail";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin)
    return NextResponse.json(
      { error: "Origine non autorisée." },
      { status: 403 },
    );
  if (!request.headers.get("content-type")?.includes("application/json"))
    return NextResponse.json({ error: "JSON requis." }, { status: 415 });
  try {
    const reader = request.body?.getReader();
    if (!reader)
      return NextResponse.json(
        { error: "Réponse manquante." },
        { status: 400 },
      );
    let bytes = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 4096) {
        await reader.cancel();
        return NextResponse.json(
          { error: "Réponse trop longue." },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    const parsed = responseSchema.safeParse(
      JSON.parse(Buffer.concat(chunks).toString("utf8")),
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: "Vérifie les informations du rendez-vous." },
        { status: 400 },
      );
    if (appointmentTimestamp(parsed.data) <= Date.now())
      return NextResponse.json(
        { error: "Le rendez-vous doit être à venir." },
        { status: 400 },
      );
    await sendDateResponse(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
    if (error instanceof MailError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error(
      "Invitation email failed:",
      error instanceof Error ? error.name : "Unknown error",
    );
    return NextResponse.json(
      { error: "L’envoi est momentanément indisponible." },
      { status: 500 },
    );
  }
}
