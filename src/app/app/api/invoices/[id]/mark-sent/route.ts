import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { invalidateMetricsCache } from "@/lib/metrics";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { items: true } });
  if (!inv || inv.userId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });
  const invoice = await prisma.invoice.update({ where: { id }, data: { status: "SENT", sentAt: new Date(), paidAt: null }, include: { items: true } });
  try {
    const expIds = invoice.items.map((it: any) => it.expenseId).filter((x: any) => !!x);
    if (expIds.length) {
      await prisma.expense.updateMany({ where: { id: { in: expIds } }, data: { status: 'SENT' as any } });
    }
  } catch {}
  
  // Invalidate metrics cache for this user
  invalidateMetricsCache(user.id);

  // Log the status change to the customer changelog (Swiss time)
  try {
    await prisma.contactLog.create({ data: { contactId: invoice.contactId, message: `Invoice #${invoice.number} marked as Sent` } });
  } catch {}

  return NextResponse.json({ invoice });
}

