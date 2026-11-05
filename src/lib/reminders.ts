import { prisma } from "@/server/db";
import { t, type Lang } from "@/lib/i18n";

// Minimal shape of an invoice with the relations reminders need.
export type ReminderInvoice = {
  id: string;
  userId: string | null;
  number: number | null;
  issueDate: Date;
  dueDate: Date | null;
  totalGross: number;
  currency: string;
  reference: string | null;
  reminderCount?: number;
  contact: {
    email: string;
    company: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  user: {
    orgProfile: {
      company: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      street: string | null;
      street2: string | null;
      zipCode: string | null;
      place: string | null;
      country: string | null;
      iban: string | null;
    } | null;
  } | null;
};

// Default language for automated reminders (no browser cookie in a cron job).
export function langForCountry(country?: string | null): Lang {
  const c = (country || "CH").toUpperCase();
  if (c === "FR" || c === "BE" || c === "LU") return "fr";
  if (c === "IT") return "it";
  if (c === "DE" || c === "AT") return "de";
  if (c === "CH") return "de";
  return "en";
}

// Sends one payment reminder email via Resend and records it on the invoice.
// Returns { ok: true } on success, or { ok: false, error } on failure.
export async function sendPaymentReminder(
  invoice: ReminderInvoice,
  lang: Lang
): Promise<{ ok: boolean; error?: string }> {
  const org = invoice.user?.orgProfile;
  const recipientEmail = invoice.contact.email;
  if (!org) return { ok: false, error: "Organization profile not found" };
  if (!recipientEmail) return { ok: false, error: "Contact has no email address" };

  try {
    const ttlDays = parseInt(process.env.DOWNLOAD_TTL_DAYS || "90", 10) || 90;
    const exp = Date.now() + ttlDays * 24 * 60 * 60 * 1000;
    const payloadObj = { id: invoice.id, u: invoice.userId, exp };
    const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
    const cryptoMod = await import("crypto");
    const secret = process.env.SECRET_KEY || "dev-secret-change-me";
    const sig = cryptoMod.createHmac("sha256", secret).update(payloadB64).digest("base64url");
    const token = `${payloadB64}.${sig}`;
    const origin = process.env.APP_BASE_URL || "https://app.facturio.ch";
    const ctaUrl = `${origin}/app/api/public/invoices/${token}`;

    const number = String(invoice.number ?? "");
    const total = invoice.totalGross.toFixed(2);
    const currency = invoice.currency;
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("de-CH") : "";

    const subject = t(lang, "email.reminderSubject").replace("{number}", number);
    const body = t(lang, "email.reminderBody")
      .replace("{number}", number)
      .replace("{total}", total)
      .replace("{currency}", currency)
      .replace("{dueDate}", dueDate);

    const { renderInvoiceEmailHTML } = await import("@/lib/emailTemplates");
    const html = renderInvoiceEmailHTML(
      {
        org: {
          company: org.company,
          firstName: org.firstName,
          lastName: org.lastName,
          email: org.email,
          street: org.street,
          street2: org.street2,
          zipCode: org.zipCode,
          place: org.place,
          country: org.country,
          iban: org.iban,
        },
        contact: {
          name: invoice.contact.company || `${invoice.contact.firstName ?? ""} ${invoice.contact.lastName ?? ""}`.trim(),
        },
        invoice: {
          number: invoice.number ?? "",
          total,
          currency,
          issueDate: new Date(invoice.issueDate).toLocaleDateString("de-CH"),
          dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("de-CH") : null,
          reference: invoice.reference ?? undefined,
        },
        subject: t(lang, "email.reminderBadge"),
        body,
        ctaUrl,
        ctaLabel: t(lang, "email.downloadInvoice"),
      },
      lang
    );

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };

    const fromAddress = process.env.INVOICE_FROM_EMAIL || "invoice@facturio.ch";
    const replyTo = org.email || fromAddress;
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipientEmail,
        subject,
        html,
        reply_to: replyTo,
      }),
    });

    if (!resp.ok) {
      let errDetail: any = null;
      try { errDetail = await resp.json(); } catch { errDetail = await resp.text(); }
      const errMsg = typeof errDetail === "string" ? errDetail : (errDetail?.message || JSON.stringify(errDetail));
      return { ok: false, error: `Resend API error: ${resp.status} ${errMsg}` };
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { reminderCount: { increment: 1 }, lastReminderAt: new Date() },
    });

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Failed to send reminder" };
  }
}
