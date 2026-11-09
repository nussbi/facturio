"use client";
import { useState } from "react";
import { useSigningT } from "@/components/use-signing-copy";
export default function SigningActions({ id, initialStatus, documentType, extractedData, initialInvoiceId }: { id: string; initialStatus: string; documentType: string; extractedData: string | null; initialInvoiceId: string | null }) {
  const t = useSigningT();
  const [status, setStatus] = useState(initialStatus);
  const [invoiceId, setInvoiceId] = useState(initialInvoiceId);
  const [signingUrl, setSigningUrl] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const extraction = (() => { try { return extractedData ? JSON.parse(extractedData) : null; } catch { return null; } })();
  async function send() {
    setBusy(true); setError(""); setMessage("");
    try { const res = await fetch(`/app/api/signing/${encodeURIComponent(id)}/send`, { method: "POST" }); const data = await res.json(); if (!res.ok) throw new Error(t(["invalidEmail", "signatureRequired", "notDraft", "requestChanged", "deliveryUnavailable"].includes(data.code) ? data.code : "sendFailed")); setStatus("SENT"); setSigningUrl(data.signingUrl || ""); setMessage(t(data.previewMode ? "previewText" : "sentText")); }
    catch (e) { setError(e instanceof Error ? e.message : t("sendFailed")); } finally { setBusy(false); }
  }
  async function copy() { try { await navigator.clipboard.writeText(signingUrl); setMessage(t("copied")); } catch { setError(t("copyFailed")); } }
  async function createInvoice() {
    setBusy(true); setError(""); setMessage("");
    try { const res = await fetch(`/app/api/signing/${encodeURIComponent(id)}/invoice-draft`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmed }) }); const data = await res.json(); if (!res.ok) throw new Error(t("invoiceFailed")); setInvoiceId(data.invoiceId); setMessage(t("invoiceDone")); }
    catch (e) { setError(e instanceof Error ? e.message : t("invoiceFailed")); } finally { setBusy(false); }
  }
  return <div className="space-y-4">
    {status === "DRAFT" && <button type="button" onClick={send} disabled={busy} className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{t(busy ? "sending" : "emailRequest")}</button>}
    {status === "SENT" && <div className="space-y-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><p>{t("awaiting")}</p>{signingUrl && <div className="flex flex-wrap gap-3"><a href={signingUrl} target="_blank" rel="noreferrer" className="font-semibold underline">{t("openSigning")}</a><button type="button" onClick={copy} className="text-xs font-semibold underline">{t("copyLink")}</button></div>}</div>}
    {status === "SIGNED" && <a href={`/app/api/signing/${encodeURIComponent(id)}/document?download=1`} className="block rounded-lg bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white">{t("downloadSigned")}</a>}
    {documentType === "QUOTE" && status === "SIGNED" && !invoiceId && extraction && <section className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4"><h3 className="font-semibold text-emerald-950">{t("createInvoice")}</h3><p className="text-xs text-emerald-900">{t("invoiceReview")}</p><dl className="space-y-2 text-sm"><div><dt className="text-xs text-gray-600">{t("description")}</dt><dd>{extraction.description}</dd></div><div><dt className="text-xs text-gray-600">{t("suggestedTotal")}</dt><dd className="font-semibold">{extraction.currency} {Number(extraction.total).toFixed(2)}</dd></div></dl><label className="flex items-start gap-2 text-xs text-gray-700"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1" /><span>{t("approveInvoice")}</span></label><button type="button" onClick={createInvoice} disabled={busy || !confirmed} className="w-full rounded-lg border border-emerald-800 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 disabled:opacity-50">{t(busy ? "creatingInvoice" : "createInvoice")}</button></section>}
    {invoiceId && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><p>{t("invoiceDone")}</p><a className="mt-2 inline-block font-semibold underline" href="/app/invoices">{t("openInvoices")} →</a></div>}
    {message && <p aria-live="polite" className="text-sm text-emerald-800">{message}</p>}{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
  </div>;
}
