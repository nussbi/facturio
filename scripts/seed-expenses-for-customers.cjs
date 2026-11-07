const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "nussbaumer@gmail.com";
  const admin = await prisma.user.findFirst({ where: { email: adminEmail } });
  if (!admin) throw new Error(`Admin user not found: ${adminEmail}`);
  const contacts = await prisma.contact.findMany({ where: { userId: admin.id }, select: { id: true, company: true, firstName: true, lastName: true } });
  let created = 0, skipped = 0;
  for (const c of contacts) {
    const exists = await prisma.expense.findMany({ where: { contactId: c.id, description: { in: ["Seed: time (100 CHF)", "Seed: goods (250 CHF)"] } }, select: { id: true } });
    const haveTime = exists.some(e => e);
    // We'll check individually
    const haveTimeExpense = await prisma.expense.findFirst({ where: { contactId: c.id, description: "Seed: time (100 CHF)" } });
    const haveGoodsExpense = await prisma.expense.findFirst({ where: { contactId: c.id, description: "Seed: goods (250 CHF)" } });

    if (!haveTimeExpense) {
      await prisma.expense.create({
        data: {
          userId: admin.id,
          type: "TIME",
          title: "Time",
          description: "Seed: time (100 CHF)",
          date: new Date(),
          quantity: 1,
          unit: "h",
          unitPrice: 100,
          currency: "CHF",
          contactId: c.id,
        },
      });
      created++;
    } else {
      skipped++;
    }

    if (!haveGoodsExpense) {
      await prisma.expense.create({
        data: {
          userId: admin.id,
          type: "ITEM",
          title: "Goods",
          description: "Seed: goods (250 CHF)",
          date: new Date(),
          quantity: 1,
          unit: "pc",
          unitPrice: 250,
          currency: "CHF",
          contactId: c.id,
        },
      });
      created++;
    } else {
      skipped++;
    }
  }
  console.log(JSON.stringify({ contacts: contacts.length, created, skipped }));
}

main().then(()=>prisma.$disconnect()).catch(async (e)=>{ console.error(e); await prisma.$disconnect(); process.exit(1); });

