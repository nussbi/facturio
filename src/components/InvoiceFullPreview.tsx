"use client";

import { formatSwissNumber } from "@/lib/utils";
import { useLanguage } from "@/components/language-context";

type Item = { description: string; quantity: number; unitPrice: number; lineTotal: number };
type Contact = {
  company: string | null; firstName: string | null; lastName: string | null;
  street: string | null; zipCode: string | null; place: string | null; country: string | null;
};
type Org = {
  company: string | null; firstName: string | null; lastName: string | null;
  street: string | null; street2: string | null; zipCode: string | null; place: string | null;
  country: string | null; iban: string | null;
};

function fmtDate(d?: string | Date | null): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("de-CH", { timeZone: "Europe/Zurich" });
}

export default function InvoiceFullPreview({
  invoice,
  contact,
  org,
}: {
  invoice: any;
  contact: Contact;
  org: Org | null;
}) {
  const { t } = useLanguage();
  const creditorName = org?.company || `${org?.firstName ?? ""} ${org?.lastName ?? ""}`.trim() || "—";
  const debtorName = contact.company || `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() || "—";
  const items = (invoice.items ?? []) as Item[];
  const subtotal = items.reduce((s, i) => s + Number(i.lineTotal ?? 0), 0);
  const totalTax = Number(invoice.totalTax ?? 0);
  const totalGross = Number(invoice.totalGross ?? 0);
  const currency = (invoice.currency ?? "CHF") as string;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Brand accent bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500" />

      <div className="p-6 sm:p-10">
        {/* Header: sender + invoice meta */}
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-sm text-gray-600 leading-relaxed">
            <div className="text-xl font-bold tracking-tight text-gray-900">{creditorName}</div>
            <div className="mt-2">
              {org?.street ? <div>{org.street}</div> : null}
              {org?.street2 ? <div>{org.street2}</div> : null}
              {org && (org.zipCode || org.place) ? (
                <div>{[org.zipCode, org.place].filter(Boolean).join(" ")}</div>
              ) : null}
              {org?.country && org.country !== "CH" ? <div>{org.country}</div> : null}
              {org?.iban ? <div className="mt-1.5 text-xs text-gray-400">IBAN {org.iban}</div> : null}
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-3xl font-bold tracking-tight text-indigo-600">{t("fullpreview.invoice")}</div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex items-baseline gap-3 sm:justify-end">
                <dt className="w-12 shrink-0 text-left text-xs font-medium text-gray-400 sm:text-right">{t("fullpreview.no")}</dt>
                <dd className="font-medium text-gray-900">{invoice.number ?? "—"}</dd>
              </div>
              <div className="flex items-baseline gap-3 sm:justify-end">
                <dt className="w-12 shrink-0 text-left text-xs font-medium text-gray-400 sm:text-right">{t("fullpreview.date")}</dt>
                <dd className="font-medium text-gray-900">{fmtDate(invoice.issueDate)}</dd>
              </div>
              {invoice.dueDate ? (
                <div className="flex items-baseline gap-3 sm:justify-end">
                  <dt className="w-12 shrink-0 text-left text-xs font-medium text-gray-400 sm:text-right">{t("fullpreview.due")}</dt>
                  <dd className="font-medium text-gray-900">{fmtDate(invoice.dueDate)}</dd>
                </div>
              ) : null}
              {invoice.reference ? (
                <div className="flex items-baseline gap-3 sm:justify-end">
                  <dt className="w-12 shrink-0 text-left text-xs font-medium text-gray-400 sm:text-right">{t("fullpreview.ref")}</dt>
                  <dd className="font-medium text-gray-900">{invoice.reference}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>

        {/* Bill to */}
        <div className="mt-8 border-t border-gray-100 pt-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">{t("fullpreview.billTo")}</div>
          <div className="mt-2 text-sm text-gray-800 leading-relaxed">
            <div className="font-semibold text-gray-900">{debtorName}</div>
            {contact.street ? <div>{contact.street}</div> : null}
            {contact.zipCode || contact.place ? (
              <div>{[contact.zipCode, contact.place].filter(Boolean).join(" ")}</div>
            ) : null}
            {contact.country && contact.country !== "CH" ? <div>{contact.country}</div> : null}
          </div>
        </div>

        {/* Items */}
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="pb-3 pr-2 font-semibold">{t("common.description")}</th>
                <th className="pb-3 text-right font-semibold">{t("fullpreview.qty")}</th>
                <th className="pb-3 text-right font-semibold">{t("common.unitPrice")}</th>
                <th className="pb-3 text-right font-semibold">{t("common.total")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 align-top">
                    <td className="py-3 pr-2 text-gray-800">{item.description}</td>
                    <td className="py-3 text-right text-gray-600">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-600">{formatSwissNumber(Number(item.unitPrice))}</td>
                    <td className="py-3 text-right font-medium text-gray-900">{formatSwissNumber(Number(item.lineTotal))} {currency}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-sm text-gray-400">{t("fullpreview.noLineItems")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-full space-y-2 text-sm sm:w-72">
            <div className="flex justify-between text-gray-600">
              <span>{t("fullpreview.subtotal")}</span>
              <span className="font-medium text-gray-800">{formatSwissNumber(subtotal)} {currency}</span>
            </div>
            {totalTax > 0 ? (
              <div className="flex justify-between text-gray-600">
                <span>{t("preview.vat")}</span>
                <span className="font-medium text-gray-800">{formatSwissNumber(totalTax)} {currency}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t-2 border-gray-900 pt-3 text-base font-bold text-gray-900">
              <span>{t("common.total")}</span>
              <span>{formatSwissNumber(totalGross)} {currency}</span>
            </div>
          </div>
        </div>

        {/* Payment part (QR-bill) */}
        <div className="mt-8 border-t border-gray-200 pt-6">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{t("preview.paymentPart")}</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/app/api/invoices/${invoice.id}/pdf?format=SVG`}
            alt={t("fullpreview.qrAlt")}
            className="mx-auto w-full max-w-[520px] h-auto"
          />
        </div>
      </div>
    </div>
  );
}
