const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const portal = require('./customer-portal.cjs');
const { hashOpaqueToken } = require('./signing-core.cjs');
const secret = 'pdf-route-test-only-signing-key';
const raw = 'a'.repeat(43);
const share = { id: 'testshare123', userId: 'issuer', contactId: 'customer', tokenHash: hashOpaqueToken(raw), revokedAt: null, expiresAt: null, contact: { userId: 'issuer' } };
const signed = portal.portalLinkToken(share, secret);
const source = fs.readFileSync(path.join(__dirname, '../app/app/api/public/portal/[token]/invoices/[id]/pdf/route.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function route(allowed = true) {
  const calls = { share: 0, invoice: 0, pdf: 0 };
  const client = {
    portalShare: { async findFirst({ where }) { calls.share++; return where.id === share.id || where.tokenHash === share.tokenHash ? share : null; } },
    invoice: { async findFirst({ where }) { calls.invoice++; assert.deepEqual(JSON.parse(JSON.stringify(where)), portal.customerInvoiceFilter(share, 'invoice123')); return allowed ? { id: 'invoice123', number: 7, user: {} } : null; } },
  };
  class NextResponse extends Response { static json(body, init) { return new Response(JSON.stringify(body), { ...init, headers: { ...init?.headers, 'Content-Type': 'application/json' } }); } }
  const module = { exports: {} };
  vm.runInNewContext(compiled, { exports: module.exports, require(name) {
    if (name === 'next/server') return { NextResponse };
    if (name === '@/server/db') return { prisma: client };
    if (name === '@/lib/customer-portal.cjs') return { ...portal, resolvePortalShare: (db, token) => portal.resolvePortalShare(db, token, new Date(), secret) };
    if (name === '@/lib/invoiceArchive') return { async ensureInvoicePdf() { calls.pdf++; return new TextEncoder().encode('%PDF-1.7\nportal-test'); } };
    throw new Error(name);
  }, URL, console });
  return { get: module.exports.GET, calls };
}
for (const [format, token] of [['original', raw], ['signed-v1', signed]]) {
  for (const download of [false, true]) test(`${format} PDF ${download ? 'download' : 'view'} accepts valid public links without login`, async () => {
    const { get, calls } = route();
    const result = await get(new Request(`https://app.facturio.ch/app/api/public/portal/${token}/invoices/invoice123/pdf${download ? '?download=1' : ''}`), { params: Promise.resolve({ token, id: 'invoice123' }) });
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('Content-Type'), 'application/pdf');
    assert.equal(result.headers.get('Content-Disposition'), `${download ? 'attachment' : 'inline'}; filename="invoice-7.pdf"`);
    assert.equal(result.headers.get('Cache-Control'), 'private, no-store');
    assert.ok((await result.text()).startsWith('%PDF-'));
    assert.deepEqual(calls, { share: 1, invoice: 1, pdf: 1 });
  });
}
test('signed PDF route rejects tampering and stored hashes', async () => {
  for (const token of [signed.slice(0, -1) + (signed.endsWith('x') ? 'y' : 'x'), share.tokenHash, '../private']) {
    const { get, calls } = route();
    const result = await get(new Request('https://app.facturio.ch/test'), { params: Promise.resolve({ token, id: 'invoice123' }) });
    assert.equal(result.status, 404); assert.equal(calls.invoice, 0); assert.equal(calls.pdf, 0);
  }
});
test('signed PDF route denies invoices outside customer scope', async () => {
  const { get, calls } = route(false);
  const result = await get(new Request('https://app.facturio.ch/test'), { params: Promise.resolve({ token: signed, id: 'invoice123' }) });
  assert.equal(result.status, 404); assert.equal(calls.pdf, 0);
});
