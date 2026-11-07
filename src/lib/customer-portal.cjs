const { createHmac, timingSafeEqual } = require('node:crypto');
const { createOpaqueToken, hashOpaqueToken } = require('./signing-core.cjs');
const { redactPortalPath } = require('./portal-privacy.cjs');

function activePortalShareFilter(now = new Date()) {
  return { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

function portalLinkToken(share, secret = process.env.SECRET_KEY) {
  if (!secret) throw new Error('Portal signing secret is not configured');
  const payload = JSON.stringify(['facturio-customer-portal-v1', share.id, share.userId, share.contactId, share.tokenHash]);
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `v1.${share.id}.${signature}`;
}

async function invoicePortalShare(client, userId, contactId, now = new Date()) {
  const share = await client.portalShare.upsert({
    where: { userId_contactId: { userId, contactId } },
    create: { userId, contactId, tokenHash: hashOpaqueToken(createOpaqueToken()), expiresAt: null },
    update: {},
    include: { contact: true },
  });
  if (share.revokedAt !== null || (share.expiresAt !== null && share.expiresAt <= now) || share.contact?.userId !== userId) return null;
  return share;
}

async function resolvePortalShare(client, token, now = new Date(), secret = process.env.SECRET_KEY) {
  if (typeof token === 'string' && token.startsWith('v1.')) {
    const match = /^v1\.([A-Za-z0-9_-]{1,64})\.([A-Za-z0-9_-]{43})$/.exec(token);
    if (!match || !secret) return null;
    const share = await client.portalShare.findFirst({
      where: { id: match[1], ...activePortalShareFilter(now) },
      include: { contact: true },
    });
    if (!share || !share.contact || share.contact.userId !== share.userId) return null;
    const expected = Buffer.from(portalLinkToken(share, secret));
    const actual = Buffer.from(token);
    return expected.length === actual.length && timingSafeEqual(expected, actual) ? share : null;
  }
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{40,80}$/.test(token)) return null;
  const share = await client.portalShare.findFirst({
    where: { tokenHash: hashOpaqueToken(token), ...activePortalShareFilter(now) },
    include: { contact: true },
  });
  if (!share || !share.contact || share.contact.userId !== share.userId) return null;
  return share;
}

function customerInvoiceFilter(share, id) {
  return {
    userId: share.userId,
    contactId: share.contactId,
    status: { in: ['SENT', 'PAID'] },
    ...(id === undefined ? {} : { id }),
  };
}


module.exports = { activePortalShareFilter, resolvePortalShare, customerInvoiceFilter, redactPortalPath, portalLinkToken, invoicePortalShare };
