const { createHmac, timingSafeEqual } = require('node:crypto');
const { createOpaqueToken, hashOpaqueToken, validateSigningFields, signingDeliveryMode } = require('./signing-core.cjs');
const GUEST_OWNER_ID = 'facturio-signing-guest';
const GUEST_COOKIE = 'facturio-sign-drafts';
function guestDraftIds(cookie, secret, now = Date.now()) {
  if (!cookie || !secret || cookie.length > 4000) return [];
  const parts = cookie.split('.');
  if (parts.length !== 2) return [];
  const [data, signature] = parts;
  const expected = Buffer.from(createHmac('sha256', secret).update(data).digest('base64url'));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return [];
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.scope !== 'facturio-sign-editor-v1' || !Number.isFinite(payload.expires) || payload.expires <= now || !Array.isArray(payload.ids) || payload.ids.length > 40) return [];
    return payload.ids.filter(id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(id));
  } catch { return []; }
}
function guestDraftCookie(ids, secret, now = Date.now()) {
  if (!secret) throw new Error('Signing secret is not configured');
  const payload = { scope: 'facturio-sign-editor-v1', ids: [...new Set(ids)].slice(-40), expires: now + 30 * 86400000 };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${data}.${createHmac('sha256', secret).update(data).digest('base64url')}`;
}
function canManageEnvelope(envelope, userId, ids) {
  return Boolean(envelope && ((userId && envelope.userId === userId) || (envelope.userId === GUEST_OWNER_ID && ids.includes(envelope.id))));
}
const { newSigningField, editSigningField } = require('./signing-fields.cjs');
function customerSignedFilter(userId, contactId, email, allowEmailMatch) {
  return { userId, status: 'SIGNED', OR: [{ contactId }, ...(allowEmailMatch && email ? [{ contactId: null, recipientEmail: email }] : [])] };
}
function flowError(code, status) { const error = new Error(code); error.status = status; return error; }
function esc(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
async function deliverSigningRequest({ client, envelope, recipientEmail = envelope.recipientEmail, env, fetchEmail = fetch, senderName = 'Facturio', replyTo, lang = 'en' }) {
  const { signingCopy } = require('./signing-copy.cjs');
  const t = key => signingCopy(lang, key);
  const email = String(recipientEmail || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw flowError('invalidEmail', 400);
  if (envelope.status !== 'DRAFT') throw flowError('notDraft', 409);
  let fields;
  try { fields = JSON.parse(envelope.fieldsJson); validateSigningFields(fields, envelope.pageCount); }
  catch { throw flowError('signatureRequired', 400); }
  if (!fields.some(field => field.type === 'signature')) throw flowError('signatureRequired', 400);
  const mode = signingDeliveryMode({ previewMode: env.STAGING_MODE, resendConfigured: Boolean(env.RESEND_API_KEY) });
  if (mode === 'unavailable') throw flowError('deliveryUnavailable', 503);
  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(Date.now() + 14 * 86400000);
  const signingUrl = `${(env.SIGNING_BASE_URL || 'https://sign.facturio.ch').replace(/\/$/, '')}/sign/${token}`;
  const claim = await client.signingEnvelope.updateMany({ where: { id: envelope.id, userId: envelope.userId, status: 'DRAFT', fieldsJson: envelope.fieldsJson }, data: { status: 'SENT', recipientEmail: email, tokenHash, expiresAt } });
  if (!claim.count) throw flowError('requestChanged', 409);
  if (mode === 'link-only') return { success: true, status: 'SENT', signingUrl, previewMode: true };
  try {
    const result = await fetchEmail('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `facturio-signing-${envelope.id}-${tokenHash.slice(0, 16)}` }, body: JSON.stringify({
      from: env.INVOICE_FROM_EMAIL || env.FROM_EMAIL || 'Facturio <emails@facturio.ch>', to: email, reply_to: replyTo || undefined,
      subject: `${t('request')}: ${envelope.title}`,
      html: `<div style="font-family:Arial,sans-serif;color:#17202a;max-width:600px;margin:auto"><h2>${esc(t('request'))}</h2><p>${esc(senderName)}</p><p><strong>${esc(envelope.title)}</strong></p><p>${esc(t('recipientInvitation'))}</p><p><a href="${esc(signingUrl)}" style="display:inline-block;background:#4f46e5;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">${esc(t('openSigning'))}</a></p></div>`,
    }) });
    if (!result.ok) throw new Error('Email delivery failed');
    const data = await result.json();
    return { success: true, status: 'SENT', signingUrl, emailId: data.id };
  } catch (error) {
    await client.signingEnvelope.updateMany({ where: { id: envelope.id, userId: envelope.userId, status: 'SENT', tokenHash }, data: { status: 'DRAFT', recipientEmail: envelope.recipientEmail, tokenHash: envelope.tokenHash || null, expiresAt: envelope.expiresAt || null } });
    throw flowError('sendFailed', 502);
  }
}
module.exports = { GUEST_OWNER_ID, GUEST_COOKIE, guestDraftIds, guestDraftCookie, canManageEnvelope, newSigningField, editSigningField, customerSignedFilter, deliverSigningRequest };
