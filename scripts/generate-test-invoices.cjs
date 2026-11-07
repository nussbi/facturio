const { PrismaClient } = require("../src/generated/prisma");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

const DOCS_DIR = path.join(process.cwd(), "documents");

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const e of fs.readdirSync(p)) rmrf(path.join(p, e));
    fs.rmdirSync(p);
  } else {
    fs.unlinkSync(p);
  }
}

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function choice(probTrue) { return Math.random() < probTrue; }
function sampleCurrency() { return Math.random() < 0.9 ? "CHF" : "EUR"; }
function sampleTerms() {
  // 80% 30 days, some 10, 15, 90 and a small share specific date
  const r = Math.random();
  if (r < 0.80) return { kind: 'DAYS', days: 30 };
  if (r < 0.87) return { kind: 'DAYS', days: 10 };
  if (r < 0.94) return { kind: 'DAYS', days: 15 };
  if (r < 0.99) return { kind: 'DAYS', days: 90 };
  return { kind: 'SPECIFIC' };
}
function swissName() {
  const first = ["Luca","Anna","Noah","Mia","Liam","Lea","Emma","Ben","Lina","Levi"]; 
  const last = ["Müller","Meier","Schneider","Fischer","Weber","Huber","Zimmermann","Keller","Baumann","Graf"];
  return `${rand(first)} ${rand(last)}`;
}
function companyName() {
  const bases = ["Alpenblick","Bergwerk","Seepark","Limmat","Aaretech","Zuger","BernSolutions","Rhone","Matter","Helvetic"];
  const suffix = rand(["AG","GmbH"]);
  // add a random numeric suffix to avoid duplicate company names against unique lower(company)
  const uniq = String(randInt(1, 99999)).padStart(5, '0');
  return `${rand(bases)} ${suffix} #${uniq}`;
}
function randomStreet() {
  const streets = ["Bahnhofstrasse","Hauptstrasse","Seestrasse","Kirchweg","Schulstrasse","Dorfstrasse","Werkstrasse","Wiesenweg","Gartenstrasse","Alpenstrasse"];
  return `${rand(streets)} ${randInt(1,120)}`;
}
function randomZipPlace() {
  const zips = ["8001","8002","8003","3011","4001","6002","9000","4051","1700","1201","9001","3000","6300","1820","7000"];
  const places = ["Zürich","Bern","Basel","Luzern","St. Gallen","Genève","Fribourg","Lausanne","Zug","Vevey","Chur"];
  return { zip: rand(zips), place: rand(places) };
}

function round2(n) { return Math.round(n * 100) / 100; }
function diffDays(a, b) { return Math.floor((a.getTime() - b.getTime()) / 86400000); }

async function ensureDocs(reset=false) {
  if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
  const invDir = path.join(DOCS_DIR, "invoices");
  if (reset && fs.existsSync(invDir)) rmrf(invDir);
  if (!fs.existsSync(invDir)) fs.mkdirSync(invDir, { recursive: true });
  return invDir;
}

async function getOrg(adminId) {
  const org = await prisma.orgProfile.findFirst({ where: { userId: adminId } });
  if (!org) throw new Error("OrgProfile missing for admin. Configure org with IBAN before generating.");
  return org;
}

function monthRange(startYear, startMonth, endYear, endMonth) {
  const res = [];
  const start = new Date(startYear, startMonth-1, 1);
  const end = new Date(endYear, endMonth-1, 1);
  let d = new Date(start);
  while (d <= end) {
    res.push({ year: d.getFullYear(), month: d.getMonth()+1 });
    d.setMonth(d.getMonth()+1);
  }
  return res;
}

function buildItemsFor(total, currency) {
  // Build 1-4 items mixing goods/services
  const items = [];
  let remaining = total;
  const n = randInt(1, 4);
  for (let i=0; i<n; i++) {
    const last = i === n-1;
    const portion = last ? remaining : round2(remaining * (0.2 + Math.random()*0.5));
    remaining = round2(remaining - portion);
    const isService = choice(0.6);
    if (isService) {
      const hours = Math.max(0.5, round2(portion / randInt(80, 160)));
      const unitPrice = round2(portion / hours);
      items.push({ description: "Services", quantity: hours, unit: "h", unitPrice, currency });
    } else {
      const qty = randInt(1, 10);
      const unitPrice = round2(portion / qty);
      items.push({ description: "Goods", quantity: qty, unit: "pc", unitPrice, currency });
    }
  }
  return items;
}

async function generateAssetForInvoiceViaApi(inv, outputSize, graphicsFormat) {
  const base = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const payload = {
    invoiceId: inv.id,
    graphicsFormat,
    outputSize,
    resolution: 300,
    language: "EN",
  };
  const url = `${base.replace(/\/$/, "")}/api/qrbill`;
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`QR gen failed ${res.status}`);
  const json = await res.json();
  return json.result || {}; // { svg, pdfBase64 }
}

async function generateAssetDirect(inv, outputSize, graphicsFormat) {
  // Direct server-side generation using swissqrbill and pdfkit (more robust during seeding)
  const { SwissQRBill } = await import("swissqrbill/pdf");
  const PDFDocument = (await import("pdfkit")).default;

  const creditor = inv.contact && inv.contact.userOrg ? inv.contact.userOrg : null;
  const currency = inv.currency;

  // Build swissqrbill data from fields we have on invoice and contact
  const data = {
    currency,
    amount: Number((inv.totalGross ?? 0).toFixed(2)),
    creditor: {
      name: inv.orgCompany || "",
      address: inv.orgStreet || "",
      zip: parseInt(inv.orgZipCode || "0") || 0,
      city: inv.orgPlace || "",
      account: inv.orgIban || "",
      country: inv.orgCountry || "CH",
    },
    debtor: inv.contact ? {
      name: inv.contact.company || `${inv.contact.firstName ?? ""} ${inv.contact.lastName ?? ""}`.trim(),
      address: inv.contact.street || "",
      zip: parseInt(inv.contact.zipCode || "0") || 0,
      city: inv.contact.place || "",
      country: inv.contact.country || "CH",
    } : undefined,
    message: inv.message || undefined,
  };

  if (graphicsFormat === "SVG") {
    const { SwissQRBill: SwissQRBillSVG } = await import("swissqrbill/svg");
    const qr = new SwissQRBillSVG(data);
    return { svg: qr.toString() };
  }

  // PDF
  const pdf = new PDFDocument({ size: "A4" });
  const qr = new SwissQRBill(data);
  const chunks = [];
  pdf.on("data", (c) => chunks.push(c));
  pdf.on("error", (e) => { throw e; });
  pdf.on("end", () => {});
  qr.attachTo(pdf);
  pdf.end();
  const buf = await new Promise((resolve, reject) => {
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
  });
  return { pdfBase64: Buffer.from(buf).toString("base64") };
}

function invCodeFromNumber(n, fallbackId) {
  if (Number.isFinite(n) && n >= 0) {
    const s = String(n).padStart(9, '0');
    return `${s.slice(0,3)}-${s.slice(3,6)}-${s.slice(6,9)}`;
  }
  // Fallback: simple hash of id to 9 digits
  let h = 0;
  for (let i = 0; i < String(fallbackId).length; i++) {
    h = ((h << 5) - h) + String(fallbackId).charCodeAt(i);
    h |= 0;
  }
  const num = Math.abs(h) % 1_000_000_000;
  const s = String(num).padStart(9, '0');
  return `${s.slice(0,3)}-${s.slice(3,6)}-${s.slice(6,9)}`;
}

async function writeAssets(inv, invDir, outputSize) {
  const userDir = path.join(invDir, inv.userId);
  if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
  const code = invCodeFromNumber(inv.number, inv.id);
  const base = path.join(userDir, `inv${code}`);
  // Prefer direct generation; fall back to API
  try {
    const svgRes = await generateAssetDirect(inv, outputSize, "SVG");
    if (svgRes.svg) fs.writeFileSync(`${base}.svg`, svgRes.svg, "utf-8");
  } catch {}
  try {
    const pdfRes = await generateAssetDirect(inv, outputSize, "PDF");
    if (pdfRes.pdfBase64) fs.writeFileSync(`${base}.pdf`, Buffer.from(pdfRes.pdfBase64, "base64"));
  } catch {
    const pdfRes = await generateAssetForInvoiceViaApi(inv, outputSize, "PDF");
    if (pdfRes.pdfBase64) fs.writeFileSync(`${base}.pdf`, Buffer.from(pdfRes.pdfBase64, "base64"));
  }
}

async function main() {
  const adminEmail = "nussbaumer@gmail.com";
  const admin = await prisma.user.findFirst({ where: { email: adminEmail } });
  if (!admin) throw new Error(`Admin user not found: ${adminEmail}`);
  const adminId = admin.id;
  // Purge existing invoices, items, and contacts for a clean re-seed
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.contact.deleteMany({ where: { userId: adminId } });

  const invDir = await ensureDocs(true);
  const org = await getOrg(adminId);

  // Create fresh customers
  const need = 100;
  for (let i=0; i<need; i++) {
    const isCompany = choice(0.6);
    const { zip, place } = randomZipPlace();
    const data = {
      email: `customer${Date.now()}_${i}@example.com`,
      street: randomStreet(),
      zipCode: zip,
      place,
      country: "CH",
      currency: "CHF",
    };
    if (isCompany) data.company = companyName(); else {
      const nm = swissName();
      data.firstName = nm.split(" ")[0];
      data.lastName = nm.split(" ")[1];
    }
    await prisma.contact.create({ data: { ...data, userId: adminId } });
  }
  const customers = await prisma.contact.findMany({ where: { userId: adminId } });

  const now = new Date();
  const allMonths = monthRange(2025,1, now.getFullYear(), now.getMonth()+1);

  // Create invoices evenly across months
  const targetTotal = 300;
  const monthsCount = allMonths.length;
  const basePerMonth = Math.floor(targetTotal / monthsCount);
  let remainder = targetTotal - basePerMonth * monthsCount;

  let nextNumber = 1;

  for (let idx = 0; idx < allMonths.length; idx++) {
    const m = allMonths[idx];
    const monthCount = basePerMonth + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;

    const neverPaidTarget = Math.round(monthCount * 0.05);
    let neverPaidAssigned = 0;

    for (let i = 0; i < monthCount; i++) {
      const contact = rand(customers);
      const currency = sampleCurrency();
      const isCompany = !!contact.company;
      const min = isCompany ? 100 : 100; // both minimum 100
      const max = isCompany ? 25000 : 1500;
      const gross = round2(min + Math.random()*(max-min));
      const items = buildItemsFor(gross, currency);
      const issueDate = new Date(m.year, m.month-1, randInt(1, 28));
      const terms = sampleTerms();
      let dueDate;
      if (terms.kind === 'DAYS') {
        dueDate = new Date(issueDate); dueDate.setDate(dueDate.getDate() + terms.days);
      } else {
        // specific: choose 25th of the issue month if in future, else 10th of next month
        const s = new Date(issueDate.getFullYear(), issueDate.getMonth(), 25);
        dueDate = s > issueDate ? s : new Date(issueDate.getFullYear(), issueDate.getMonth()+1, 10);
      }
      const assignNever = neverPaidAssigned < neverPaidTarget && Math.random() < 0.05;
      const status = assignNever ? "SENT" : "PAID";
      if (assignNever) neverPaidAssigned++;
      const dueDaysForPaid = Math.max(1, diffDays(dueDate, issueDate));
      const paidAt = status === "PAID" ? new Date(issueDate.getTime() + randInt(1, dueDaysForPaid) * 86400000) : null;

      const outputSize = choice(0.5) ? "A4_PORTRAIT_SHEET" : "QR_BILL_ONLY";
      const inv = await prisma.invoice.create({
        data: {
          userId: adminId,
          contactId: contact.id,
          number: nextNumber++,
          currency,
          issueDate,
          dueDate,
          status,
          paidAt,
          totalGross: gross,
          totalTax: 0,
          outputSize,
          items: {
            create: items.map(it => ({ description: it.description, quantity: it.quantity, unit: it.unit, unitPrice: it.unitPrice, currency }))
          }
        },
        include: { contact: true, items: true }
      });

      // Enrich invoice with Org data for direct generator
      const org = await getOrg(adminId);
      inv.orgCompany = org.company;
      inv.orgStreet = org.street;
      inv.orgZipCode = org.zipCode;
      inv.orgPlace = org.place;
      inv.orgCountry = org.country;
      inv.orgIban = org.iban;

      await writeAssets(inv, invDir, outputSize);
    }
  }

  // Compute folder size
  let totalBytes = 0;
  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p); else totalBytes += fs.statSync(p).size;
    }
  }
  walk(DOCS_DIR);
  console.log(JSON.stringify({ documentsDir: DOCS_DIR, sizeBytes: totalBytes }));
}

main().then(()=>prisma.$disconnect()).catch(async (e)=>{console.error(e); await prisma.$disconnect(); process.exit(1);});

