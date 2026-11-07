import { NextRequest, NextResponse } from "next/server";
import { verifySession, setSessionToken } from "@/server/auth";

export const runtime = "nodejs";

// Exchanges a signed session token (handed back from the native OAuth flow)
// for the HttpOnly session cookie inside the app's webview.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  const session = verifySession(token);
  if (!session?.userId) {
    return NextResponse.redirect(new URL("/login?error=oauth_state", req.url));
  }
  const res = NextResponse.redirect(new URL("/app/invoices", req.url));
  setSessionToken(res, token);
  return res;
}
