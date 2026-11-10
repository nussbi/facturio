const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { GUEST_OWNER_ID, guestDraftIds, guestDraftCookie, canManageEnvelope, newSigningField, editSigningField, customerSignedFilter, deliverSigningRequest } = require('./signing-flow.cjs');
const { validateSigningFields } = require('./signing-core.cjs');
const { rows, languages, signingCopy } = require('./signing-copy.cjs');
const secret = 'test-only-sign-editor-cookie-key';
const now = 1700000000000;
test('anonymous editor cookies are signed, scoped, time bounded and do not leak authority across guests', () => {
  const cookie = guestDraftCookie(['doc-a', 'doc-b'], secret, now);
  assert.deepEqual(guestDraftIds(cookie, secret, now), ['doc-a', 'doc-b']);
  assert.deepEqual(guestDraftIds(cookie, 'other-secret', now), []);
  assert.deepEqual(guestDraftIds(cookie + 'tampered', secret, now), []);
  assert.deepEqual(guestDraftIds(cookie, secret, now + 30 * 86400000), []);
  assert.deepEqual(guestDraftIds(cookie, '', now), []);
  assert.equal(canManageEnvelope({ id: 'doc-a', userId: GUEST_OWNER_ID }, null, ['doc-a']), true);
  assert.equal(canManageEnvelope({ id: 'doc-a', userId: GUEST_OWNER_ID }, null, ['doc-b']), false);
  assert.equal(canManageEnvelope({ id: 'doc-a', userId: 'issuer' }, null, ['doc-a']), false);
  assert.equal(canManageEnvelope({ id: 'doc-a', userId: 'issuer' }, 'issuer', []), true);
  assert.equal(canManageEnvelope({ id: 'doc-a', userId: 'issuer' }, 'other-issuer', []), false);
});
test('guest cookie limits protect cookie size while retaining newest drafts', () => {
  const cookie = guestDraftCookie(Array.from({ length: 100 }, (_, i) => `document-${i}`), secret, now);
  const ids = guestDraftIds(cookie, secret, now); assert.equal(ids.length, 40); assert.equal(ids[39], 'document-99'); assert.ok(cookie.length < 4000);
});
test('signature fields are larger and movement/resizing stays within PDF page bounds', () => {
  for (const type of ['signature', 'initials', 'date']) {
    for (const x of [0, 0.5, 1]) for (const y of [0, 0.5, 1]) {
      const field = newSigningField(type, 2, x, y, 'field123'); validateSigningFields([field], 2);
      for (const mode of ['move', 'resize']) for (const delta of [-5, 5]) validateSigningFields([editSigningField(field, mode, delta, delta)], 2);
    }
  }
  const signature = newSigningField('signature', 1, 0.5, 0.5, 'signature');
  assert.ok(signature.width > 0.30 && signature.height > 0.095);
  validateSigningFields([editSigningField({ ...signature, x: 0.99, y: 0.99, width: 0.01, height: 0.01 }, 'resize', 2, 2)], 1);
});
test('every signing UI string has EN/DE/FR/IT translations and matching placeholders', () => {
  for (const [key, values] of Object.entries(rows)) {
    assert.equal(values.length, 4, key);
    const placeholders = value => [...value.matchAll(/\{([A-Za-z]+)\}/g)].map(match => match[1]).sort();
    for (const value of values) { assert.equal(typeof value, 'string'); assert.ok(value.trim(), key); assert.deepEqual(placeholders(value), placeholders(values[0]), key); }
    for (const lang of languages) assert.notEqual(signingCopy(lang, key), key);
  }
  assert.equal(signingCopy('de', 'pageOf', { page: 2, count: 3 }), 'Seite 2 von 3');
});
const envelope = { id: 'draft123', userId: 'issuer', status: 'DRAFT', pageCount: 2, recipientEmail: '', fieldsJson: JSON.stringify([newSigningField('signature', 2, 0.5, 0.5, 'field123')]), title: 'Contract <test>', tokenHash: null, expiresAt: null };
function db(claim = 1) { const updates = []; return { updates, signingEnvelope: { async updateMany(query) { updates.push(query); return { count: claim }; } } }; }
test('standalone sending accepts recipientEmail, claims the draft and actually invokes email delivery', async () => {
  const client = db(); let calls = 0;
  const result = await deliverSigningRequest({ client, envelope, recipientEmail: 'customer@example.org', env: { RESEND_API_KEY: 'test-key', SIGNING_BASE_URL: 'https://sign.facturio.ch' }, lang: 'de', async fetchEmail(url, options) { calls++; assert.equal(url, 'https://api.resend.com/emails'); const body = JSON.parse(options.body); assert.equal(body.to, 'customer@example.org'); assert.ok(body.html.includes('Contract &lt;test&gt;')); assert.ok(body.subject.startsWith('Unterschriftsanfrage')); return { ok: true, async json() { return { id: 'email123' }; } }; } });
  assert.equal(calls, 1); assert.equal(result.status, 'SENT'); assert.ok(result.signingUrl.includes('/sign/')); assert.equal(result.emailId, 'email123'); assert.equal(client.updates[0].data.recipientEmail, 'customer@example.org'); assert.equal(client.updates[0].where.fieldsJson, envelope.fieldsJson);
});
test('staging sends return a working signing link without emailing', async () => {
  const result = await deliverSigningRequest({ client: db(), envelope, recipientEmail: 'customer@example.org', env: { STAGING_MODE: '1', RESEND_API_KEY: 'test-key' }, async fetchEmail() { assert.fail('No email in staging'); } });
  assert.equal(result.previewMode, true); assert.ok(result.signingUrl);
});
test('email failure restores the draft and previous recipient/token for safe retries', async () => {
  const client = db();
  await assert.rejects(deliverSigningRequest({ client, envelope, recipientEmail: 'customer@example.org', env: { RESEND_API_KEY: 'test-key' }, async fetchEmail() { return { ok: false }; } }), error => error.status === 502 && error.message === 'sendFailed');
  assert.equal(client.updates.length, 2); assert.equal(client.updates[1].data.status, 'DRAFT'); assert.equal(client.updates[1].data.recipientEmail, envelope.recipientEmail); assert.equal(client.updates[1].where.tokenHash, client.updates[0].data.tokenHash);
});
test('validation and delivery configuration failures never claim a document', async () => {
  for (const options of [{ recipientEmail: 'bad-email', env: { RESEND_API_KEY: 'x' } }, { recipientEmail: 'customer@example.org', env: {} }, { recipientEmail: 'customer@example.org', envelope: { ...envelope, fieldsJson: '[]' }, env: { RESEND_API_KEY: 'x' } }, { recipientEmail: 'customer@example.org', envelope: { ...envelope, status: 'SIGNED' }, env: { RESEND_API_KEY: 'x' } }]) {
    const client = db(); await assert.rejects(deliverSigningRequest({ client, envelope, ...options })); assert.equal(client.updates.length, 0);
  }
});
test('concurrent sends do not deliver emails when claiming the draft fails', async () => {
  await assert.rejects(deliverSigningRequest({ client: db(0), envelope, recipientEmail: 'customer@example.org', env: { RESEND_API_KEY: 'x' }, async fetchEmail() { assert.fail('No duplicate delivery'); } }), error => error.status === 409);
});
test('customer signed-document queries enforce owner, status and unambiguous linkage', () => {
  assert.deepEqual(customerSignedFilter('issuer', 'contact', 'customer@example.org', true), { userId: 'issuer', status: 'SIGNED', OR: [{ contactId: 'contact' }, { contactId: null, recipientEmail: 'customer@example.org' }] });
  assert.deepEqual(customerSignedFilter('issuer', 'contact', 'customer@example.org', false).OR, [{ contactId: 'contact' }]);
});
test('standalone flow connects valid editor/save/send routes and invites guests after completion', () => {
  const root = path.join(__dirname, '..'); const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  assert.ok(read('middleware.ts').includes('pathname.startsWith("/api/send/")'));
  assert.ok(read('components/StandaloneEditor.tsx').includes('method: "PUT"'));
  assert.ok(read('components/StandaloneEditor.tsx').includes('JSON.stringify({ fields })'));
  assert.ok(read('components/StandaloneSend.tsx').includes('recipientEmail: email.trim()'));
  assert.ok(read('components/StandaloneSend.tsx').includes('sent && guest'));
  assert.ok(read('components/StandaloneSend.tsx').includes('/login?mode=signup'));
  assert.ok(read('app/send/[id]/page.tsx').includes('await params'));
  assert.ok(read('components/AppFrame.tsx').includes('max-w-[1600px]'));
});
test('PDF field geometry remains browser-safe and does not load server signing logic', () => {
  const geometry = fs.readFileSync(path.join(__dirname, 'signing-fields.cjs'), 'utf8');
  const canvas = fs.readFileSync(path.join(__dirname, '../components/PdfDocumentCanvas.tsx'), 'utf8');
  assert.ok(canvas.includes('@/lib/signing-fields.cjs'));
  assert.ok(!canvas.includes('@/lib/signing-flow.cjs'));
  assert.ok(!/node:crypto|Buffer|require\(/.test(geometry));
});
test('guest sender addresses become Reply-To while From stays the verified Facturio address', async () => {
  const client = db(); let body;
  await deliverSigningRequest({ client, envelope, recipientEmail: 'recipient@example.org', replyTo: ' Sender+Signing@Example.org ', requireSenderEmail: true, env: { RESEND_API_KEY: 'test-only', FROM_EMAIL: 'Facturio <emails@facturio.ch>' }, async fetchEmail(_url, options) { body = JSON.parse(options.body); return { ok: true, async json() { return { id: 'guest-sender-test' }; } }; } });
  assert.equal(body.reply_to, 'sender+signing@example.org');
  assert.equal(body.from, 'Facturio <emails@facturio.ch>');
  assert.ok(body.html.includes('Reply to the sender: sender+signing@example.org'));
});
test('missing, malformed and header-injection guest sender addresses never claim or email a draft', async () => {
  for (const replyTo of [undefined, '', ' ', 'not-an-email', 'sender@example.org\r\nBcc: victim@example.org', 'Sender <sender@example.org>', ['sender@example.org'], 'a..b@example.org', '.sender@example.org', 'sender@invalid_domain.org']) {
    const client = db();
    await assert.rejects(deliverSigningRequest({ client, envelope, replyTo, requireSenderEmail: true, env: { STAGING_MODE: '1' }, async fetchEmail() { assert.fail('Must not send invalid sender'); } }), error => error.status === 400 && error.message === 'invalidSenderEmail');
    assert.equal(client.updates.length, 0);
  }
});
test('sender reply information is translated in every supported email language', async () => {
  for (const lang of languages) {
    let body;
    await deliverSigningRequest({ client: db(), envelope, recipientEmail: 'recipient@example.org', replyTo: 'sender@example.org', requireSenderEmail: true, lang, env: { RESEND_API_KEY: 'test-only' }, async fetchEmail(_url, options) { body = JSON.parse(options.body); return { ok: true, async json() { return { id: 'localized-sender-test' }; } }; } });
    assert.ok(body.html.includes(signingCopy(lang, 'replyToLine', { email: 'sender@example.org' })));
    assert.equal(body.reply_to, 'sender@example.org');
  }
});
test('guest form and route require sender email while authenticated senders use their account details', () => {
  const ui = fs.readFileSync(path.join(__dirname, '../components/StandaloneSend.tsx'), 'utf8');
  const route = fs.readFileSync(path.join(__dirname, '../app/api/send/[id]/route.ts'), 'utf8');
  assert.ok(ui.includes('name="senderEmail" type="email" autoComplete="email" required'));
  assert.ok(ui.includes('senderEmail: senderEmail.trim()'));
  assert.ok(route.includes('requireSenderEmail: !user'));
  assert.ok(route.includes('user ? company?.email || user.email : senderEmail'));
});
