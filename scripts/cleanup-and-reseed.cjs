const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function cleanup() {
  console.log("🧹 Cleaning up existing data...");
  
  // Delete in proper order to respect foreign key constraints
  await prisma.invoiceItem.deleteMany({});
  console.log("  ✓ Deleted all invoice items");
  
  await prisma.invoice.deleteMany({});
  console.log("  ✓ Deleted all invoices");
  
  await prisma.contact.deleteMany({});
  console.log("  ✓ Deleted all contacts");
  
  // Also clean up any orphaned expenses that might be linked to deleted contacts
  await prisma.expense.updateMany({
    where: { contactId: { not: null } },
    data: { contactId: null }
  });
  console.log("  ✓ Unlinked expenses from deleted contacts");
  
  console.log("✅ Cleanup completed!\n");
}

async function reseed() {
  console.log("🌱 Starting reseed process...");
  
  // Check if admin user exists
  const adminEmail = "nussbaumer@gmail.com";
  const admin = await prisma.user.findFirst({ where: { email: adminEmail } });
  if (!admin) {
    throw new Error(`Admin user not found: ${adminEmail}. Please create admin user first.`);
  }
  
  // Check if org profile exists
  const org = await prisma.orgProfile.findFirst({ where: { userId: admin.id } });
  if (!org) {
    throw new Error("OrgProfile missing for admin. Please configure organization profile with IBAN first.");
  }
  
  console.log("  ✓ Admin user and organization profile verified");
  console.log("🚀 Running test invoice generation...\n");
}

async function main() {
  try {
    await cleanup();
    await reseed();
    
    console.log("🔄 Now running the test invoice generation script...");
    
    // The existing script will handle the actual seeding
    // We need to exit this process and let the test invoice script run
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();