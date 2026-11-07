"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/components/language-context";
import { brandCopy } from "@/lib/brand-copy";

type Invoice = {
  id: string;
  number: number | null;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  status: "SENT" | "PAID";
  currency: "CHF" | "EUR";
  totalGross: number;
  paymentLinkUrl: string | null;
};

function money(value: number, currency: string, lang = "en") {
  return new Intl.NumberFormat(`${lang}-CH`, { style: "currency", currency }).format(value);
}
function date(value: string | null, lang = "en") {
  return value ? new Intl.DateTimeFormat(`${lang}-CH`, { dateStyle: "medium" }).format(new Date(value)) : "—";
}

export default function CustomerPortal({
  token, customerName, companyName, invoices,
}: { token: string; customerName: string; companyName: string; invoices: Invoice[] }) {
  const { lang } = useLanguage();
  const t = (key: Parameters<typeof brandCopy>[1]) => brandCopy(lang, key);
  const [filter, setFilter] = useState<"all" | "open" | "paid">("all");
  const visible = useMemo(() => invoices.filter((invoice) => filter === "all" || (filter === "paid" ? invoice.status === "PAID" : invoice.status === "SENT")), [invoices, filter]);
  const openTotal = invoices.filter((i) => i.status === "SENT").reduce((sum, i) => sum + i.totalGross, 0);
  const paidTotal = invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.totalGross, 0);
  const currency = invoices[0]?.currency || "CHF";

  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <span className="mb-6 inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{t("portal")}</span>
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-gray-500">{companyName || t("invoices")}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{t("hello")}{customerName ? `, ${customerName}` : ""}</h1>
      <p className="mt-2 text-sm text-gray-600">{t("portalIntro")}</p>
    </div>
    <section className="mb-6 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-500">{t("outstanding")}</p><p className="mt-2 text-2xl font-semibold">{money(openTotal, currency, lang)}</p></div>
      <div className="rounded-xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-500">{t("openInvoices")}</p><p className="mt-2 text-2xl font-semibold">{invoices.filter((i) => i.status === "SENT").length}</p></div>
      <div className="rounded-xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-500">{t("paidInvoices")}</p><p className="mt-2 text-2xl font-semibold text-emerald-700">{money(paidTotal, currency, lang)}</p></div>
    </section>
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <h2 className="font-semibold text-gray-900">{t("invoices")}</h2>
        <div className="flex gap-2" role="group" aria-label="Filter invoices">
          {(["all", "open", "paid"] as const).map((value) => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize ${filter === value ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{t(value)}</button>)}
        </div>
      </div>
      {visible.length ? <div className="divide-y divide-gray-100">{visible.map((invoice) => <article key={invoice.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-medium text-gray-900">{t("invoice")} #{invoice.number ?? invoice.id}</h3>
          <p className="mt-1 text-xs text-gray-500">{t("issued")} {date(invoice.issueDate, lang)}{invoice.status === "PAID" && invoice.paidAt ? ` · ${t("paid")} ${date(invoice.paidAt, lang)}` : invoice.dueDate ? ` · ${t("due")} ${date(invoice.dueDate, lang)}` : ""}</p>
          <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${invoice.status === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{invoice.status === "PAID" ? t("paid") : t("paymentDue")}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
          <strong className="text-sm text-gray-900">{money(invoice.totalGross, invoice.currency, lang)}</strong>
          <a href={`/app/api/public/portal/${encodeURIComponent(token)}/invoices/${encodeURIComponent(invoice.id)}/pdf`} target="_blank" rel="noreferrer" className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">{t("viewPdf")}</a>
          <a href={`/app/api/public/portal/${encodeURIComponent(token)}/invoices/${encodeURIComponent(invoice.id)}/pdf?download=1`} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">{t("downloadPdf")}</a>
          {invoice.status === "SENT" && invoice.paymentLinkUrl && <a href={invoice.paymentLinkUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">Pay invoice</a>}
        </div>
      </article>)}</div> : <div className="px-5 py-12 text-center text-sm text-gray-500">{t("noInvoices")}</div>}
    </section>
    <p className="mt-5 text-center text-xs text-gray-400">{t("portalPrivacy")}</p>
  </main>;
}
