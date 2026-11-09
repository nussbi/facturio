import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { signingBucket, signingObjectKey, saveSigningPdf, getPdfPageCount } from "@/lib/signing";
import { isStandaloneSigningHost } from "@/server/signing-access";
const { GUEST_OWNER_ID, GUEST_COOKIE, guestDraftIds, guestDraftCookie } = require("@/lib/signing-flow.cjs");
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  if (!await isStandaloneSigningHost()) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 8 || file.size > 12 * 1024 * 1024) return NextResponse.json({ error: "Choose a PDF up to 12 MB.", code: "pdfTooLarge" }, { status: 400 });
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return NextResponse.json({ error: "Only PDF documents are supported.", code: "pdfOnly" }, { status: 415 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") return NextResponse.json({ error: "Invalid PDF.", code: "pdfOnly" }, { status: 415 });
    const pageCount = await getPdfPageCount(bytes);
    const user = await getCurrentUser();
    const priorIds = guestDraftIds((await cookies()).get(GUEST_COOKIE)?.value, process.env.SECRET_KEY);
    const envelopeId = crypto.randomUUID();
    const capability = user ? null : guestDraftCookie([...priorIds, envelopeId], process.env.SECRET_KEY);
    if (!user) await prisma.user.upsert({ where: { id: GUEST_OWNER_ID }, update: {}, create: { id: GUEST_OWNER_ID, email: "anonymous-signing@facturio.invalid", passwordHash: null, plan: "FREE", role: "USER" } });
    const userId = user?.id || GUEST_OWNER_ID;
    const documentKey = signingObjectKey(userId, envelopeId);
    await saveSigningPdf(signingBucket(), documentKey, bytes, { envelopeId, userId, purpose: "signature-original" });
    const title = String(form.get("title") || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 160) || file.name.replace(/\.pdf$/i, "").slice(0, 160);
    const envelope = await prisma.signingEnvelope.create({ data: { id: envelopeId, userId, title, documentType: "OTHER", recipientEmail: "", originalFileName: file.name.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 180), documentKey, pageCount, fieldsJson: "[]", status: "DRAFT" }, select: { id: true, title: true } });
    const response = NextResponse.json(envelope, { status: 201, headers: { "Cache-Control": "private, no-store" } });
    if (capability) response.cookies.set(GUEST_COOKIE, capability, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 86400 });
    return response;
  } catch (error) {
    console.error("Standalone PDF upload failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Could not upload this document.", code: "uploadFailed" }, { status: 500 });
  }
}
