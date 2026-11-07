import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { setSession } from "@/server/auth";
import { exchangeSwissIdCode, decodeSwissIdIdToken } from "@/lib/swissidOauth";

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
    const tokenData = await exchangeSwissIdCode(code);
    if (!tokenData.id_token) return fail(req);

    const userInfo = decodeSwissIdIdToken(tokenData.id_token);
    if (!userInfo) return fail(req);

    const email = String(userInfo.email || "").trim().toLowerCase();
    const sub = String(userInfo.sub || "");
    if (!email || !sub) return fail(req);
    if (userInfo.email_verified === false) return fail(req, "oauth_email");

    // Look up an existing OAuth account by SwissID's stable user id.
    const account = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: { provider: "SWISSID", providerUserId: sub },
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
          data: { provider: "SWISSID", providerUserId: sub, userId: user.id },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email,
            name: userInfo.name || null,
            passwordHash: null,
            role: email === "nussbaumer@gmail.com" ? "ADMIN" : "USER",
            founder: false,
            accounts: { create: { provider: "SWISSID", providerUserId: sub } },
          },
        });
      }
    }

    const res = NextResponse.redirect(new URL("/app/invoices", req.url));
    await setSession(res, { id: user.id, email: user.email, role: user.role });
    return res;
  } catch (e) {
    console.error("SwissID OAuth callback failed:", e);
    return fail(req);
  }
}
