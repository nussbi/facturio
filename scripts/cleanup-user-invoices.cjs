const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const email = process.env.CLEAN_EMAIL || 'nussbaumer@gmail.com';
  console.log(`🧹 Cleaning invoices for user: ${email}`);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`❌ User not found: ${email}`);
    process.exit(1);
  }

  // Count before
  const invCountBefore = await prisma.invoice.count({ where: { userId: user.id } });
  console.log(`📊 Found ${invCountBefore} invoices to delete (userId=${user.id})`);

  // Delete invoice items for this user's invoices first
  const deleteItems = await prisma.invoiceItem.deleteMany({
    where: { invoice: { userId: user.id } },
  });
  console.log(`  ✓ Deleted ${deleteItems.count} invoice items`);

  // Delete invoices for this user
  const deleteInv = await prisma.invoice.deleteMany({
    where: { userId: user.id },
  });
  console.log(`  ✓ Deleted ${deleteInv.count} invoices`);

  // Optional: clean QR-bill documents on disk could be added here if needed

  console.log('✅ Cleanup complete');
}

main()
  .catch((err) => {
    console.error('❌ Error during cleanup:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
