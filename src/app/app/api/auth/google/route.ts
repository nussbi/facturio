import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getGoogleAuthUrl, googleConfigured } from "@/lib/googleOauth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=oauth_unconfigured", req.url));
  }

  const state = (req.nextUrl.searchParams.get("client") === "app" ? "app:" : "") + crypto.randomBytes(16).toString("hex");
  const url = getGoogleAuthUrl(state);

  const res = NextResponse.redirect(url);
  res.headers.set(
    "Set-Cookie",
    `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
  );
  return res;
}
