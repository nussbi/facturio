const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='OrgProfile' AND column_name='defaultVat') THEN ALTER TABLE "OrgProfile" ADD COLUMN "defaultVat" numeric(5,2); END IF; END $$;`);
  console.log("Applied OrgProfile.defaultVat column");
}

main().then(()=>prisma.$disconnect()).catch(async (e)=>{ console.error(e); await prisma.$disconnect(); process.exit(1); });

