import { t, type Lang } from "@/lib/i18n";
import { formatIban, formatReference } from "@/lib/utils";

export type EmailTemplateContext = {
  org: {
    company?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    street?: string | null;
    street2?: string | null;
    zipCode?: string | null;
    place?: string | null;
    country?: string | null;
    iban?: string | null;
  };
  contact?: {
    name: string;
  };
  invoice?: {
    number: number | string;
    total: string;
    currency: string;
    issueDate?: string;
    dueDate?: string | null;
    reference?: string | null;
  };
  subject: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
  portalUrl?: string;
  payUrl?: string;
  payLabel?: string;
  brandLogoUrl?: string;
};

const baseStyles = {
  container: "font-family:Arial,Helvetica,sans-serif;background:#f6f8fb;padding:24px;color:#0f172a;",
  card: "max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;box-shadow:0 10px 15px -3px rgba(0,0,0,0.08),0 4px 6px -2px rgba(0,0,0,0.05)",
  header: "background:#ffffff;padding:20px 24px;color:#0f172a;border-bottom:1px solid #e5e7eb;",
  brand: "display:flex;align-items:center;gap:12px;font-weight:700;font-size:24px;letter-spacing:-0.3px;line-height:1;",
  h1: "margin:0;font-size:20px;",
  content: "padding:28px 24px;",
  badge: "display:inline-block;padding:6px 10px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:.3px;",
  box: "background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:16px 0;",
  label: "display:block;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;",
  value: "font-weight:600;color:#0f172a;",
  cta: "display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;",
  footer: "padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#475569;font-size:12px;",
  watermark: "color:#64748b;font-size:12px;",
};

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderInvoiceEmailHTML(ctx: EmailTemplateContext, lang: Lang = "en") {
  const orgName = (ctx.org.company || `${ctx.org.firstName ?? ''} ${ctx.org.lastName ?? ''}`.trim() || 'Your Company').trim();
  const subject = ctx.subject || t(lang, "email.newInvoiceSubject").replace("{org}", orgName);
  const defaultPhrase = 'Please find your invoice attached. You can pay using the Swiss QR-bill in the PDF.';
  const rawBody = (ctx.body || '').trim();
  const effectiveBody = rawBody && rawBody !== defaultPhrase ? rawBody : '';
  const body = effectiveBody ? effectiveBody.split('\n').map(p => `<p style="margin:14px 0;line-height:1.6;color:#334155;">${escapeHtml(p)}</p>`).join('') : '';
  const invoiceNumber = ctx.invoice?.number ?? '';
  const total = ctx.invoice?.total ?? '';
  const currency = ctx.invoice?.currency ?? '';
  const issueDate = ctx.invoice?.issueDate ?? '';

  // Brand: text-based branding (no images → no broken links in email clients)
  const brandText = `<span style="font-weight:700;font-size:24px;letter-spacing:-0.3px;line-height:1;background:linear-gradient(90deg,#4F46E5,#2563EB,#06B6D4);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;">facturio.ch</span>`;
  const brandHeaderHtml = `<a href="https://facturio.ch" target="_blank" rel="noopener" style="text-decoration:none;outline:none;border:0;display:inline-block;color:inherit;">${brandText}</a>`;
  const brandFooterText = `<span style="font-weight:700;font-size:16px;letter-spacing:-0.2px;line-height:1;background:linear-gradient(90deg,#4F46E5,#2563EB,#06B6D4);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;">facturio.ch</span>`;
  const brandFooterHtml = `<a href="https://facturio.ch" target="_blank" rel="noopener" style="text-decoration:none;outline:none;border:0;display:inline-block;color:inherit;">${brandFooterText}</a>`;

  // Hero: invoice number + amount. Sender's full address/IBAN live on the QR-bill
  // inside the PDF, so they are NOT repeated in the email body (keeps it clean).
  const heroHtml = `
    <div style="text-align:center;padding:2px 0;">
      <div style="${baseStyles.label}">${t(lang, "email.invoiceNumber")}</div>
      <div style="font-size:14px;font-weight:700;color:#0f172a;margin-top:2px;">#${escapeHtml(String(invoiceNumber))}</div>
      <div style="font-size:38px;font-weight:800;line-height:1.05;margin-top:12px;letter-spacing:-0.5px;background:linear-gradient(90deg,#4F46E5,#2563EB,#06B6D4);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;">${escapeHtml(String(total))}<span style="font-size:20px;font-weight:700;margin-left:6px;">${escapeHtml(String(currency))}</span></div>
      <div style="margin-top:14px;display:inline-block;padding:5px 12px;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:.2px;">${escapeHtml(subject)}</div>
    </div>`;

  const metaHtml = `
    <div style="display:flex;justify-content:center;gap:36px;flex-wrap:wrap;margin:24px 0 0;padding:18px 0 0;border-top:1px dashed #e5e7eb;">
      <div style="text-align:center;">
        <div style="${baseStyles.label}">${t(lang, "invoice.issueDate")}</div>
        <div style="${baseStyles.value}">${escapeHtml(String(issueDate))}</div>
      </div>
      ${ctx.invoice?.dueDate ? `<div style="text-align:center;"><div style="${baseStyles.label}">${t(lang, "invoice.dueDate")}</div><div style="${baseStyles.value}">${escapeHtml(String(ctx.invoice.dueDate))}</div></div>` : ''}
    </div>`;

  const ctaHtml = ctx.ctaUrl ? `
    <div style="text-align:center;margin:26px 0 2px;">
      <a style="display:inline-block;background:linear-gradient(90deg,#4F46E5,#2563EB,#06B6D4);color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:10px;font-weight:700;font-size:15px;box-shadow:0 6px 16px rgba(37,99,235,0.28);" href="${ctx.ctaUrl}" target="_blank" rel="noopener">${t(lang, "email.downloadInvoice")}</a>
    </div>` : '';

  // Portal link: link to customer portal where they can view all invoices
  const portalHtml = ctx.portalUrl ? `
    <div style="text-align:center;margin:18px 0 6px;">
      <a style="display:inline-block;background:#ffffff;color:#2563eb;text-decoration:none;padding:12px 24px;border:1px solid #2563eb;border-radius:10px;font-weight:600;font-size:14px;" href="${ctx.portalUrl}" target="_blank" rel="noopener">${t(lang, "email.viewAllInvoices")}</a>
    </div>` : '';

  // Payment details: full sender address + IBAN + reference (kept in the email so
  // the recipient can pay without opening the PDF).
  const payToLines: string[] = [];
  if (orgName) payToLines.push(orgName);
  if (ctx.org.street) payToLines.push(ctx.org.street);
  if (ctx.org.street2) payToLines.push(ctx.org.street2);
  const zipPlace = [ctx.org.zipCode, ctx.org.place].filter(Boolean).join(' ');
  if (zipPlace) payToLines.push(zipPlace);
  if (ctx.org.country) payToLines.push(ctx.org.country);
  if (ctx.org.email) payToLines.push(ctx.org.email);
  const payToHtml = payToLines.length ? payToLines.map((l) => `<div style="color:#334155;line-height:1.55;">${escapeHtml(l)}</div>`).join('') : '';
  const ibanHtml = ctx.org.iban ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb;"><div style="${baseStyles.label}">${t(lang, "preview.ibanLabel")}</div><div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;color:#0f172a;word-break:break-all;line-height:1.5;">${escapeHtml(formatIban(ctx.org.iban))}</div></div>` : '';
  const referenceHtml = ctx.invoice?.reference ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb;"><div style="${baseStyles.label}">${t(lang, "preview.reference")}</div><div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;color:#0f172a;word-break:break-all;line-height:1.5;">${escapeHtml(formatReference(ctx.invoice.reference))}</div></div>` : '';
  const paymentHtml = (payToHtml || ibanHtml || referenceHtml) ? `<div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin:24px 0 0;"><div style="${baseStyles.label}">${t(lang, "email.paymentDetails")}</div>${payToHtml}${ibanHtml}${referenceHtml}</div>` : '';

  return `
  <div style="${baseStyles.container}">
    <div style="${baseStyles.card}">
      <div style="${baseStyles.header}">
        <div style="${baseStyles.brand}">
          ${brandHeaderHtml}
        </div>
      </div>
      <div style="${baseStyles.content}">
        ${heroHtml}
        ${body}
        ${metaHtml}
        ${paymentHtml}
        ${ctaHtml}
        ${portalHtml}
      </div>
      <div style="${baseStyles.footer}">
        <div style="${baseStyles.watermark}">${t(lang, "invoices.from")} ${escapeHtml(orgName)}</div>
        <div style="margin-top:6px;">${t(lang, "preview.createdWithLove")} ${brandFooterHtml}</div>
      </div>
    </div>
  </div>`;
}

export function renderInvoiceEmailPreviewHTML({ subject, body }: { subject: string; body: string; }) {
  const ctx: EmailTemplateContext = {
    org: { 
      company: 'Strongwinds GmbH', firstName: 'Reto', lastName: 'Nussbaumer',
      email: 'info@strongwinds.ch',
      street: 'Bahnhofstrasse 1',
      zipCode: '8001',
      place: 'Zürich',
      country: 'CH',
      iban: 'CH44 3199 9123 0008 8901 2'
    },
    contact: { name: 'Muster AG' },
    invoice: { number: 1024, total: '1250.00', currency: 'CHF', issueDate: new Date().toLocaleDateString('de-CH'), dueDate: null },
    subject,
    body,
    brandLogoUrl: undefined, // Use text-based branding
  };
  return renderInvoiceEmailHTML(ctx);
}
