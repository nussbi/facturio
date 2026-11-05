import { getCloudflareContext } from '@opennextjs/cloudflare';
import { buildQrBillPayload, generateQrBill, resolveCreditorDebtor } from '@/lib/qrbill';
import type { Lang } from '@/lib/i18n';

/** Private bucket: never expose an R2 public URL. PDFs are served via authorized routes. */
export interface InvoicePdfBucket {
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
  head(key: string): Promise<object | null>;
  put(key: string, data: Uint8Array, options?: { httpMetadata?: { contentType: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
}

type Identity = { userId: string | null; contactId: string; id: string };
export function invoicePdfKey(invoice: Identity): string {
  if (!invoice.userId || ![invoice.userId, invoice.contactId, invoice.id].every(v => /^[a-zA-Z0-9_-]+$/.test(v))) {
    throw new Error('Invalid invoice storage identifiers');
  }
  return `users/${invoice.userId}/contacts/${invoice.contactId}/invoices/${invoice.id}.pdf`;
}

export function invoiceBucket(): InvoicePdfBucket {
  const bucket = (getCloudflareContext().env as any).INVOICE_PDFS as InvoicePdfBucket | undefined;
  if (!bucket) throw new Error('INVOICE_PDFS R2 binding is not configured');
  return bucket;
}

export async function getOrCreateArchivedPdf(
  bucket: InvoicePdfBucket, invoice: Identity, generate: () => Promise<Uint8Array>,
): Promise<Uint8Array> {
  const key = invoicePdfKey(invoice);
  const existing = await bucket.get(key);
  if (existing) return new Uint8Array(await existing.arrayBuffer());
  const pdf = await generate();
  if (pdf.length < 8 || new TextDecoder().decode(pdf.slice(0, 5)) !== '%PDF-') {
    throw new Error('Invalid PDF generated; nothing archived');
  }
  await bucket.put(key, pdf, {
    httpMetadata: { contentType: 'application/pdf' },
    customMetadata: { invoiceId: invoice.id, contactId: invoice.contactId, userId: invoice.userId! },
  });
  // A failed write must never count as archived.
  if (!(await bucket.head(key))) throw new Error('R2 write was not confirmed');
  return pdf;
}

/** Build a full invoice PDF using the same renderer as the authenticated download route. */
export async function renderInvoicePdf(invoice: any, org: any, plan: string, lang: Lang = 'en'): Promise<Uint8Array> {
  if (!org?.iban) return renderUnconfiguredInvoicePdf(invoice);
  const { creditor, debtor, account } = resolveCreditorDebtor(invoice, org);
  const payload = buildQrBillPayload({
    creditor, debtor, account,
    amount: Number((invoice.totalGross ?? 0).toFixed(2)),
    currency: invoice.currency as 'CHF' | 'EUR',
    reference: invoice.reference ?? undefined,
    message: invoice.message ?? undefined,
    graphicsFormat: 'PDF',
    outputSize: 'A4_PORTRAIT_SHEET',
    lang, plan,
    invoiceData: {
      number: invoice.number ?? 0,
      issueDate: invoice.issueDate.toISOString().split('T')[0],
      dueDate: invoice.dueDate?.toISOString().split('T')[0],
      items: invoice.items.map((item: any) => ({
        description: item.description, quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice), lineTotal: Number(item.lineTotal),
      })),
      totalTax: Number(invoice.totalTax), totalGross: Number(invoice.totalGross),
    },
  });
  const result = await generateQrBill(payload);
  if (!result.pdfBase64) throw new Error('PDF generation returned no document');
  return new Uint8Array(Buffer.from(result.pdfBase64, 'base64'));
}

/** Historical seeded invoices with no issuer/bank details are archived as
 * explicitly non-payable records, never as fabricated QR-bills. */
async function renderUnconfiguredInvoicePdf(invoice: any): Promise<Uint8Array> {
  const PDFDocument = (await import('pdfkit')).default;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(new Uint8Array(Buffer.concat(chunks))));
    const customer = invoice.contact?.company || [invoice.contact?.firstName, invoice.contact?.lastName].filter(Boolean).join(' ') || invoice.contactId;
    doc.font('Helvetica-Bold').fontSize(17).text(`Invoice record #${invoice.number ?? invoice.id}`);
    doc.moveDown().font('Helvetica-Bold').fontSize(11).fillColor('#9f1239')
      .text('HISTORICAL RECORD ONLY - NOT PAYABLE / NO QR PAYMENT PART');
    doc.moveDown().font('Helvetica').fontSize(10).fillColor('#334155')
      .text('The issuing account has no organisation profile or IBAN. This PDF preserves the invoice data but is not a valid payable Swiss QR invoice.');
    doc.moveDown().text(`Issuer account: ${invoice.user?.email || invoice.userId}`)
      .text(`Customer: ${customer}`)
      .text(`Issued: ${invoice.issueDate.toISOString().slice(0, 10)}`)
      .text(`Due: ${invoice.dueDate?.toISOString().slice(0, 10) || '-'}`);
    doc.moveDown().font('Helvetica-Bold').text('Items');
    doc.font('Helvetica');
    for (const item of invoice.items || []) {
      doc.text(`${item.description}: ${item.quantity} x ${item.unitPrice} = ${item.lineTotal} ${invoice.currency}`);
    }
    doc.moveDown().font('Helvetica-Bold').text(`Total: ${invoice.totalGross} ${invoice.currency}`);
    doc.end();
  });
}

export async function ensureInvoicePdf(invoice: any, org: any, plan: string, lang: Lang = 'en'): Promise<Uint8Array> {
  return getOrCreateArchivedPdf(invoiceBucket(), invoice, () => renderInvoicePdf(invoice, org, plan, lang));
}
