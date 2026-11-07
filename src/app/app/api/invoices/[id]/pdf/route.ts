import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { buildQrBillPayload, generateQrBill, resolveCreditorDebtor } from '@/lib/qrbill';
import { getCurrentUser } from '@/server/auth';
import { LANG_KEY, type Lang } from '@/lib/i18n';
import { ensureInvoicePdf } from '@/lib/invoiceArchive';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id }, include: { contact: true, items: true },
  });
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  const org = await prisma.orgProfile.findFirst({ where: { userId: user.id } });
  const format = (req.nextUrl.searchParams.get('format') || 'PDF').toUpperCase();
  const cookie = req.cookies.get(LANG_KEY)?.value;
  const lang: Lang = cookie === 'de' || cookie === 'fr' || cookie === 'it' ? cookie : 'en';

  if (format === 'SVG') {
    if (!org?.iban) return NextResponse.json({ error: 'Organisation IBAN missing; QR preview unavailable' }, { status: 422 });
    const { creditor, debtor, account } = resolveCreditorDebtor(invoice, org);
    const result = await generateQrBill(buildQrBillPayload({
      creditor, debtor, account,
      amount: Number((invoice.totalGross ?? 0).toFixed(2)),
      currency: invoice.currency as 'CHF' | 'EUR',
      reference: invoice.reference ?? undefined,
      message: invoice.message ?? undefined,
      graphicsFormat: 'SVG',
      outputSize: (req.nextUrl.searchParams.get('outputSize') || 'A4_PORTRAIT_SHEET') as any,
      lang, plan: (user as any).plan || 'FREE',
    }));
    if (!result.svg) return NextResponse.json({ error: 'Failed to generate SVG' }, { status: 500 });
    return new NextResponse(result.svg, {
      headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, no-store' },
    });
  }
  if (format !== 'PDF') return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
  try {
    // R2 is private. Authentication and tenant ownership are checked above.
    // This stable, per-customer object remains the same document for all subsequent downloads.
    const pdf = await ensureInvoicePdf(invoice, org, (user as any).plan || 'FREE', lang);
    const code = String(invoice.number ?? invoice.id).replace(/[^a-zA-Z0-9-]/g, '');
    const download = req.nextUrl.searchParams.get('download') === '1';
    const pdfBody = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
    return new NextResponse(pdfBody, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="invoice-${code}.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Frame-Options': 'SAMEORIGIN',
      },
    });
  } catch (error) {
    console.error('Invoice PDF archival failed', { id, error });
    return NextResponse.json({ error: 'Unable to archive invoice PDF' }, { status: 500 });
  }
}
