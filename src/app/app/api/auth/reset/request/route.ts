import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/server/db";
import { sendMail } from "@/server/mailer";
import { t, LANG_KEY, type Lang } from "@/lib/i18n";

function base64url(b: Buffer) {
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}));
  const origin = req.nextUrl.origin;
  const baseUrl = process.env.APP_BASE_URL || origin;
  const langCookie = req.cookies.get(LANG_KEY)?.value;
  const lang: Lang = langCookie === "de" || langCookie === "fr" || langCookie === "it" ? langCookie : "en";
  if (!email) return NextResponse.json({ ok: true }); // Don't leak
  const normEmail = String(email).trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normEmail } });

  if (user) {
    const token = base64url(crypto.randomBytes(32));
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    await (prisma as any).passwordResetToken.create({ data: { token, userId: user.id, expiresAt } });
  const url = `${baseUrl}/reset?token=${encodeURIComponent(token)}`;
    const brand = "facturio.ch";
    const html = `
      <div style="background:#f6f9fc;padding:24px 0;width:100%">
        <table role="presentation" align="center" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eaeaea;border-radius:8px;overflow:hidden">
          <tr>
            <td style="padding:24px 24px 0 24px;text-align:center">
              <div style="font-size:22px;font-weight:600;letter-spacing:.2px;line-height:1.2;background:linear-gradient(90deg,#4f46e5,#2563eb,#06b6d4);-webkit-background-clip:text;background-clip:text;color:transparent">${brand}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 0 24px;text-align:center">
              <div style="font-size:18px;font-weight:600;color:#111827">${t(lang, "email.resetSubject")}</div>
              <div style="margin-top:8px;font-size:14px;color:#6b7280">${t(lang, "email.resetIntro")}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;text-align:center">
              <a href="${url}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;border-radius:8px;padding:12px 20px">${t(lang, "email.resetButton")}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 8px 24px;text-align:center">
              <div style="font-size:12px;color:#6b7280;word-break:break-all">${t(lang, "email.resetAltLink")}<br/>
              <a href="${url}" style="color:#2563eb;text-decoration:underline">${url}</a></div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 24px 24px;text-align:center">
              <div style="font-size:12px;color:#6b7280">${t(lang, "email.resetExpiry")}</div>
            </td>
          </tr>
        </table>
        <div style="max-width:560px;margin:12px auto 0 auto;text-align:center;font-size:11px;color:#9ca3af">© ${new Date().getFullYear()} ${brand}</div>
      </div>`;
    await sendMail({
      to: normEmail,
      subject: t(lang, "email.resetSubject"),
      from: process.env.RESET_FROM_EMAIL || "pwreset@facturio.ch",
      text: t(lang, "email.resetText").replace("{url}", url),
      html,
    });
  }

  return NextResponse.json({ ok: true });
}

