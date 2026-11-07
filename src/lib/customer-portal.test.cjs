const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hashOpaqueToken } = require('./signing-core.cjs');
const { activePortalShareFilter, resolvePortalShare, customerInvoiceFilter, redactPortalPath, portalLinkToken, invoicePortalShare } = require('./customer-portal.cjs');
const token = 'a'.repeat(43);
const now = new Date('2026-11-07T00:00:00Z');

function clientFor(share) {
  const client = { calls: 0, portalShare: { async findFirst({ where }) {
    client.calls++;
    if (!share || (where.id !== undefined ? share.id !== where.id : share.tokenHash !== where.tokenHash) || share.revokedAt !== null) return null;
    const active = where.OR.some(condition => condition.expiresAt === null
      ? share.expiresAt === null
      : share.expiresAt !== null && share.expiresAt > condition.expiresAt.gt);
    return active ? share : null;
  } } };
  return client;
}
const share = { id: 'testshare123', tokenHash: hashOpaqueToken(token), userId: 'issuer', contactId: 'customer', contact: { userId: 'issuer' }, revokedAt: null, expiresAt: null };

test('non-expiring customer links remain valid', async () => {
  assert.deepEqual(await resolvePortalShare(clientFor(share), token, now), share);
  assert.deepEqual(activePortalShareFilter(now).OR[0], { expiresAt: null });
});
test('future expiry is valid; expired and boundary expiry are rejected', async () => {
  assert.ok(await resolvePortalShare(clientFor({ ...share, expiresAt: new Date(now.getTime() + 1000) }), token, now));
  for (const expiry of [new Date(now.getTime() - 1000), now]) {
    assert.equal(await resolvePortalShare(clientFor({ ...share, expiresAt: expiry }), token, now), null);
  }
});
test('revoked, unknown, and cross-issuer customer links are rejected', async () => {
  for (const record of [null, { ...share, revokedAt: now }, { ...share, contact: { userId: 'other-issuer' } }]) {
    assert.equal(await resolvePortalShare(clientFor(record), token, now), null);
  }
});
test('malformed tokens do not query the database', async () => {
  const client = clientFor(share);
  for (const token of ['', '../private', 'a'.repeat(81), null]) assert.equal(await resolvePortalShare(client, token, now), null);
  assert.equal(client.calls, 0);
});
test('stored token hashes are not accepted as bearer links', async () => {
  const client = { portalShare: { async findFirst({ where }) { return where.tokenHash === share.tokenHash ? share : null; } } };
  assert.equal(await resolvePortalShare(client, share.tokenHash, now), null);
});
test('invoice queries enforce issuer, customer, published statuses and requested invoice', () => {
  assert.deepEqual(customerInvoiceFilter(share, 'invoice'), {
    userId: 'issuer', contactId: 'customer', status: { in: ['SENT', 'PAID'] }, id: 'invoice',
  });
  assert.ok(!('id' in customerInvoiceFilter(share)));
});
test('portal bearer tokens are removed from page and PDF request logs', () => {
  for (const prefix of ['/portal/', '/api/public/portal/', '/app/api/public/portal/']) {
    const redacted = redactPortalPath(`${prefix}${token}/invoices/invoice/pdf`);
    assert.ok(!redacted.includes(token));
    assert.ok(redacted.includes('[private-link]'));
  }
  assert.equal(redactPortalPath('/app/login'), '/app/login');
});

const secret = 'test-only-portal-signing-secret-not-for-deployment';
test('retrievable signed links are stable and preserve original raw links', async () => {
  const signed = portalLinkToken(share, secret);
  assert.equal(signed, portalLinkToken({ ...share }, secret));
  assert.ok(!signed.includes(share.tokenHash));
  assert.deepEqual(await resolvePortalShare(clientFor(share), signed, now, secret), share);
  assert.deepEqual(await resolvePortalShare(clientFor(share), token, now, secret), share);
});
test('signed links reject tampering, wrong keys, expired and revoked shares', async () => {
  const signed = portalLinkToken(share, secret);
  assert.equal(await resolvePortalShare(clientFor(share), signed.slice(0, -1) + (signed.endsWith('a') ? 'b' : 'a'), now, secret), null);
  assert.equal(await resolvePortalShare(clientFor(share), signed, now, 'different-key'), null);
  for (const record of [null, { ...share, expiresAt: now }, { ...share, revokedAt: now }, { ...share, contact: { userId: 'other' } }]) {
    assert.equal(await resolvePortalShare(clientFor(record), signed, now, secret), null);
  }
  assert.ok(await resolvePortalShare(clientFor({ ...share, expiresAt: new Date(now.getTime() + 1000) }), signed, now, secret));
});
test('explicit replacement invalidates both old token formats', async () => {
  const replacement = { ...share, tokenHash: hashOpaqueToken('b'.repeat(43)) };
  assert.equal(await resolvePortalShare(clientFor(replacement), token, now, secret), null);
  assert.equal(await resolvePortalShare(clientFor(replacement), portalLinkToken(share, secret), now, secret), null);
  assert.ok(await resolvePortalShare(clientFor(replacement), portalLinkToken(replacement, secret), now, secret));
});
test('malformed signed links and absent signing secret fail closed', async () => {
  const client = clientFor(share);
  for (const invalid of ['v1.', 'v1...bad', 'v1.testshare123.' + 'x'.repeat(44), 'v1../' + 'x'.repeat(43)]) {
    assert.equal(await resolvePortalShare(client, invalid, now, secret), null);
  }
  assert.equal(client.calls, 0);
  assert.equal(await resolvePortalShare(client, portalLinkToken(share, secret), now, ''), null);
  assert.throws(() => portalLinkToken(share, ''), /not configured/);
});
test('invoice sends reuse existing share without changing hashes or access state', async () => {
  const client = { portalShare: { async upsert(query) {
    assert.deepEqual(query.update, {});
    assert.deepEqual(query.where, { userId_contactId: { userId: share.userId, contactId: share.contactId } });
    assert.equal(query.create.tokenHash.length, 64);
    assert.equal(query.create.expiresAt, null);
    return share;
  } } };
  assert.equal(await invoicePortalShare(client, share.userId, share.contactId, now), share);
  assert.equal(await invoicePortalShare(client, share.userId, share.contactId, now), share);
});
test('invoice resends do not reactivate revoked, expired or mismatched shares', async () => {
  for (const record of [{ ...share, revokedAt: now }, { ...share, expiresAt: now }, { ...share, contact: { userId: 'other' } }]) {
    const client = { portalShare: { async upsert(query) { assert.deepEqual(query.update, {}); return record; } } };
    assert.equal(await invoicePortalShare(client, share.userId, share.contactId, now), null);
  }
});
