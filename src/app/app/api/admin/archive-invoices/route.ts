import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/server/db';
import { ensureInvoicePdf, invoiceBucket, invoicePdfKey } from '@/lib/invoiceArchive';
import type { Lang } from '@/lib/i18n';

export const runtime = 'nodejs';

/** One-off, idempotent migration. Header secret is never accepted in a URL or logged. */
export async function POST(req: NextRequest) {
  const expected = process.env.INVOICE_ARCHIVE_SECRET;
  if (!expected || req.headers.get('x-invoice-archive-secret') !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({})) as { cursor?: string; take?: number };
  if (body.cursor && !/^[a-zA-Z0-9_-]+$/.test(body.cursor)) {
    return NextResponse.json({ error: 'invalid cursor' }, { status: 400 });
  }
  const take = Math.max(1, Math.min(5, Number(body.take) || 3));
  const rows = await prisma.invoice.findMany({
    where: body.cursor ? { id: { gt: body.cursor } } : undefined,
    orderBy: { id: 'asc' }, take,
    include: { contact: true, items: true, user: { include: { orgProfile: true } } },
  });
  const bucket = invoiceBucket();
  const results: { id: string; key: string; status: 'stored' | 'existing' | 'failed'; error?: string }[] = [];
  for (const invoice of rows) {
    const key = invoicePdfKey(invoice);
    try {
      const existing = await bucket.head(key);
      if (existing) { results.push({ id: invoice.id, key, status: 'existing' }); continue; }
      const org = invoice.user?.orgProfile;
      const country = org?.country?.toUpperCase();
      const lang: Lang = country === 'DE' || country === 'AT' ? 'de' : country === 'FR' ? 'fr' : country === 'IT' ? 'it' : 'en';
      await ensureInvoicePdf(invoice, org, invoice.user?.plan || 'FREE', lang);
      results.push({ id: invoice.id, key, status: 'stored' });
    } catch (error) {
      results.push({ id: invoice.id, key, status: 'failed', error: error instanceof Error ? error.message : String(error) });
    }
  }
  return NextResponse.json({
    results, nextCursor: rows.at(-1)?.id || null, done: rows.length < take,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
