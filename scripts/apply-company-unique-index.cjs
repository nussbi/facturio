const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS contact_company_lower_unique ON "Contact" (lower("company")) WHERE "company" IS NOT NULL;`);
  console.log("Applied unique index contact_company_lower_unique");
}

main().then(()=>prisma.$disconnect()).catch(async (e)=>{ console.error(e); await prisma.$disconnect(); process.exit(1); });

