import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { getPdfPageCount, saveSigningPdf, signingBucket, signingObjectKey } from "@/lib/signing";

import signingCore from "@/lib/signing-core.cjs";
const { validateSigningFields } = signingCore;
export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const requests = await prisma.signingEnvelope.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, title: true, documentType: true, recipientEmail: true, status: true, createdAt: true, signedAt: true, pageCount: true, invoiceDraftId: true } });
  return NextResponse.json({ requests }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 8 || file.size > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "Choose a PDF up to 12 MB." }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF documents are supported for signing." }, { status: 415 });
    }
    const title = String(form.get("title") || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
    const recipientEmail = String(form.get("recipientEmail") || "").trim().toLowerCase();
    const documentType = String(form.get("documentType") || "OTHER");
    const contactId = String(form.get("contactId") || "").trim() || null;
    if (!title || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) return NextResponse.json({ error: "Title and a valid recipient email are required." }, { status: 400 });
    if (!new Set(["OTHER", "QUOTE", "AGREEMENT"]).has(documentType)) return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
    if (documentType === "QUOTE" && !contactId) return NextResponse.json({ error: "Choose a customer for a quote." }, { status: 400 });
    if (contactId) {
      const contact = await prisma.contact.findFirst({ where: { id: contactId, userId: user.id }, select: { id: true } });
      if (!contact) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") return NextResponse.json({ error: "This file does not contain a valid PDF." }, { status: 415 });
    const pageCount = await getPdfPageCount(bytes);
    const fields = JSON.parse(String(form.get("fields") || "[]"));
    validateSigningFields(fields, pageCount);
    if (!fields.some((field: any) => field.type === "signature")) return NextResponse.json({ error: "Add at least one signature field." }, { status: 400 });

    let extractedDataJson: string | null = null;
    const extracted = String(form.get("extractedData") || "");
    if (documentType === "QUOTE" && extracted) {
      const data = JSON.parse(extracted);
      if (!data || typeof data !== "object" || typeof data.currency !== "string" || !["CHF", "EUR"].includes(data.currency) || !Number.isFinite(data.total) || data.total <= 0 || data.total > 1_000_000_000 || typeof data.description !== "string") {
        return NextResponse.json({ error: "Quote extraction is invalid. Review the amount and currency." }, { status: 400 });
      }
      extractedDataJson = JSON.stringify({ currency: data.currency, total: data.total, description: data.description.slice(0, 200), extractedAt: new Date().toISOString(), confirmedByUser: false });
    }

    const envelopeId = crypto.randomUUID();
    const documentKey = signingObjectKey(user.id, envelopeId);
    const bucket = signingBucket();
    await saveSigningPdf(bucket, documentKey, bytes, { envelopeId, userId: user.id, purpose: "signature-original" });
    const envelope = await prisma.signingEnvelope.create({ data: {
      id: envelopeId, userId: user.id, contactId, title, documentType, recipientEmail,
      originalFileName: file.name.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 180), documentKey,
      pageCount, fieldsJson: JSON.stringify(fields), extractedDataJson,
    }, select: { id: true, title: true, status: true } });
    return NextResponse.json(envelope, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid fields or quote data." }, { status: 400 });
    if (error instanceof Error && /Field|page|Invalid|required|document/i.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Signing envelope create failed", error);
    return NextResponse.json({ error: "Could not create the signing request." }, { status: 500 });
  }
}
