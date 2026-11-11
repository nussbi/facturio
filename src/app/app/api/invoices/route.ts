import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { invalidateMetricsCache } from "@/lib/metrics";
import { ensureInvoicePdf } from '@/lib/invoiceArchive';
import { LANG_KEY, type Lang } from '@/lib/i18n';

const InvoiceItemSchema = z.object({
  description: z.string(),
  quantity: z.coerce.number().positive(),
  unit: z.string(),
  unitPrice: z.coerce.number().nonnegative(),
  currency: z.enum(["CHF", "EUR"]).default("CHF"),
  expenseId: z.string().optional(),
});

const CreateInvoiceSchema = z.object({
  contactId: z.string(),
  currency: z.enum(["CHF", "EUR"]).default("CHF"),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  taxPercent: z.coerce.number().min(0).max(100).optional(),
  items: z.array(InvoiceItemSchema).min(1),
  reference: z.string().optional(),
  message: z.string().optional(),
  status: z.enum(["DRAFT", "SENT"]).optional(),
  outputSize: z.enum([
    "A4_PORTRAIT_SHEET",
    "QR_BILL_ONLY",
    "QR_BILL_EXTRA_SPACE",
    "PAYMENT_PART_ONLY",
    "QR_CODE_ONLY",
    "QR_CODE_WITH_QUIET_ZONE",
  ]).optional(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const contactId = searchParams.get("contactId") || undefined;
  const takeParam = searchParams.get("take");
  const take = takeParam ? Math.max(1, Math.min(100, parseInt(takeParam, 10) || 1)) : undefined;
  const where: any = { userId: user.id };
  if (contactId) where.contactId = contactId;
  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { items: true, contact: true },
    ...(take ? { take } : {}),
  });
  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const json = await req.json();
  const parsed = CreateInvoiceSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const contact = await prisma.contact.findFirst({ where: { id: data.contactId, userId: user.id } });
  if (!contact) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  const org = await prisma.orgProfile.findFirst({ where: { userId: user.id } });
  if (!org?.iban) return NextResponse.json({ error: 'Organisation IBAN is required to archive an invoice PDF' }, { status: 422 });

  // Compute totals
  const itemsData = data.items.map((i) => ({
    description: i.description,
    quantity: i.quantity,
    unit: i.unit,
    unitPrice: i.unitPrice,
    currency: data.currency,
    lineTotal: Number((i.quantity * i.unitPrice).toFixed(2)),
    expenseId: i.expenseId,
  }));
  const subtotal = itemsData.reduce((sum, i) => sum + (i.lineTotal ?? 0), 0);
  const taxPercent = data.taxPercent ?? 0;
  const totalTax = Number(((subtotal * taxPercent) / 100).toFixed(2));
  const totalGross = Number((subtotal + totalTax).toFixed(2));

  // Next per-user invoice number (simple aggregate; unique constraint enforces correctness)
  const agg = await prisma.invoice.aggregate({ where: { userId: user.id }, _max: { number: true } });
  const nextNumber = ((agg._max.number as number | null) ?? 0) + 1;

  const invoice = await prisma.invoice.create({
    data: {
      userId: user.id,
      contactId: data.contactId,
      number: nextNumber,
      currency: data.currency,
      issueDate: data.issueDate ?? new Date(),
      dueDate: data.dueDate,
      reference: data.reference,
      message: data.message,
      // Default new invoices to DRAFT unless explicitly created as SENT
      status: (data.status as any) ?? 'DRAFT',
      sentAt: data.status === 'SENT' ? new Date() : null,
      taxPercent: data.taxPercent,
      totalTax,
      totalGross,
      outputSize: (data.outputSize as any) ?? null,
      items: { create: itemsData },
    },
    include: { items: true },
  });

  // Update linked expenses to SENT only if invoice is SENT
  if (invoice.status === 'SENT') {
    try {
      const expIds = invoice.items.map((it: any) => it.expenseId).filter((x: any) => !!x);
      if (expIds.length) {
        await prisma.expense.updateMany({ where: { id: { in: expIds } }, data: { status: 'SENT' as any } });
      }
    } catch {}
  }

  // Invalidate metrics cache for this user
  invalidateMetricsCache(user.id);

  // Log invoice creation to the contact's change history (Swiss time)
  try {
    await prisma.contactLog.create({ data: { contactId: invoice.contactId, message: `Invoice #${invoice.number} created` } });
  } catch {}

  // Newly created invoices are archived immediately. If R2 rejects the write,
  // report the invoice ID for retry instead of silently claiming a saved PDF.
  try {
    const raw = req.cookies.get(LANG_KEY)?.value;
    const lang: Lang = raw === 'de' || raw === 'fr' || raw === 'it' ? raw : 'en';
    await ensureInvoicePdf({ ...invoice, contact }, org, (user as any).plan || 'FREE', lang);
  } catch (error) {
    console.error('New invoice PDF archival failed', { id: invoice.id, error });
    return NextResponse.json({ error: 'Invoice created but PDF archive failed. Retry its PDF download.', invoiceId: invoice.id }, { status: 503 });
  }

  return NextResponse.json({ invoice }, { status: 201 });
}

