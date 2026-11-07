import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { setSession, signSession } from "@/server/auth";
import { exchangeGoogleCode, getGoogleUser } from "@/lib/googleOauth";

export const runtime = "nodejs";

function fail(req: NextRequest, reason = "oauth") {
  return NextResponse.redirect(new URL(`/login?error=${reason}`, req.url));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) return fail(req);

  // CSRF protection: the state we set when starting the flow must round-trip.
  const stateCookie = req.cookies.get("oauth_state")?.value;
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return fail(req, "oauth_state");
  }

  try {
    const tokenData = await exchangeGoogleCode(code);
    if (!tokenData.access_token) return fail(req);

    const userInfo = await getGoogleUser(tokenData.access_token);
    const email = String(userInfo.email || "").trim().toLowerCase();
    const sub = String(userInfo.sub || "");
    if (!email || !sub) return fail(req);
    if (userInfo.email_verified === false) return fail(req, "oauth_email");

    // Look up an existing OAuth account by Google's stable user id.
    const account = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: { provider: "GOOGLE", providerUserId: sub },
      },
      include: { user: true },
    });

    let user = account?.user ?? null;

    if (!user) {
      // No linked account yet — link by email if the user exists, else create.
      const byEmail = await prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        user = byEmail;
        await prisma.oAuthAccount.create({
          data: { provider: "GOOGLE", providerUserId: sub, userId: user.id },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email,
            name: userInfo.name || null,
            passwordHash: null,
            role: email === "nussbaumer@gmail.com" ? "ADMIN" : "USER",
            founder: false,
            accounts: { create: { provider: "GOOGLE", providerUserId: sub } },
          },
        });
      }
    }

    if (state.startsWith("app:")) {
      // Native app flow: hand the signed session token back to the app via a
      // deep link (facturio://). The Custom Tab hands off to the app, whose
      // webview exchanges the token for the session cookie.
      const token = signSession({ userId: user.id, email: user.email, role: user.role, iat: Date.now() });
      return NextResponse.redirect(`facturio://auth?token=${encodeURIComponent(token)}`);
    }

    const res = NextResponse.redirect(new URL("/app/invoices", req.url));
    await setSession(res, { id: user.id, email: user.email, role: user.role });
    return res;
  } catch (e) {
    console.error("Google OAuth callback failed:", e);
    return fail(req);
  }
}
