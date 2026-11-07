import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { formatDate } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ items: [] });
  // Customers
  const customers = await prisma.contact.findMany({
    where: {
      userId: user.id,
      OR: [
        { company: { contains: q } },
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { email: { contains: q } },
      ],
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });
  // Invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      userId: user.id,
      OR: [
        { reference: { contains: q } },
        { message: { contains: q } },
        { contact: { company: { contains: q } } },
        { contact: { firstName: { contains: q } } },
        { contact: { lastName: { contains: q } } },
      ],
    },
    include: { contact: true },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  const items = [
    ...customers.map(c => ({
      id: c.id,
      type: "customer" as const,
      label: c.company || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email,
      url: `/contacts/${c.id}`,
    })),
    ...invoices.map(inv => ({
      id: inv.id,
      type: "invoice" as const,
      label: `${inv.contact.company || `${inv.contact.firstName ?? ""} ${inv.contact.lastName ?? ""}`.trim()} • ${formatDate(inv.createdAt)}${inv.reference?` • ${inv.reference}`:""}`,
      url: `/invoices?status=${inv.status}&q=${encodeURIComponent(q)}`,
    })),
  ];

  return NextResponse.json({ items });
}

