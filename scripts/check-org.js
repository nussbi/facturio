const { PrismaClient } = require("../src/generated/prisma");

(async () => {
  const prisma = new PrismaClient();
  try {
    const orgs = await prisma.orgProfile.findMany({ orderBy: { updatedAt: "desc" } });
    console.log(JSON.stringify(orgs, null, 2));
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
