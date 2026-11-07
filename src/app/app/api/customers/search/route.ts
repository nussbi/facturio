import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ items: [] });
  const items = await prisma.contact.findMany({
    where: {
      userId: user.id,
      OR: [
        { company: { contains: q } },
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { email: { contains: q } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, company: true, firstName: true, lastName: true, email: true },
    take: 8,
  });
  return NextResponse.json({
    items: items.map((c) => ({
      id: c.id,
      label: c.company || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email,
    })),
  });
}

