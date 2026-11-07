const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  const contacts = await prisma.contact.findMany({ select: { id: true, company: true, createdAt: true } });
  const map = new Map();
  for (const c of contacts) {
    if (!c.company) continue;
    const key = c.company.toLowerCase().trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(c);
  }
  let mergedGroups = 0, movedInvoices = 0, movedExpenses = 0, deletedContacts = 0;
  for (const [key, list] of map.entries()) {
    if (list.length <= 1) continue;
    // sort by createdAt asc, keep first
    list.sort((a,b)=> new Date(a.createdAt) - new Date(b.createdAt));
    const keeper = list[0];
    const dups = list.slice(1);
    mergedGroups++;
    for (const d of dups) {
      // reassign invoices
      const invRes = await prisma.invoice.updateMany({ where: { contactId: d.id }, data: { contactId: keeper.id } });
      movedInvoices += invRes.count;
      // reassign expenses
      const expRes = await prisma.expense.updateMany({ where: { contactId: d.id }, data: { contactId: keeper.id } });
      movedExpenses += expRes.count;
      // delete duplicate contact
      await prisma.contact.delete({ where: { id: d.id } });
      deletedContacts++;
    }
  }
  console.log(JSON.stringify({ mergedGroups, movedInvoices, movedExpenses, deletedContacts }));
}

main().then(()=>prisma.$disconnect()).catch(async (e)=>{ console.error(e); await prisma.$disconnect(); process.exit(1); });

