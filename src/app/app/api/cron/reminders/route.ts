import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { sendPaymentReminder, langForCountry } from "@/lib/reminders";

export const runtime = "nodejs";

// Automated payment reminders. Called on a schedule (cron) with a shared secret.
// Finds overdue, unpaid SENT invoices for PRO users and sends a reminder email.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") || req.headers.get("x-reminder-secret") || "";
  const expected = process.env.REMINDER_CRON_SECRET || process.env.SECRET_KEY || "";
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const maxReminders = 3;

  const invoices = await prisma.invoice.findMany({
    where: {
      status: "SENT",
      paidAt: null,
      dueDate: { lt: now },
      reminderCount: { lt: maxReminders },
      user: { plan: "PRO" },
    },
    include: {
      contact: true,
      user: { include: { orgProfile: true } },
    },
  });

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const invoice of invoices) {
    const lang = langForCountry(invoice.user?.orgProfile?.country);
    const result = await sendPaymentReminder(invoice as any, lang);
    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
      errors.push(`#${invoice.number ?? invoice.id}: ${result.error}`);
    }
  }

  return NextResponse.json({
    ok: true,
    checked: invoices.length,
    sent,
    failed,
    errors: errors.slice(0, 20),
  });
}
