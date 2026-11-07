import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import signingCore from "@/lib/signing-core.cjs";
const { createOpaqueToken, hashOpaqueToken, signingDeliveryMode } = signingCore;

export const runtime = "nodejs";

function esc(value: string) { return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)); }

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const envelope = await prisma.signingEnvelope.findFirst({ where: { id, userId: user.id }, include: { contact: true } });
  if (!envelope) return NextResponse.json({ error: "Signing request not found." }, { status: 404 });
  if (envelope.status !== "DRAFT") return NextResponse.json({ error: "Only a draft can be sent." }, { status: 409 });
  const apiKey = process.env.RESEND_API_KEY;
  const deliveryMode = signingDeliveryMode({ previewMode: process.env.STAGING_MODE, resendConfigured: Boolean(apiKey) });
  if (deliveryMode === "unavailable") return NextResponse.json({ error: "Email delivery is not configured." }, { status: 503 });
  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const tokenHash = hashOpaqueToken(token);
  const claimed = await prisma.signingEnvelope.updateMany({ where: { id, userId: user.id, status: "DRAFT" }, data: { status: "SENT", tokenHash, expiresAt } });
  if (!claimed.count) return NextResponse.json({ error: "Signing request was changed. Refresh and try again." }, { status: 409 });
  const signingOrigin = process.env.SIGNING_BASE_URL || "https://sign.facturio.ch";
  const signingUrl = `${signingOrigin.replace(/\/$/, "")}/sign/${token}`;
  if (deliveryMode === "link-only") return NextResponse.json({ success: true, status: "SENT", signingUrl, previewMode: true }, { headers: { "Cache-Control": "no-store" } });
  const from = process.env.INVOICE_FROM_EMAIL || "Facturio <sign@facturio.ch>";
  const company = (await prisma.orgProfile.findUnique({ where: { userId: user.id }, select: { company: true, firstName: true, lastName: true, email: true } }));
  const senderName = company?.company || `${company?.firstName || ""} ${company?.lastName || ""}`.trim() || "Facturio customer";
  try {
    const sent = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({
      from, to: envelope.recipientEmail, reply_to: company?.email || undefined,
      subject: `Signature requested: ${envelope.title}`,
      html: `<div style="font-family:Arial,sans-serif;color:#17202a;max-width:600px;margin:auto"><h2>Signature requested</h2><p>${esc(senderName)} has asked you to review and sign <strong>${esc(envelope.title)}</strong>.</p><p>This secure signing link expires in 14 days.</p><p><a href="${signingUrl}" style="display:inline-block;background:#087f68;color:white;padding:12px 20px;border-radius:6px;text-decoration:none">Review and sign document</a></p><p style="font-size:12px;color:#666">If you were not expecting this request, you can ignore this email.</p></div>`,
    }) });
    if (!sent.ok) throw new Error(`Email delivery failed (${sent.status})`);
    const data = await sent.json() as { id?: string };
    return NextResponse.json({ success: true, status: "SENT", emailId: data.id }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await prisma.signingEnvelope.updateMany({ where: { id, status: "SENT", tokenHash }, data: { status: "DRAFT", tokenHash: null, expiresAt: null } });
    console.error("Signing email failed", error);
    return NextResponse.json({ error: "Email could not be sent; the signing request remains a draft." }, { status: 502 });
  }
}
