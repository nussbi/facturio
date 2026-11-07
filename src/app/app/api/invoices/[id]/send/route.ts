import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { buildAddressSnapshot } from "@/lib/qrbill";
import { invalidateMetricsCache } from "@/lib/metrics";
import { t, LANG_KEY, type Lang } from "@/lib/i18n";
import { ensureInvoicePdf } from '@/lib/invoiceArchive';
const { invoicePortalShare, portalLinkToken } = require("@/lib/customer-portal.cjs");

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { recipientEmail } = await req.json();

  if (!recipientEmail) {
    return NextResponse.json(
      { error: "recipientEmail is required" },
      { status: 400 }
    );
  }

  // Fetch invoice with all relations
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: true,
      contact: true,
      user: {
        include: {
          orgProfile: true,
        },
      },
    },
  });

  if (!invoice || invoice.userId !== user.id) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (!invoice.user?.orgProfile) {
    return NextResponse.json(
      { error: "Organization profile not found" },
      { status: 400 }
    );
  }

  try {
    // Archive exactly the PDF attached to the email before sending.
    const org = invoice.user.orgProfile;
    const langCookie = req.cookies.get(LANG_KEY)?.value;
    const lang: Lang = langCookie === "de" || langCookie === "fr" || langCookie === "it" ? langCookie : "en";
    const pdfBuffer = Buffer.from(await ensureInvoicePdf(invoice, org, (user as any).plan || 'FREE', lang));
    const code = String(invoice.number ?? invoice.id);

    // Create signed, public download link valid for 90 days
    const ttlDays = parseInt(process.env.DOWNLOAD_TTL_DAYS || '90', 10) || 90;
    const exp = Date.now() + ttlDays * 24 * 60 * 60 * 1000;
    const payloadObj = { id: invoice.id, u: invoice.userId, exp };
    const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
    const cryptoMod = await import('crypto');
    const secret = process.env.SECRET_KEY || 'dev-secret-change-me';
    const sig = cryptoMod.createHmac('sha256', secret).update(payloadB64).digest('base64url');
    const token = `${payloadB64}.${sig}`;
    // Use production domain for download links, not localhost
    const origin = process.env.APP_BASE_URL || 'https://app.facturio.ch';
    const ctaUrl = `${origin}/app/api/public/invoices/${token}`;

    const portalShare = await invoicePortalShare(prisma, invoice.userId, invoice.contactId);
    const portalUrl = portalShare ? `${origin}/portal/${portalLinkToken(portalShare)}` : undefined;

    // Use text-based brand logo instead of image to avoid broken image issues
    const brandLogoUrl = undefined; // Use text fallback in email template

    // Send email with Resend
    // Render email HTML using template and org's custom fields
    const { renderInvoiceEmailHTML } = await import("@/lib/emailTemplates");
    const orgNameForSubject = (invoice.user.orgProfile.company || `${invoice.user.orgProfile.firstName ?? ''} ${invoice.user.orgProfile.lastName ?? ''}`.trim() || 'Your Company').trim();
    const defaultSubject = t(lang, "email.newInvoiceSubject").replace("{org}", orgNameForSubject);
    const subject = (invoice.user.orgProfile as any).emailSubject || defaultSubject;
    const body = (invoice.user.orgProfile as any).emailBody || '';
    const html = renderInvoiceEmailHTML({
      org: {
        company: invoice.user.orgProfile.company,
        firstName: invoice.user.orgProfile.firstName,
        lastName: invoice.user.orgProfile.lastName,
        email: invoice.user.orgProfile.email,
        street: invoice.user.orgProfile.street,
        street2: invoice.user.orgProfile.street2,
        zipCode: invoice.user.orgProfile.zipCode,
        place: invoice.user.orgProfile.place,
        country: invoice.user.orgProfile.country,
        iban: invoice.user.orgProfile.iban,
      },
      contact: { name: invoice.contact.company || `${invoice.contact.firstName ?? ''} ${invoice.contact.lastName ?? ''}`.trim() },
      invoice: {
        number: invoice.number ?? '',
        total: invoice.totalGross.toFixed(2),
        currency: invoice.currency,
        issueDate: new Date(invoice.issueDate).toLocaleDateString('de-CH'),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('de-CH') : null,
        reference: invoice.reference ?? undefined,
      },
      subject,
      body,
      ctaUrl,
      ctaLabel: 'Download invoice (PDF)',
      portalUrl,
      brandLogoUrl,
    }, lang);

  const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

  const fromAddress = process.env.INVOICE_FROM_EMAIL || 'invoice@facturio.ch';
    const replyTo = invoice.user.orgProfile.email || 'invoice@facturio.ch';
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipientEmail,
        subject,
        html,
        reply_to: replyTo,
        attachments: [
          {
            filename: `invoice-${invoice.number ?? code}.pdf`,
            content: pdfBuffer.toString('base64'),
          },
        ],
      }),
    });

    if (!resp.ok) {
      let errDetail: any = null;
      try { errDetail = await resp.json(); } catch { errDetail = await resp.text(); }
      const errMsg = typeof errDetail === 'string' ? errDetail : (errDetail?.message || JSON.stringify(errDetail));
      return NextResponse.json({ error: `Resend API error: ${resp.status} ${errMsg}` }, { status: 502 });
    }
    const data = await resp.json();

    // Update invoice status to SENT if it was DRAFT
    if (invoice.status === 'DRAFT') {
      await prisma.invoice.update({
        where: { id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          addressSnapshot: buildAddressSnapshot(org, invoice.contact),
        },
      });

      // Update linked expenses
      const expIds = invoice.items.map((it) => it.expenseId).filter((x) => !!x);
      if (expIds.length) {
        await prisma.expense.updateMany({
          where: { id: { in: expIds as string[] } },
          data: { status: 'SENT' as any },
        });
      }
    } else if (invoice.status === 'SENT' && !invoice.sentAt) {
      // Update sentAt if not set
      await prisma.invoice.update({
        where: { id },
        data: { sentAt: new Date() },
      });
    }

    // Add customer change log entry with Swiss time
    try {
      const invNo = invoice.number ?? '';
      const msg = `Invoice #${invNo} sent to ${recipientEmail}`;
      await prisma.contactLog.create({ data: { contactId: invoice.contactId, message: msg } });
    } catch (e) {
      console.warn('Failed to write contact log for sent invoice:', e);
    }

    // Invalidate metrics cache for this user
    invalidateMetricsCache(user.id);

    return NextResponse.json({ success: true, emailId: data.id });
  } catch (error) {
    console.error("Failed to send invoice:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to send invoice email: ${errorMessage}` },
      { status: 500 }
    );
  }
}
