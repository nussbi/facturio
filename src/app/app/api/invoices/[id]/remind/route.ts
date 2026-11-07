import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { invalidateMetricsCache } from "@/lib/metrics";
import { sendPaymentReminder } from "@/lib/reminders";
import { LANG_KEY, type Lang } from "@/lib/i18n";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Payment reminders are a PRO feature
  if ((user as any).plan !== "PRO") {
    return NextResponse.json(
      { error: "Payment reminders require a Professional plan" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      contact: true,
      user: { include: { orgProfile: true } },
    },
  });

  if (!invoice || invoice.userId !== user.id) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  if (invoice.status !== "SENT" || invoice.paidAt) {
    return NextResponse.json(
      { error: "Invoice is not awaiting payment" },
      { status: 400 }
    );
  }

  const langCookie = req.cookies.get(LANG_KEY)?.value;
  const lang: Lang = langCookie === "de" || langCookie === "fr" || langCookie === "it" ? langCookie : "en";

  const result = await sendPaymentReminder(invoice as any, lang);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Failed to send reminder" }, { status: 500 });
  }

  invalidateMetricsCache(user.id);
  const updated = await prisma.invoice.findUnique({ where: { id }, select: { reminderCount: true } });
  return NextResponse.json({ ok: true, reminderCount: updated?.reminderCount ?? 1 });
}
