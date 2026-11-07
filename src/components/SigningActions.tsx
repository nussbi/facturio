"use client";
import { useState } from "react";

export default function SigningActions({ id, initialStatus, documentType, extractedData, initialInvoiceId }: { id: string; initialStatus: string; documentType: string; extractedData: string | null; initialInvoiceId: string | null }) {
  const [status, setStatus] = useState(initialStatus);
  const [invoiceId, setInvoiceId] = useState(initialInvoiceId);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const extraction = (() => { try { return extractedData ? JSON.parse(extractedData) : null; } catch { return null; } })();
  async function send() {
    setBusy(true); setError(""); setMessage("");
    try { const res = await fetch(`/app/api/signing/${encodeURIComponent(id)}/send`, { method: "POST" }); const data = await res.json(); if (!res.ok) throw new Error(data.error || "Could not send request."); setStatus("SENT"); setSigningUrl(data.signingUrl || null); setMessage(data.previewMode ? "Staging mode: no email was sent. Share the link below to test signing." : "Signing request emailed to the recipient."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not send request."); } finally { setBusy(false); }
  }
  async function copySigningLink() {
    if (!signingUrl) return;
    try { await navigator.clipboard.writeText(signingUrl); setMessage("Signing link copied."); }
    catch { setError("Could not copy the signing link. Open it directly below."); }
  }
  async function createInvoice() {
    setBusy(true); setError(""); setMessage("");
    try { const res = await fetch(`/app/api/signing/${encodeURIComponent(id)}/invoice-draft`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmed }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error || "Could not create invoice draft."); setInvoiceId(data.invoiceId); setMessage("Invoice draft created. Review it before sending."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not create invoice draft."); } finally { setBusy(false); }
  }
  return <div className="space-y-4">
    {status === "DRAFT" && <button onClick={send} disabled={busy} className="w-full rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Sending…" : "Email signature request"}</button>}
    {status === "SENT" && <div className="space-y-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900"><p>Awaiting signature from recipient.</p>{signingUrl && <div className="flex flex-wrap items-center gap-3"><a href={signingUrl} target="_blank" rel="noreferrer" className="font-semibold underline">Open signing link</a><button type="button" onClick={copySigningLink} className="text-xs font-semibold underline">Copy link</button></div>}</div>}
    {status === "SIGNED" && <a href={`/app/api/signing/${encodeURIComponent(id)}/document`} className="block rounded-md bg-emerald-700 px-4 py-2.5 text-center text-sm font-semibold text-white">Download signed PDF</a>}
    {documentType === "QUOTE" && status === "SIGNED" && !invoiceId && extraction && <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div><h3 className="font-semibold text-emerald-950">Create invoice draft</h3><p className="mt-1 text-xs text-emerald-900">Review the OCR/text-extracted suggestion. It will create a DRAFT invoice only—Facturio will not send it automatically.</p></div>
      <dl className="grid grid-cols-2 gap-2 text-sm"><div><dt className="text-xs text-gray-600">Description</dt><dd className="font-medium">{extraction.description}</dd></div><div><dt className="text-xs text-gray-600">Suggested total</dt><dd className="font-semibold">{extraction.currency} {Number(extraction.total).toFixed(2)}</dd></div></dl>
      <label className="flex items-start gap-2 text-xs text-gray-700"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" /><span>I reviewed and approve these details for a draft invoice. I will review the invoice before sending.</span></label>
      <button onClick={createInvoice} disabled={busy || !confirmed} className="w-full rounded-md border border-emerald-800 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 disabled:opacity-50">{busy ? "Creating draft…" : "Create draft invoice"}</button>
    </div>}
    {invoiceId && <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900"><p>Draft invoice created; review before sending.</p><a className="mt-1 inline-block font-semibold underline" href="/app/invoices">Open invoices →</a></div>}
    {message && <p aria-live="polite" className="text-sm text-emerald-800">{message}</p>}{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
  </div>;
}
