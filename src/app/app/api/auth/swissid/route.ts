import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSwissIdAuthUrl, swissidConfigured } from "@/lib/swissidOauth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!swissidConfigured()) {
    return NextResponse.redirect(new URL("/login?error=oauth_unconfigured", req.url));
  }

  const state = crypto.randomBytes(16).toString("hex");
  const url = getSwissIdAuthUrl(state);

  const res = NextResponse.redirect(url);
  res.headers.set(
    "Set-Cookie",
    `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`
  );
  return res;
}
