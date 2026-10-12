import { NextRequest } from "next/server";
import { logout, SESSION_COOKIE } from "@/lib/admin/auth";
import { failure, json, readJson } from "@/lib/http";
export async function POST(request: NextRequest) {
  try {
    await readJson(request);
    logout(request.cookies.get(SESSION_COOKIE)?.value);
    const response = json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
