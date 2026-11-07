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
  const items = await prisma.invoice.findMany({
    where: {
      userId: user.id,
      OR: [
        { reference: { contains: q } },
        { contact: { company: { contains: q } } },
        { contact: { firstName: { contains: q } } },
        { contact: { lastName: { contains: q } } },
        { contact: { email: { contains: q } } },
      ],
    },
    include: { contact: true },
    take: 8,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    items: items.map((inv) => ({ id: inv.id, label: `${inv.contact.company || `${inv.contact.firstName ?? ""} ${inv.contact.lastName ?? ""}`.trim()} • ${formatDate(inv.createdAt)}` }))
  });
}

