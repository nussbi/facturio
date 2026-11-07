import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";

// Ensure Node.js runtime (not Edge)
export const runtime = "nodejs";

// Recalculate taxPercent / totalTax / totalGross on the user's DRAFT invoices
// using their current default VAT rate (and keep currency as stored). Sender
// details (company/address/IBAN/VAT number) are already generated live from the
// OrgProfile at PDF time, so only the snapshotted VAT + totals need refreshing.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const org = await prisma.orgProfile.findFirst({ where: { userId: user.id } });
  if (!org) {
    return NextResponse.json({ error: "org_not_configured" }, { status: 400 });
  }

  const newTaxPercent = org.defaultVat ?? 0;

  const drafts = await prisma.invoice.findMany({
    where: { userId: user.id, status: "DRAFT" },
    include: { items: true },
  });

  let count = 0;
  for (const inv of drafts) {
    const subtotal = inv.items.reduce((s, it) => s + (Number(it.lineTotal) || 0), 0);
    const totalTax = Number(((subtotal * newTaxPercent) / 100).toFixed(2));
    const totalGross = Number((subtotal + totalTax).toFixed(2));
    await prisma.invoice.update({
      where: { id: inv.id },
      data: { taxPercent: newTaxPercent, totalTax, totalGross },
    });
    count++;
  }

  return NextResponse.json({ count });
}
