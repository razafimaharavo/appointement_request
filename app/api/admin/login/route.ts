import { NextRequest } from "next/server";
import { z } from "zod";
import { login, SESSION_COOKIE, SESSION_SECONDS } from "@/lib/admin/auth";
import { failure, HttpError, json, readJson } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const parsed = z
      .object({ password: z.string().min(1).max(256) })
      .strict()
      .safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError(400, "Mot de passe requis.");
    const token = await login(parsed.data.password);
    const response = json({ ok: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
