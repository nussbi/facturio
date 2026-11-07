  const iban = "CH9300762011623852957"; // Example Swiss IBAN
  const name = "Strongwinds GmbH";
  const contact = await prisma.contact.findFirst({ where: { company: name } });
  if (contact) {
    await prisma.contact.update({ where: { id: contact.id }, data: { iban } });
    console.log("Updated IBAN for", name);
  } else {
    await prisma.contact.create({
      data: {
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

main().then(()=>prisma.$disconnect()).catch(async (e)=>{console.error(e); await prisma.$disconnect(); process.exit(1);});

