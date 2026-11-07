import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { invalidateMetricsCache } from "@/lib/metrics";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({ where: { id } });
  if (!inv || inv.userId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });
  const invoice = await prisma.invoice.update({ where: { id }, data: { status: "CANCELLED", sentAt: null, paidAt: null } });

  // Invalidate metrics cache for this user
  invalidateMetricsCache(user.id);

  // Log the status change to the customer changelog (Swiss time)
  try {
    await prisma.contactLog.create({ data: { contactId: invoice.contactId, message: `Invoice #${invoice.number} marked as Cancelled` } });
  } catch {}

  return NextResponse.json({ invoice });
}
