const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

// Utility functions
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function choice(probTrue) { return Math.random() < probTrue; }
function sampleCurrency() { return Math.random() < 0.9 ? "CHF" : "EUR"; }
function round2(n) { return Math.round(n * 100) / 100; }

// Swiss names and company data
function swissName() {
  const first = ["Luca","Anna","Noah","Mia","Liam","Lea","Emma","Ben","Lina","Levi","Marco","Sofia","David","Sara","Tim","Julia","Leon","Laura","Jan","Nina","Max","Lisa","Tom","Elena","Sam","Zoe","Alex","Maya","Louis","Ava"];
  const last = ["Müller","Meier","Schneider","Fischer","Weber","Huber","Zimmermann","Keller","Baumann","Graf","Steiner","Lang","Schmid","Moser","Lehmann","Koch","Richter","Becker","Schulz","Hoffmann","Schäfer","Bauer","Hermann","Klein"];
  return `${rand(first)} ${rand(last)}`;
}

function companyName() {
  const bases = ["Alpenblick","Bergwerk","Seepark","Limmat","Aaretech","Zuger","BernSolutions","Rhone","Matter","Helvetic","SwissTech","AlpineCorp","Rheintal","Gotthard","Matterhorn","Jungfrau","Eiger","Emmental","Appenzell","Graubünden"];
  const suffix = rand(["AG","GmbH","SA","Sàrl"]);
  const uniq = String(randInt(1000, 99999));
  return `${rand(bases)} ${suffix} ${uniq}`;
}

function randomStreet() {
  const streets = ["Bahnhofstrasse","Hauptstrasse","Seestrasse","Kirchweg","Schulstrasse","Dorfstrasse","Werkstrasse","Wiesenweg","Gartenstrasse","Alpenstrasse","Bergstrasse","Waldweg","Poststrasse","Fabrikstrasse","Rathausplatz"];
  return `${rand(streets)} ${randInt(1,150)}`;
}

function randomZipPlace() {
  const locations = [
    { zip: "8001", place: "Zürich" },
    { zip: "8002", place: "Zürich" },
    { zip: "8003", place: "Zürich" },
    { zip: "3011", place: "Bern" },
    { zip: "3000", place: "Bern" },
    { zip: "4001", place: "Basel" },
    { zip: "4051", place: "Basel" },
    { zip: "6002", place: "Luzern" },
    { zip: "6300", place: "Zug" },
    { zip: "9000", place: "St. Gallen" },
    { zip: "9001", place: "St. Gallen" },
    { zip: "1201", place: "Genève" },
    { zip: "1700", place: "Fribourg" },
    { zip: "1820", place: "Montreux" },
    { zip: "7000", place: "Chur" },
    { zip: "2000", place: "Neuchâtel" },
    { zip: "5000", place: "Aarau" },
    { zip: "8400", place: "Winterthur" },
    { zip: "8500", place: "Frauenfeld" },
    { zip: "9500", place: "Wil" }
  ];
  return rand(locations);
}

function sampleTerms() {
  const r = Math.random();
  if (r < 0.70) return { kind: 'DAYS', days: 30 };
  if (r < 0.80) return { kind: 'DAYS', days: 10 };
  if (r < 0.90) return { kind: 'DAYS', days: 15 };
  if (r < 0.97) return { kind: 'DAYS', days: 90 };
  return { kind: 'SPECIFIC' };
}

function buildItemsFor(total, currency) {
  const items = [];
  let remaining = total;
  const n = randInt(1, 5);
  
  for (let i = 0; i < n; i++) {
    const last = i === n - 1;
    const portion = last ? remaining : round2(remaining * (0.15 + Math.random() * 0.4));
    remaining = round2(remaining - portion);
    
    const isService = choice(0.7);
    if (isService) {
      const serviceTypes = ["Consulting", "Development", "Design", "Support", "Training", "Analysis", "Implementation"];
      const hours = Math.max(0.25, round2(portion / randInt(80, 200)));
      const unitPrice = round2(portion / hours);
      items.push({ 
        description: `${rand(serviceTypes)} Services`, 
        quantity: hours, 
        unit: "h", 
        unitPrice, 
        currency 
      });
    } else {
      const productTypes = ["Software License", "Hardware", "Equipment", "Materials", "Components", "Tools"];
      const qty = randInt(1, 20);
      const unitPrice = round2(portion / qty);
      items.push({ 
        description: rand(productTypes), 
        quantity: qty, 
        unit: "pc", 
        unitPrice, 
        currency 
      });
    }
  }
  return items;
}

// Generate random date within a range
function randomDateBetween(start, end) {
  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = startTime + Math.random() * (endTime - startTime);
  return new Date(randomTime);
}

// Generate invoice statuses with realistic distribution
function generateInvoiceStatus(issueDate, now) {
  const daysSinceIssue = Math.floor((now - issueDate) / (1000 * 60 * 60 * 24));
  
  // More recent invoices are more likely to be unpaid
  if (daysSinceIssue < 30) {
    const r = Math.random();
    if (r < 0.60) return "PAID";
    if (r < 0.85) return "SENT";
    return "DRAFT";
  } else if (daysSinceIssue < 90) {
    const r = Math.random();
    if (r < 0.80) return "PAID";
    if (r < 0.95) return "SENT";
    return "DRAFT";
  } else {
    const r = Math.random();
    if (r < 0.90) return "PAID";
    if (r < 0.97) return "SENT";
    return "DRAFT";
  }
}

async function main() {
  console.log("🚀 Starting large dataset seeding...");
  
  const adminEmail = "nussbaumer@gmail.com";
  const admin = await prisma.user.findFirst({ where: { email: adminEmail } });
  if (!admin) throw new Error(`Admin user not found: ${adminEmail}`);
  const adminId = admin.id;

  // Clean existing data
  console.log("🧹 Cleaning existing data...");
  await prisma.invoiceItem.deleteMany({ where: { invoice: { userId: adminId } } });
  await prisma.invoice.deleteMany({ where: { userId: adminId } });
  await prisma.contact.deleteMany({ where: { userId: adminId } });

  // Ensure org profile exists
  let org = await prisma.orgProfile.findFirst({ where: { userId: adminId } });
  if (!org) {
    console.log("📋 Creating organization profile...");
    org = await prisma.orgProfile.create({
      data: {
        userId: adminId,
        company: "Facturio GmbH",
        street: "Bahnhofstrasse 42",
        zipCode: "8001",
        place: "Zürich",
        country: "CH",
        email: adminEmail,
        phone: "+41 44 123 45 67",
        iban: "CH93 0076 2011 6238 5295 7",
        currency: "CHF",
        defaultVat: 8.1
      }
    });
  }

  // Generate 1000 customers
  console.log("👥 Generating 1000 customers...");
  const customers = [];
  
  for (let i = 0; i < 1000; i++) {
    const isCompany = choice(0.65); // 65% companies, 35% individuals
    const { zip, place } = randomZipPlace();
    const currency = sampleCurrency();
    
    const data = {
      userId: adminId,
      email: `customer${i + 1}@${isCompany ? 'company' : 'personal'}.com`,
      street: randomStreet(),
      zipCode: zip,
      place,
      country: "CH",
      currency,
    };

    if (isCompany) {
      data.company = companyName();
    } else {
      const name = swissName();
      const [firstName, lastName] = name.split(' ');
      data.firstName = firstName;
      data.lastName = lastName;
    }

    // Add IBAN for some customers (40% chance)
    if (choice(0.4)) {
      const ibanSuffix = String(randInt(10000000, 99999999));
      data.iban = `CH93 0076 2011 ${ibanSuffix.substring(0,4)} ${ibanSuffix.substring(4)}`;
    }

    const customer = await prisma.contact.create({ data });
    customers.push(customer);
    
    if ((i + 1) % 100 === 0) {
      console.log(`   Created ${i + 1}/1000 customers...`);
    }
  }

  // Generate 30,000 invoices spread from Jan 1, 2024 to yesterday
  console.log("📄 Generating 30,000 invoices...");
  const startDate = new Date('2024-01-01');
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // Yesterday
  const now = new Date();

  // Calculate distribution across months
  const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1;
  const invoicesPerMonth = Math.floor(30000 / monthsDiff);
  const remainingInvoices = 30000 % monthsDiff;

  let totalCreated = 0;
  let invoiceNumber = 1;
  
  for (let month = 0; month < monthsDiff; month++) {
    const monthStart = new Date(startDate.getFullYear(), startDate.getMonth() + month, 1);
    const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + month + 1, 0);
    
    // Adjust for the last partial month
    if (monthEnd > endDate) {
      monthEnd.setTime(endDate.getTime());
    }

    let monthlyTarget = invoicesPerMonth;
    if (month < remainingInvoices) {
      monthlyTarget += 1;
    }

    for (let i = 0; i < monthlyTarget; i++) {
      const customer = rand(customers);
      const currency = customer.currency || sampleCurrency();
      const isCompany = !!customer.company;
      
      // Generate realistic amounts
      const minAmount = isCompany ? 200 : 50;
      const maxAmount = isCompany ? 50000 : 5000;
      const grossAmount = round2(minAmount + Math.random() * (maxAmount - minAmount));
      
      // Generate invoice date within the month
      const issueDate = randomDateBetween(monthStart, monthEnd);
      
      // Calculate due date based on payment terms
      const terms = sampleTerms();
      let dueDate;
      if (terms.kind === 'DAYS') {
        dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + terms.days);
      } else {
        // Specific date: 25th of issue month or 10th of next month
        const specific = new Date(issueDate.getFullYear(), issueDate.getMonth(), 25);
        dueDate = specific > issueDate ? specific : new Date(issueDate.getFullYear(), issueDate.getMonth() + 1, 10);
      }

      // Generate status and payment date
      const status = generateInvoiceStatus(issueDate, now);
      let paidAt = null;
      let sentAt = null;
      
      if (status === "SENT" || status === "PAID") {
        sentAt = new Date(issueDate);
        sentAt.setDate(sentAt.getDate() + randInt(0, 3)); // Sent within 3 days
      }
      
      if (status === "PAID") {
        const paymentDelay = Math.max(0, Math.min(60, Math.round(Math.random() * 45)));
        paidAt = new Date(sentAt || issueDate);
        paidAt.setDate(paidAt.getDate() + paymentDelay);
      }

      // Generate VAT (8.1% for most invoices)
      const taxPercent = choice(0.85) ? 8.1 : (choice(0.5) ? 2.6 : 0);
      const totalTax = round2(grossAmount * taxPercent / 100);
      const totalGross = round2(grossAmount + totalTax);

      // Generate line items
      const items = buildItemsFor(grossAmount, currency);
      
      const outputSize = rand(["A4_PORTRAIT_SHEET", "QR_BILL_ONLY", "QR_BILL_EXTRA_SPACE"]);

      try {
        const invoice = await prisma.invoice.create({
          data: {
            userId: adminId,
            contactId: customer.id,
            number: invoiceNumber++,
            currency,
            issueDate,
            dueDate,
            status,
            sentAt,
            paidAt,
            taxPercent,
            totalTax,
            totalGross,
            outputSize,
            reference: `INV-${String(invoiceNumber - 1).padStart(6, '0')}`,
            message: choice(0.3) ? "Thank you for your business!" : null,
            items: {
              create: items.map(item => ({
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                unitPrice: item.unitPrice,
                currency: item.currency,
                lineTotal: round2(item.quantity * item.unitPrice)
              }))
            }
          }
        });

        totalCreated++;
        
        if (totalCreated % 1000 === 0) {
          console.log(`   Created ${totalCreated}/30000 invoices...`);
        }
      } catch (error) {
        console.error(`Error creating invoice ${invoiceNumber - 1}:`, error.message);
      }
    }
    
    console.log(`   ✅ Completed ${monthStart.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })} - ${monthlyTarget} invoices`);
  }

  // Generate summary statistics
  const stats = await prisma.$transaction([
    prisma.contact.count({ where: { userId: adminId } }),
    prisma.invoice.count({ where: { userId: adminId } }),
    prisma.invoice.count({ where: { userId: adminId, status: "PAID" } }),
    prisma.invoice.count({ where: { userId: adminId, status: "SENT" } }),
    prisma.invoice.count({ where: { userId: adminId, status: "DRAFT" } }),
    prisma.invoice.aggregate({
      where: { userId: adminId, currency: "CHF" },
      _sum: { totalGross: true }
    }),
    prisma.invoice.aggregate({
      where: { userId: adminId, currency: "EUR" },
      _sum: { totalGross: true }
    })
  ]);

  console.log("\n📊 Seeding Complete!");
  console.log("═══════════════════");
  console.log(`👥 Customers: ${stats[0].toLocaleString()}`);
  console.log(`📄 Total Invoices: ${stats[1].toLocaleString()}`);
  console.log(`💰 Paid Invoices: ${stats[2].toLocaleString()}`);
  console.log(`📤 Sent Invoices: ${stats[3].toLocaleString()}`);
  console.log(`📝 Draft Invoices: ${stats[4].toLocaleString()}`);
  console.log(`💵 Total CHF: ${(stats[5]._sum.totalGross || 0).toLocaleString()} CHF`);
  console.log(`💶 Total EUR: ${(stats[6]._sum.totalGross || 0).toLocaleString()} EUR`);
  console.log("═══════════════════");
}

main()
  .catch(async (e) => {
    console.error("❌ Error:", e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });