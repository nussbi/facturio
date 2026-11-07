import assert from 'node:assert/strict';
import { test } from 'node:test';
import { invoicePdfKey, getOrCreateArchivedPdf, renderInvoicePdf, type InvoicePdfBucket } from './invoiceArchive';

function fakeBucket() {
  const objects = new Map<string, Uint8Array>();
  let puts = 0;
  const bucket: InvoicePdfBucket = {
    async get(key) {
      const value = objects.get(key);
      return value ? { arrayBuffer: async () => value.slice().buffer } : null;
    },
    async put(key, data, options) {
      assert.equal(options?.httpMetadata?.contentType, 'application/pdf');
      objects.set(key, data);
      puts++;
    },
    async head(key) { return objects.has(key) ? {} : null; },
  };
  return { bucket, objects, get puts() { return puts; } };
}

test('PDF key is tenant and customer scoped and unique per invoice', () => {
  assert.equal(invoicePdfKey({ userId:'user1', contactId:'client2', id:'invoice3' }),
    'users/user1/contacts/client2/invoices/invoice3.pdf');
  assert.notEqual(invoicePdfKey({ userId:'user2', contactId:'client2', id:'invoice3' }),
    invoicePdfKey({ userId:'user1', contactId:'client2', id:'invoice3' }));
});

test('archives PDF once and serves identical bytes on subsequent reads', async () => {
  const b = fakeBucket(); let renders = 0;
  const args = { userId:'u', contactId:'c', id:'i' };
  const generate = async () => { renders++; return new Uint8Array(Buffer.from('%PDF-1.7 sample')); };
  const first = await getOrCreateArchivedPdf(b.bucket, args, generate);
  const second = await getOrCreateArchivedPdf(b.bucket, args, generate);
  assert.deepEqual(first, second);
  assert.equal(renders, 1);
  assert.equal(b.puts, 1);
});

test('rejects invalid PDF and never stores it', async () => {
  const b = fakeBucket();
  await assert.rejects(getOrCreateArchivedPdf(b.bucket, {userId:'u',contactId:'c',id:'i'},
    async () => new Uint8Array(Buffer.from('not a pdf'))), /Invalid PDF/);
  assert.equal(b.puts, 0);
});

test('renders a clearly non-payable PDF for historical test invoices without an organisation', async () => {
  const invoice = {
    id:'invoice1', userId:'testuser', contactId:'contact1', number:7,
    issueDate:new Date('2026-10-01'), dueDate:new Date('2026-10-30'),
    totalTax:0, totalGross:25, currency:'CHF', items:[{
      description:'Sample service', quantity:1, unitPrice:25, lineTotal:25,
    }],
    contact:{company:'Demo Customer',firstName:null,lastName:null},
    user:{email:'test@example.com'},
  };
  const bytes = await renderInvoicePdf(invoice, null, 'FREE', 'en');
  assert.equal(new TextDecoder().decode(bytes.slice(0,5)), '%PDF-');
  assert.ok(bytes.length > 500);
});

test('propagates R2 errors instead of silently reporting success', async () => {
  const b = fakeBucket(); b.bucket.put = async () => { throw Error('R2 unavailable'); };
  await assert.rejects(getOrCreateArchivedPdf(b.bucket, {userId:'u',contactId:'c',id:'i'},
    async () => new Uint8Array(Buffer.from('%PDF-1.7 sample'))), /R2 unavailable/);
});
