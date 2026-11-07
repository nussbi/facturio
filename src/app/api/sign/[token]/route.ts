import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { signingBucket, signingObjectKey, fetchSigningPdf, saveSigningPdf, applySigningFields } from "@/lib/signing";
import crypto from "node:crypto";

import signingCore from "@/lib/signing-core.cjs";
const { hashOpaqueToken, validateSignatureSubmission } = signingCore;
export const runtime = "nodejs";
const privateHeaders = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };

async function findEnvelope(token: string) {
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) return null;
  const envelope = await prisma.signingEnvelope.findFirst({ where: { tokenHash: hashOpaqueToken(token) } });
  if (!envelope) return null;
  if (envelope.expiresAt && envelope.expiresAt <= new Date() && envelope.status === "SENT") {
    await prisma.signingEnvelope.updateMany({ where: { id: envelope.id, status: "SENT" }, data: { status: "EXPIRED" } });
    return null;
  }
  return envelope;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const envelope = await findEnvelope(token);
  if (!envelope || !["SENT", "SIGNED"].includes(envelope.status)) return NextResponse.json({ error: "This signing link is invalid or expired." }, { status: 404, headers: privateHeaders });
  try {
    const fields = JSON.parse(envelope.fieldsJson);
    if (!Array.isArray(fields)) throw new Error("invalid fields");
    return NextResponse.json({ title: envelope.title, originalFileName: envelope.originalFileName, documentType: envelope.documentType, pageCount: envelope.pageCount, fields, status: envelope.status, signerName: envelope.signerName, signedAt: envelope.signedAt?.toISOString() || null, documentUrl: `/api/sign/${token}/document` }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: "Signing document is unavailable." }, { status: 500, headers: privateHeaders });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const envelope = await findEnvelope(token);
  if (!envelope || envelope.status !== "SENT") return NextResponse.json({ error: "This signing request is no longer available." }, { status: 404, headers: privateHeaders });
  try {
    const body = await req.json();
    if (body?.accepted !== true) return NextResponse.json({ error: "Please confirm that you agree to sign electronically." }, { status: 400, headers: privateHeaders });
    const signerName = String(body?.signerName || "").trim();
    const values = body?.values;
    const fields = JSON.parse(envelope.fieldsJson);
    if (!values || typeof values !== "object" || Array.isArray(values)) return NextResponse.json({ error: "Invalid field values." }, { status: 400, headers: privateHeaders });
    const dateAtSigning = new Date().toISOString().slice(0, 10);
    for (const field of fields) if (field.type === "date") values[field.id] = dateAtSigning;
    validateSignatureSubmission(fields, values, signerName);
    const totalBytes = Object.values(values as Record<string, string>).reduce((sum, value) => sum + (typeof value === "string" ? value.length : 0), 0);
    if (totalBytes > 800_000) return NextResponse.json({ error: "Signature data is too large." }, { status: 413, headers: privateHeaders });
    const bucket = signingBucket();
    const original = await fetchSigningPdf(bucket, envelope.documentKey);
    if (!original) return NextResponse.json({ error: "Original document is unavailable." }, { status: 503, headers: privateHeaders });
    const signedPdf = await applySigningFields(original, fields, values);
    const signedKey = signingObjectKey(envelope.userId, envelope.id, true);
    await saveSigningPdf(bucket, signedKey, signedPdf, { envelopeId: envelope.id, userId: envelope.userId, purpose: "signed-document" });
    const auditValues: Record<string, unknown> = {};
    for (const field of fields) {
      const value = values[field.id];
      if (!value) continue;
      auditValues[field.id] = field.type === "date" ? { type: field.type, value } : { type: field.type, sha256: crypto.createHash("sha256").update(value).digest("hex") };
    }
    const signedAt = new Date();
    const updated = await prisma.signingEnvelope.updateMany({ where: { id: envelope.id, tokenHash: hashOpaqueToken(token), status: "SENT" }, data: { status: "SIGNED", signerName, signedAt, signedDocumentKey: signedKey, fieldValuesJson: JSON.stringify({ values: auditValues, acceptance: true, signedAt: signedAt.toISOString() }) } });
    if (!updated.count) return NextResponse.json({ error: "This signing request was already completed." }, { status: 409, headers: privateHeaders });
    if (envelope.contactId) {
      await prisma.contactLog.create({ data: { contactId: envelope.contactId, message: `Document signed: ${envelope.title} by ${signerName}` } }).catch(() => undefined);
    }
    return NextResponse.json({ success: true, signedAt: signedAt.toISOString() }, { headers: privateHeaders });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid submission." }, { status: 400, headers: privateHeaders });
    if (error instanceof Error && /required|invalid|unexpected|date|signer|signature/i.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400, headers: privateHeaders });
    console.error("Could not complete signing request", error);
    return NextResponse.json({ error: "Could not sign the document. Please try again." }, { status: 500, headers: privateHeaders });
  }
}
