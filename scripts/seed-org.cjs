const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "nussbaumer@gmail.com";
  const admin = await prisma.user.findFirst({ where: { email: adminEmail } });
  if (!admin) throw new Error(`Admin user not found: ${adminEmail}`);
  const existing = await prisma.orgProfile.findFirst({ where: { userId: admin.id } });
  if (existing) {
    console.log("OrgProfile already exists for admin:", existing.company);
    return;
  }
  const org = await prisma.orgProfile.create({
    data: {
      userId: admin.id,
      company: "Facturio AG",
      street: "Hauptstrasse 1",
      street2: null,
      zipCode: "8001",
      place: "Zürich",
      state: null,
      country: "CH",
      email: "info@facturio.local",
      phone: "+41 44 000 00 00",
      iban: "CH9300762011623852957",
      currency: "CHF",
    }
  });
  console.log("Seeded OrgProfile for admin:", org.company);
}

main().then(()=>prisma.$disconnect()).catch(async (e)=>{console.error(e); await prisma.$disconnect(); process.exit(1);});

