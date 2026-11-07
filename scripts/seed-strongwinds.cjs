const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "nussbaumer@gmail.com";
  const admin = await prisma.user.findFirst({ where: { email: adminEmail } });
  if (!admin) throw new Error(`Admin user not found: ${adminEmail}`);
  const iban = "CH9300762011623852957"; // Example Swiss IBAN
  const name = "Strongwinds GmbH";
  const contact = await prisma.contact.findFirst({ where: { userId: admin.id, company: { equals: name, mode: "insensitive" } } });
  if (contact) {
    await prisma.contact.update({ where: { id: contact.id }, data: { iban } });
    console.log("Updated IBAN for", name);
  } else {
    await prisma.contact.create({
      data: {
        userId: admin.id,
        company: name,
        email: "info@strongwinds.example",
        street: "Examplestrasse 1",
        zipCode: "8000",
        place: "Zürich",
        country: "CH",
        currency: "CHF",
        iban,
      },
    });
    console.log("Created example customer", name);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

