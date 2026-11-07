/**
 * Generate a fresh demo dataset (customers + invoices) for nussbaumer@gmail.com
 * and emit SQL for Cloudflare D1 (run via `wrangler d1 execute --remote --file`).
 * Deterministic PRNG for reproducibility.
 */
const fs = require('fs');

const USER_ID = process.argv[2] || 'cmuppawx60000psp7c616vgzz'; // target user id
const OUT_FILE = process.argv[3] || '/data/cache/scratch/reseed-nussbaumer.sql';
const NOW = new Date().toISOString();

// --- deterministic PRNG (seeded per user so IDs don't collide across accounts) ---
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
let seed = (20261003 + hashStr(USER_ID)) % 2147483648;
function rnd() { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function randInt(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

function genId() {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  return 'cm' + Array.from({ length: 24 }, () => chars[randInt(0, 35)]).join('');
}

// --- dates ---
function randomDate(start, end) { return new Date(start.getTime() + rnd() * (end.getTime() - start.getTime())); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function iso(d) { return d.toISOString(); }
function chTs(d) { try { return new Date(d).toLocaleString('de-CH', { timeZone: 'Europe/Zurich', hour12: false }); } catch { return new Date(d).toISOString(); } }

// --- data pools ---
const swissCompanies = [
  'Zürich Finance AG', 'Bern Consulting GmbH', 'Geneva Tech Solutions', 'Basel Pharma Corp',
  'Lausanne Digital SA', 'Lucerne Manufacturing', 'St. Gallen Textiles', 'Winterthur Engineering',
  'Lugano Design Studio', 'Zug Crypto Services', 'Neuchâtel Watchmakers', 'Fribourg Agriculture SA',
  'Schaffhausen Industry', 'Thun Tourism GmbH', 'Sion Energy Solutions', 'Montreux Events AG',
  'Biel/Bienne Motors', 'Chur Mountain Sports', 'Aarau Construction SA', 'Solothurn Retail Group',
];
const cities = ['Zürich','Bern','Genève','Basel','Lausanne','Luzern','St. Gallen','Winterthur','Lugano','Zug','Neuchâtel','Fribourg','Schaffhausen','Thun','Sion','Montreux','Biel/Bienne','Chur','Aarau','Solothurn','Baden','Uster','Köniz','Yverdon','Rapperswil'];
const sectors = ['Consulting','Software','Digital','Industries','Retail','Logistics','Engineering','Healthcare','Media','Finance','Energy','Hospitality','Construction','Design','Automation'];
const suffix = ['AG','GmbH','SA','Sàrl','Holding AG'];
function synthCompany(idx) {
  return `${cities[idx % cities.length]} ${sectors[(idx * 7) % sectors.length]} ${suffix[(idx * 13) % suffix.length]}`;
}
function companyFor(idx) { return idx < swissCompanies.length ? swissCompanies[idx] : synthCompany(idx); }

const services = [
  { description: 'Consulting Services', base: 150 },
  { description: 'Software Development', base: 180 },
  { description: 'UI/UX Design', base: 120 },
  { description: 'Project Management', base: 140 },
  { description: 'Technical Support', base: 80 },
  { description: 'Training & Workshops', base: 100 },
  { description: 'Code Review', base: 90 },
  { description: 'Database Optimization', base: 130 },
  { description: 'Security Audit', base: 160 },
  { description: 'API Integration', base: 140 },
];
const units = ['hours', 'days', 'units', 'licenses'];

function genItems(count) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const s = pick(services);
    const quantity = randInt(1, 8);
    const unitPrice = Math.round((s.base + rnd() * 40 - 20) * 100) / 100;
    const lineTotal = Math.round(quantity * unitPrice * 100) / 100;
    items.push({ description: s.description, quantity, unit: pick(units), unitPrice, lineTotal });
  }
  return items;
}

// --- escape ---
function q(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }
function num(n) { return String(Math.round(n * 100) / 100); }

// --- build contacts ---
const CONTACT_COUNT = 80;
const contacts = [];
for (let i = 0; i < CONTACT_COUNT; i++) {
  const company = companyFor(i);
  const domain = company.toLowerCase().replace(/[^a-z0-9]+/g, '');
  contacts.push({
    id: genId(),
    company,
    email: `billing+${i}@${domain}.ch`,
    firstName: 'Finance',
    lastName: 'Department',
    street: `Bahnhofstrasse ${i + 1}`,
    zipCode: String(8000 + (i % 900)).padStart(4, '0'),
    place: ['Zürich','Bern','Genève','Basel','Lausanne'][i % 5],
    telephoneFix: `+41 ${randInt(21, 99)} ${randInt(100, 999)} ${randInt(10, 99)} ${randInt(10, 99)}`,
    mobile: `+41 79 ${randInt(100, 999)} ${randInt(10, 99)} ${randInt(10, 99)}`,
  });
}

// --- build invoices ---
const invoices = []; // {id, contactId, number, status, currency, taxPercent, totalTax, totalGross, issueDate, createdAt, sentAt, paidAt, dueDate, items}
let number = 1;

const now = new Date();
const startDate = new Date('2025-01-01');
const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
const nineMonthsAgo = addDays(now, -270);
const fourMonthsAgo = addDays(now, -120);
const thirtyDaysAgo = addDays(now, -30);

function iso11649(ref) {
  const clean = String(ref).toUpperCase().replace(/[^A-Z0-9]/g, '');
  let num = '';
  for (const ch of clean) {
    if (ch >= 'A' && ch <= 'Z') num += String(10 + ch.charCodeAt(0) - 65);
    else num += ch;
  }
  num += '2715'; // "RF" -> R=27, F=15
  num += '00';   // check-digit placeholder
  let rem = 0;
  for (const ch of num) rem = (rem * 10 + (ch.charCodeAt(0) - 48)) % 97;
  const check = String(98 - rem).padStart(2, '0');
  return `RF${check}${clean}`;
}

function makeInvoice(status, createdDate, extra) {
  const contact = pick(contacts);
  const items = genItems(randInt(1, 4));
  const currency = rnd() > 0.2 ? 'CHF' : 'EUR';
  const taxPercent = status === 'DRAFT' ? 0 : 8.1;
  let totalGross = 0, totalTax = 0;
  for (const it of items) {
    const tax = Math.round((it.lineTotal * taxPercent) / 100 * 100) / 100;
    totalGross = Math.round((totalGross + it.lineTotal + tax) * 100) / 100;
    totalTax = Math.round((totalTax + tax) * 100) / 100;
  }
  const sentAt = extra.sentAt;
  const dueDate = extra.dueDate;
  const paidAt = extra.paidAt;
  const invNumber = number++;
  invoices.push({
    id: genId(), contactId: contact.id, number: invNumber,
    status, currency, taxPercent, totalTax, totalGross,
    issueDate: createdDate, createdAt: createdDate, sentAt, paidAt, dueDate,
    reference: iso11649(String(invNumber).padStart(8, '0') + String(randInt(1000, 9999))),
    items: items.map(it => ({ ...it, currency })),
  });
}

// 30 PAID (paid over the last ~9 months) — realistic ~80% on-time / ~20% late
for (let i = 0; i < 30; i++) {
  const paidAt = randomDate(nineMonthsAgo, now);
  const onTime = rnd() > 0.20; // ~80% pay on time, ~20% late (past the 30-day term)
  const payDays = onTime ? randInt(1, 28) : randInt(31, 65);
  const sentAt = addDays(paidAt, -payDays);
  const issueDate = addDays(sentAt, -randInt(0, 3));
  makeInvoice('PAID', issueDate, { sentAt, paidAt, dueDate: addDays(sentAt, 30) });
}
// 5 SENT current month (open)
for (let i = 0; i < 5; i++) {
  const c = randomDate(currentMonth, now);
  const sent = addDays(c, randInt(0, 2));
  makeInvoice('SENT', c, { sentAt: sent, paidAt: null, dueDate: addDays(sent, 30) });
}
// 5 SENT overdue (1-4 months ago, 60+ days past due → populates the payment-delays leaderboard)
for (let i = 0; i < 5; i++) {
  const c = randomDate(fourMonthsAgo, twoMonthsAgo);
  const sent = addDays(c, randInt(0, 2));
  makeInvoice('SENT', c, { sentAt: sent, paidAt: null, dueDate: addDays(sent, 30) });
}
// 60 DRAFT (recent — last ~30 days, so they don't read as "overdue")
for (let i = 0; i < 60; i++) {
  const c = randomDate(thirtyDaysAgo, now);
  makeInvoice('DRAFT', c, { sentAt: null, paidAt: null, dueDate: null });
}

// --- change-log (ContactLog) lifecycle entries: created -> sent -> paid ---
const contactLogs = [];
for (const inv of invoices) {
  contactLogs.push({ id: genId(), contactId: inv.contactId, createdAt: inv.issueDate, message: `Invoice #${inv.number} created` });
  if ((inv.status === 'SENT' || inv.status === 'PAID') && inv.sentAt) {
    contactLogs.push({ id: genId(), contactId: inv.contactId, createdAt: inv.sentAt, message: `Invoice #${inv.number} marked as Sent` });
  }
  if (inv.status === 'PAID' && inv.paidAt) {
    contactLogs.push({ id: genId(), contactId: inv.contactId, createdAt: inv.paidAt, message: `Invoice #${inv.number} marked as Paid` });
  }
}

// --- emit SQL ---
const lines = [];
lines.push('-- ===== RESEED nussbaumer@gmail.com (fresh demo data) =====');
lines.push(`-- cleanup existing nussbaumer data`);
lines.push(`DELETE FROM InvoiceItem WHERE invoiceId IN (SELECT id FROM Invoice WHERE userId = ${q(USER_ID)});`);
lines.push(`DELETE FROM Invoice WHERE userId = ${q(USER_ID)};`);
lines.push(`DELETE FROM Expense WHERE userId = ${q(USER_ID)};`);
lines.push(`DELETE FROM ContactLog WHERE contactId IN (SELECT id FROM Contact WHERE userId = ${q(USER_ID)});`);
lines.push(`DELETE FROM Contact WHERE userId = ${q(USER_ID)};`);
lines.push('');

lines.push(`-- contacts (${contacts.length})`);
for (const c of contacts) {
  lines.push(`INSERT INTO Contact (id, userId, company, firstName, lastName, street, zipCode, place, email, telephoneFix, mobile, country, currency, updatedAt) VALUES (${q(c.id)}, ${q(USER_ID)}, ${q(c.company)}, ${q(c.firstName)}, ${q(c.lastName)}, ${q(c.street)}, ${q(c.zipCode)}, ${q(c.place)}, ${q(c.email)}, ${q(c.telephoneFix)}, ${q(c.mobile)}, 'CH', 'CHF', ${q(NOW)});`);
}
lines.push('');

lines.push(`-- invoices (${invoices.length})`);
for (const inv of invoices) {
  const cols = ['id','userId','contactId','number','status','currency','taxPercent','totalTax','totalGross','issueDate','createdAt','reference'];
  const vals = [q(inv.id), q(USER_ID), q(inv.contactId), num(inv.number), q(inv.status), q(inv.currency), num(inv.taxPercent), num(inv.totalTax), num(inv.totalGross), q(iso(inv.issueDate)), q(iso(inv.createdAt)), q(inv.reference)];
  if (inv.sentAt) { cols.push('sentAt'); vals.push(q(iso(inv.sentAt))); }
  if (inv.paidAt) { cols.push('paidAt'); vals.push(q(iso(inv.paidAt))); }
  if (inv.dueDate) { cols.push('dueDate'); vals.push(q(iso(inv.dueDate))); }
  cols.push('updatedAt'); vals.push(q(NOW));
  lines.push(`INSERT INTO Invoice (${cols.join(', ')}) VALUES (${vals.join(', ')});`);
}
lines.push('');

lines.push(`-- invoice items`);
for (const inv of invoices) {
  for (const it of inv.items) {
    lines.push(`INSERT INTO InvoiceItem (id, invoiceId, description, quantity, unit, unitPrice, currency, lineTotal) VALUES (${q(genId())}, ${q(inv.id)}, ${q(it.description)}, ${num(it.quantity)}, ${q(it.unit)}, ${num(it.unitPrice)}, ${q(it.currency)}, ${num(it.lineTotal)});`);
  }
}
lines.push('');

lines.push(`-- change log (ContactLog): created -> sent -> paid (${contactLogs.length})`);
for (const l of contactLogs) {
  lines.push(`INSERT INTO ContactLog (id, createdAt, contactId, message) VALUES (${q(l.id)}, ${q(iso(l.createdAt))}, ${q(l.contactId)}, ${q(l.message)});`);
}

const sql = lines.join('\n');
const out = OUT_FILE;
fs.writeFileSync(out, sql);

let totalItems = invoices.reduce((s, i) => s + i.items.length, 0);
console.log(`SQL written to ${out}`);
console.log(`  contacts: ${contacts.length}`);
console.log(`  invoices: ${invoices.length} (30 PAID, 10 SENT, 60 DRAFT)`);
console.log(`  items:    ${totalItems}`);
console.log(`  bytes:    ${Buffer.byteLength(sql)}`);
