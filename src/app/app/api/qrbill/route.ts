import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { buildQrBillPayload, generateQrBill, QrBillAddress } from "@/lib/qrbill";
import { getCurrentUser } from "@/server/auth";

// Ensure Node.js runtime (not Edge)
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { invoiceId } = body || {};
  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
  }

  // Restrict invoice to current user
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId: user.id },
    include: { contact: true, items: true },
  });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Load creditor details from the current user's organization profile
  const org = await prisma.orgProfile.findFirst({ where: { userId: user.id } });
  if (!org) {
    return NextResponse.json({ error: "OrgProfile not configured (creditor details + IBAN)" }, { status: 400 });
  }

  // Compute amount
  const amount = Number((invoice.totalGross ?? 0).toFixed(2));

  const creditor: QrBillAddress = {
    name: (org.company || `${org.firstName ?? ""} ${org.lastName ?? ""}`.trim()) || "",
    street: org.street || "",
    postalCode: org.zipCode || "",
    town: org.place || "",
    countryCode: org.country || "CH",
  };

  const debtor: QrBillAddress = {
    name: invoice.contact.company ?? `${invoice.contact.firstName ?? ""} ${invoice.contact.lastName ?? ""}`.trim(),
    street: invoice.contact.street,
    postalCode: invoice.contact.zipCode,
    town: invoice.contact.place,
    countryCode: invoice.contact.country,
  };

  const payload = buildQrBillPayload({
    creditor,
    debtor,
    amount,
    currency: invoice.currency as "CHF" | "EUR",
    account: org.iban,
    plan: (user as any).plan || "FREE",
    reference: invoice.reference ?? undefined,
    message: invoice.message ?? undefined,
    graphicsFormat: (body?.graphicsFormat as any) || (body?.format ? String(body.format).toUpperCase() : undefined),
    outputSize: body?.outputSize,
    separatorType: body?.separatorType,
    language: body?.language,
    resolution: body?.resolution,
    localCountryCode: body?.localCountryCode,
    billInformation: body?.billInformation,
    alternativeSchemes: body?.alternativeSchemes,
    invoiceData: {
      number: invoice.number || 0,
      issueDate: invoice.issueDate.toISOString().split('T')[0],
      dueDate: invoice.dueDate?.toISOString().split('T')[0],
      items: invoice.items.map((item: any) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),
      totalTax: Number(invoice.totalTax),
      totalGross: Number(invoice.totalGross),
    },
  });

  const result = await generateQrBill(payload);
  const placeholder = Boolean(result.svg?.includes("placeholder") || (!result.svg && (!result.pdfBase64 || result.pdfBase64.length === 0)));
  return NextResponse.json({ payload, result, placeholder });
}

