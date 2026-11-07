const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

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

async function main() {
  const adminEmail = "nussbaumer@gmail.com";
  const admin = await prisma.user.findFirst({ where: { email: adminEmail } });
  if (!admin) throw new Error(`Admin user not found: ${adminEmail}`);
  const adminId = admin.id;
  
  console.log("🧹 Cleaning contacts/invoices for this user...");
  await prisma.invoiceItem.deleteMany({ where: { invoice: { userId: adminId } } });
  await prisma.invoice.deleteMany({ where: { userId: adminId } });
  await prisma.contact.deleteMany({ where: { userId: adminId } });
  
  console.log("🏗️  Creating 100 customers...");
  
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
  console.log(`✅ Created ${customers.length} customers`);

  const now = new Date();
  const allMonths = monthRange(2025,1, now.getFullYear(), now.getMonth()+1);

  console.log("🧾 Creating 300 invoices...");

  // Create invoices evenly across months
  const targetTotal = 300;
  const monthsCount = allMonths.length;
  const basePerMonth = Math.floor(targetTotal / monthsCount);
  let remainder = targetTotal - basePerMonth * monthsCount;
  let totalCreated = 0;

  // Ensure at least 10 late payers (PAID after due date)
  let latePaidRemaining = 10;
  let invoicesRemaining = targetTotal;

  for (let idx = 0; idx < allMonths.length; idx++) {
    const m = allMonths[idx];
    const monthCount = basePerMonth + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;

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

      // Status distribution: PAID ~80%, SENT ~15%, DRAFT ~4%, CANCELLED ~1%
      const r = Math.random();
      let status = 'PAID';
      if (r < 0.15) status = 'SENT'; else if (r < 0.19) status = 'DRAFT'; else if (r < 0.20) status = 'CANCELLED';

      // Determine paidAt; include late payers
      let paidAt = null;
      if (status === 'PAID') {
        const dueDays = Math.max(1, diffDays(dueDate, issueDate));
        // If we still need late payers and invoices are running out, force late
        const mustAssignLate = latePaidRemaining > 0 && latePaidRemaining >= invoicesRemaining - totalCreated;
        const makeLate = mustAssignLate || (latePaidRemaining > 0 && Math.random() < 0.05);
        if (makeLate) {
          // 1-30 days after due date
          paidAt = new Date(dueDate.getTime() + randInt(1, 30) * 86400000);
          latePaidRemaining--;
        } else {
          paidAt = new Date(issueDate.getTime() + randInt(1, dueDays) * 86400000);
        }
      }

      const outputSize = choice(0.5) ? "A4_PORTRAIT_SHEET" : "QR_BILL_ONLY";
      await prisma.invoice.create({
        data: {
          userId: adminId,
          contactId: contact.id,
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
        }
      });
      totalCreated++;
    }
  }

  console.log(`✅ Created ${totalCreated} invoices (late payers assigned: ${10 - latePaidRemaining})`);
  console.log("🎉 Database seeding completed successfully!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });