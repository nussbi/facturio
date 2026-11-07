import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const envelope = await prisma.signingEnvelope.findFirst({ where: { id, userId: user.id }, include: { contact: true } });
  if (!envelope) return NextResponse.json({ error: "Signing request not found." }, { status: 404 });
  if (envelope.documentType !== "QUOTE" || envelope.status !== "SIGNED" || !envelope.contactId || !envelope.extractedDataJson) return NextResponse.json({ error: "Only signed quotes with reviewed extraction data can become invoice drafts." }, { status: 409 });
  if (envelope.invoiceDraftId) return NextResponse.json({ invoiceId: envelope.invoiceDraftId, status: "DRAFT", reused: true }, { headers: { "Cache-Control": "no-store" } });
  try {
    const body = await req.json();
    if (body?.confirmed !== true) return NextResponse.json({ error: "Please confirm that you reviewed the extracted quote details." }, { status: 400 });
    const extracted = JSON.parse(envelope.extractedDataJson);
    const total = Number(extracted.total);
    const currency = extracted.currency;
    const description = String(extracted.description || "Services from signed quote").slice(0, 200);
    if (!Number.isFinite(total) || total <= 0 || total > 1_000_000_000 || !["CHF", "EUR"].includes(currency)) return NextResponse.json({ error: "Quote amount is invalid; edit the draft manually." }, { status: 400 });
    const contact = envelope.contact;
    if (!contact || contact.userId !== user.id) return NextResponse.json({ error: "Linked customer is unavailable." }, { status: 409 });
    const invoiceId = `quote-${envelope.id}`;
    const existing = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { id: true, userId: true, contactId: true, status: true } });
    if (existing && (existing.userId !== user.id || existing.contactId !== contact.id)) return NextResponse.json({ error: "Invoice draft conflict." }, { status: 409 });
    if (!existing) {
      await prisma.invoice.create({ data: {
        id: invoiceId, userId: user.id, contactId: contact.id, status: "DRAFT", issueDate: new Date(),
        currency, taxPercent: null, totalTax: 0, totalGross: total,
        message: `Review before sending. Draft from signed quote: ${envelope.title}`,
        items: { create: { description, quantity: 1, unit: "each", unitPrice: total, currency, lineTotal: total } },
      } });
    }
    await prisma.signingEnvelope.updateMany({ where: { id: envelope.id, userId: user.id, status: "SIGNED", invoiceDraftId: null }, data: { invoiceDraftId: invoiceId, extractedDataJson: JSON.stringify({ ...extracted, confirmedByUser: true, confirmedAt: new Date().toISOString() }) } });
    const verified = await prisma.signingEnvelope.findFirst({ where: { id: envelope.id, userId: user.id }, select: { invoiceDraftId: true } });
    if (verified?.invoiceDraftId !== invoiceId) return NextResponse.json({ error: "Could not link the invoice draft." }, { status: 409 });
    return NextResponse.json({ invoiceId, status: "DRAFT", reused: Boolean(existing) }, { status: existing ? 200 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Quote invoice draft creation failed", error);
    return NextResponse.json({ error: "Could not create the invoice draft." }, { status: 500 });
  }
}
