/**
 * Seed 100 invoices for nussbaumer@gmail.com user
 * Target distribution:
 * - 30 PAID invoices (from early 2025 to now)
 * - 5 SENT invoices (current month, open)
 * - 5 SENT invoices (late/overdue from earlier in 2025)
 * - Remaining up to 100 as DRAFT with small amounts
 */

const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

// Helper to generate random date between two dates
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper to add days to a date
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Swiss company names for variety (base list)
const swissCompanies = [
  'Zürich Finance AG',
  'Bern Consulting GmbH',
  'Geneva Tech Solutions',
  'Basel Pharma Corp',
  'Lausanne Digital SA',
  'Lucerne Manufacturing',
  'St. Gallen Textiles',
  'Winterthur Engineering',
  'Lugano Design Studio',
  'Zug Crypto Services',
  'Neuchâtel Watchmakers',
  'Fribourg Agriculture SA',
  'Schaffhausen Industry',
  'Thun Tourism GmbH',
  'Sion Energy Solutions',
  'Montreux Events AG',
  'Biel/Bienne Motors',
  'Chur Mountain Sports',
  'Aarau Construction SA',
  'Solothurn Retail Group',
];

function synthCompany(idx) {
  const cities = ['Zürich','Bern','Genève','Basel','Lausanne','Luzern','St. Gallen','Winterthur','Lugano','Zug','Neuchâtel','Fribourg','Schaffhausen','Thun','Sion','Montreux','Biel/Bienne','Chur','Aarau','Solothurn','Baden','Uster','Köniz','Yverdon','Rapperswil'];
  const sectors = ['Consulting','Software','Digital','Industries','Retail','Logistics','Engineering','Healthcare','Media','Finance','Energy','Hospitality','Construction','Design','Automation'];
  const suffix = ['AG','GmbH','SA','Sàrl','Holding AG'];
  const city = cities[idx % cities.length];
  const sector = sectors[(idx * 7) % sectors.length];
  const suf = suffix[(idx * 13) % suffix.length];
  return `${city} ${sector} ${suf}`;
}

async function ensureContacts(userId, minCount = 80) {
  let contacts = await prisma.contact.findMany({ where: { userId } });
  if (contacts.length >= minCount) return contacts;
  const need = minCount - contacts.length;
  console.log(`📇 Creating ${need} additional contacts to reach ${minCount}...`);
  const created = [];
  for (let i = 0; i < need; i++) {
    const idx = contacts.length + i;
    const company = idx < swissCompanies.length ? swissCompanies[idx] : synthCompany(idx);
    const email = `billing+${idx}@${company.toLowerCase().replace(/[^a-z0-9]+/g,'')}.ch`;
    const c = await prisma.contact.create({
      data: {
        userId,
        company,
        email,
        firstName: 'Finance',
        lastName: 'Department',
        street: `Bahnhofstrasse ${idx + 1}`,
        zipCode: String(8000 + (idx % 900)).padStart(4, '0'),
        place: ['Zürich', 'Bern', 'Geneva', 'Basel', 'Lausanne'][idx % 5],
        country: 'CH',
      }
    });
    created.push(c);
  }
  contacts = contacts.concat(created);
  console.log(`✅ Contacts ready: ${contacts.length}`);
  return contacts;
}

// Generate invoice items
function generateInvoiceItems(count = 3) {
  const items = [];
  const services = [
    { description: 'Consulting Services', basePrice: 150 },
    { description: 'Software Development', basePrice: 180 },
    { description: 'UI/UX Design', basePrice: 120 },
    { description: 'Project Management', basePrice: 140 },
    { description: 'Technical Support', basePrice: 80 },
    { description: 'Training & Workshops', basePrice: 100 },
    { description: 'Code Review', basePrice: 90 },
    { description: 'Database Optimization', basePrice: 130 },
    { description: 'Security Audit', basePrice: 160 },
    { description: 'API Integration', basePrice: 140 },
  ];

  const units = ['hours', 'days', 'units', 'licenses'];

  for (let i = 0; i < count; i++) {
    const service = services[Math.floor(Math.random() * services.length)];
    const quantity = Math.floor(Math.random() * 8) + 1; // 1-8 units (hours/days)
    const unitPrice = service.basePrice + (Math.random() * 40 - 20); // ±20 variation
    const unit = units[Math.floor(Math.random() * units.length)];
    const lineTotal = quantity * unitPrice;
    
    items.push({
      description: service.description,
      quantity,
      unit,
      unitPrice,
      lineTotal,
    });
  }
  
  return items;
}

async function main() {
  console.log('🌱 Seeding invoices for nussbaumer@gmail.com...\n');

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email: 'nussbaumer@gmail.com' },
  });

  if (!user) {
    console.error('❌ User nussbaumer@gmail.com not found!');
    console.log('Please create this user first or run seed-strongwinds.cjs');
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.email} (${user.id})\n`);

  // Ensure at least 80 contacts exist
  let contacts = await ensureContacts(user.id, 80);
  console.log(`✅ Using ${contacts.length} contacts\n`);

  // Get current invoice count
  const existingCount = await prisma.invoice.count({
    where: { userId: user.id },
  });

  console.log(`📊 Current invoice count: ${existingCount}`);
  console.log('🎯 Generating 100 new invoices...\n');

  // Date ranges
  const startDate = new Date('2025-01-01');
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  let created = 0;
  let paidCount = 0;
  let currentMonthCount = 0;
  let lateCount = 0;
  let draftCount = 0;

  // Generate ~30 PAID invoices (from Jan 2025 to now) to target ~50k/year
  console.log('💰 Creating 30 PAID invoices...');
  for (let i = 0; i < 30; i++) {
    const contact = contacts[Math.floor(Math.random() * contacts.length)];
    const createdAt = randomDate(startDate, now);
    const sentAt = addDays(createdAt, Math.floor(Math.random() * 3)); // Sent 0-3 days after creation
    const paidAt = addDays(sentAt, Math.floor(Math.random() * 30) + 1); // Paid 1-30 days after sent
    
    const itemsData = generateInvoiceItems(Math.floor(Math.random() * 4) + 1);
    const currency = Math.random() > 0.2 ? 'CHF' : 'EUR'; // 80% CHF, 20% EUR
    
    // Calculate totals
    let totalGross = 0;
    let totalTax = 0;
    const taxPercent = 8.1;
    
    itemsData.forEach(item => {
      const itemTotal = item.lineTotal;
      const itemTax = (itemTotal * taxPercent) / 100;
      totalGross += itemTotal + itemTax;
      totalTax += itemTax;
    });

    const invoice = await prisma.invoice.create({
      data: {
        userId: user.id,
        contactId: contact.id,
        number: existingCount + created + 1,
        status: 'PAID',
        currency,
        taxPercent,
        totalTax,
        totalGross,
        issueDate: createdAt,
        createdAt,
        sentAt,
        paidAt,
        dueDate: addDays(sentAt, 30),
        items: {
          create: itemsData.map(item => ({
            ...item,
            currency,
          })),
        },
      },
    });

    created++;
  paidCount++;
    
    if (created % 10 === 0) {
      console.log(`  ✓ Created ${created}/100 invoices...`);
    }
  }

  // Generate 5 SENT invoices for current month (not yet paid)
  console.log('📮 Creating 5 SENT invoices (current month, open)...');
  for (let i = 0; i < 5; i++) {
    const contact = contacts[Math.floor(Math.random() * contacts.length)];
    const createdAt = randomDate(currentMonth, now);
    const sentAt = addDays(createdAt, Math.floor(Math.random() * 2));
    const dueDate = addDays(sentAt, 30);
    
    const itemsData = generateInvoiceItems(Math.floor(Math.random() * 4) + 1);
    const currency = Math.random() > 0.2 ? 'CHF' : 'EUR';
    
    // Calculate totals
    let totalGross = 0;
    let totalTax = 0;
    const taxPercent = 8.1;
    
    itemsData.forEach(item => {
      const itemTotal = item.lineTotal;
      const itemTax = (itemTotal * taxPercent) / 100;
      totalGross += itemTotal + itemTax;
      totalTax += itemTax;
    });

    await prisma.invoice.create({
      data: {
        userId: user.id,
        contactId: contact.id,
        number: existingCount + created + 1,
        status: 'SENT',
        currency,
        taxPercent,
        totalTax,
        totalGross,
        issueDate: createdAt,
        createdAt,
        sentAt,
        dueDate,
        items: {
          create: itemsData.map(item => ({
            ...item,
            currency,
          })),
        },
      },
    });

    created++;
    currentMonthCount++;
  }

  // Generate 5 SENT invoices that are LATE (from earlier in 2025, overdue)
  console.log('⚠️  Creating 5 SENT invoices (late, overdue)...');
  for (let i = 0; i < 5; i++) {
    const contact = contacts[Math.floor(Math.random() * contacts.length)];
    const createdAt = randomDate(startDate, twoMonthsAgo);
    const sentAt = addDays(createdAt, Math.floor(Math.random() * 2));
    const dueDate = addDays(sentAt, 30); // Will be overdue by now
    
    const itemsData = generateInvoiceItems(Math.floor(Math.random() * 4) + 1);
    const currency = Math.random() > 0.2 ? 'CHF' : 'EUR';
    
    // Calculate totals
    let totalGross = 0;
    let totalTax = 0;
    const taxPercent = 8.1;
    
    itemsData.forEach(item => {
      const itemTotal = item.lineTotal;
      const itemTax = (itemTotal * taxPercent) / 100;
      totalGross += itemTotal + itemTax;
      totalTax += itemTax;
    });

    await prisma.invoice.create({
      data: {
        userId: user.id,
        contactId: contact.id,
        number: existingCount + created + 1,
        status: 'SENT',
        currency,
        taxPercent,
        totalTax,
        totalGross,
        issueDate: createdAt,
        createdAt,
        sentAt,
        dueDate,
        items: {
          create: itemsData.map(item => ({
            ...item,
            currency,
          })),
        },
      },
    });

    created++;
    lateCount++;
  }

  // Fill up to 100 total with small DRAFT invoices
  const TARGET_TOTAL = 100;
  const remaining = TARGET_TOTAL - created;
  if (remaining > 0) {
    console.log(`📝 Creating ${remaining} DRAFT invoices to reach ${TARGET_TOTAL} total...`);
    for (let i = 0; i < remaining; i++) {
      const contact = contacts[Math.floor(Math.random() * contacts.length)];
      const createdAt = randomDate(startDate, now);
      const itemsData = generateInvoiceItems(Math.floor(Math.random() * 2) + 1);
      const currency = Math.random() > 0.15 ? 'CHF' : 'EUR';
      let totalGross = 0;
      let totalTax = 0;
      const taxPercent = 0; // drafts often before VAT decisions; keep low amounts
      itemsData.forEach(item => {
        const itemTotal = item.lineTotal;
        const itemTax = (itemTotal * taxPercent) / 100;
        totalGross += itemTotal + itemTax;
        totalTax += itemTax;
      });
      await prisma.invoice.create({
        data: {
          userId: user.id,
          contactId: contact.id,
          number: existingCount + created + 1,
          status: 'DRAFT',
          currency,
          taxPercent,
          totalTax,
          totalGross,
          issueDate: createdAt,
          createdAt,
          items: {
            create: itemsData.map(item => ({ ...item, currency })),
          },
        },
      });
      created++;
      draftCount++;
      if ((i+1) % 20 === 0) console.log(`  ✓ Drafted ${i+1}/${remaining}...`);
    }
  }

  console.log('\n✅ Seeding completed!\n');
  console.log('📊 Summary:');
  console.log(`  - Total invoices created: ${created}`);
  console.log(`  - PAID invoices: ${paidCount}`);
  console.log(`  - SENT (current month): ${currentMonthCount}`);
  console.log(`  - SENT (late/overdue): ${lateCount}`);
  console.log(`  - DRAFT invoices: ${draftCount}`);
  console.log(`  - Total invoices for user: ${existingCount + created}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
