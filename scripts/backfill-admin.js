const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "nussbaumer@gmail.com";
  const admin = await prisma.user.findFirst({ where: { email: adminEmail } });
  if (!admin) {
    console.error(`Admin user not found: ${adminEmail}`);
    process.exit(1);
  }
  const adminId = admin.id;
  const r1 = await prisma.contact.updateMany({ where: { userId: null }, data: { userId: adminId } });
  const r2 = await prisma.expense.updateMany({ where: { userId: null }, data: { userId: adminId } });
  const r3 = await prisma.invoice.updateMany({ where: { userId: null }, data: { userId: adminId } });
  const r4 = await prisma.orgProfile.updateMany({ where: { userId: null }, data: { userId: adminId } });
  console.log("Backfill complete:", {
    contacts: r1.count,
    expenses: r2.count,
    invoices: r3.count,
    orgProfiles: r4.count,
    admin: adminEmail,
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

