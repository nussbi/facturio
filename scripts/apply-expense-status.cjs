const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  // Create enum type if not exists (Postgres doesn't support IF NOT EXISTS for type creation easily)
  try {
    await prisma.$executeRawUnsafe(`DO $$ BEGIN CREATE TYPE "ExpenseStatus" AS ENUM ('OPEN','SENT','PAID'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  } catch (e) {
    console.error('Enum creation error (ignored if exists):', e.message || e);
  }
  // Add column if not exists
  await prisma.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Expense' AND column_name='status') THEN ALTER TABLE "Expense" ADD COLUMN "status" "ExpenseStatus" NOT NULL DEFAULT 'OPEN'; END IF; END $$;`);
  console.log("Applied ExpenseStatus and status column");
}

main().then(()=>prisma.$disconnect()).catch(async (e)=>{ console.error(e); await prisma.$disconnect(); process.exit(1); });

