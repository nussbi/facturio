"use client";

import { useEffect, useState } from "react";
import PdfDocumentCanvas, { type FieldType, type SigningField } from "@/components/PdfDocumentCanvas";
import { useSigningT } from "@/components/use-signing-copy";
import posthog from "posthog-js";
import quoteOcr from "@/lib/quote-ocr.cjs";
const { parseQuoteText } = quoteOcr;
type ContactOption = { id: string; label: string; email: string };
type Extracted = { currency: "CHF" | "EUR"; total: number | null; description: string };

export default function NewSigningRequest({ contacts, initialContactId = "" }: { contacts: ContactOption[]; initialContactId?: string }) {
  const t = useSigningT();
  const selectedContact = contacts.find(contact => contact.id === initialContactId);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [recipientEmail, setRecipientEmail] = useState(selectedContact?.email || "");
  const [contactId, setContactId] = useState(selectedContact?.id || "");
  const [documentType, setDocumentType] = useState("OTHER");
  const [activeType, setActiveType] = useState<FieldType>("signature");
  const [fields, setFields] = useState<SigningField[]>([]);
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [ocrLang, setOcrLang] = useState("eng");
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);


  function chooseFile(next: File | null) {
    if (next && ((next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) || next.size > 12 * 1024 * 1024)) { setError(t(next.size > 12 * 1024 * 1024 ? "pdfTooLarge" : "pdfOnly")); return; }
    if (url) URL.revokeObjectURL(url);
    setFile(next); setUrl(next ? URL.createObjectURL(next) : ""); setFields([]); setExtracted(null); setError("");
    if (next && !title) setTitle(next.name.replace(/\.pdf$/i, "").slice(0, 160));
  }

  async function extractQuote() {
    if (!file || !url) return;
    setWorking(true); setError(""); setStatus(t("readingText"));
    let worker: any;
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const loadingTask = pdfjs.getDocument({ url });
      const pdf = await loadingTask.promise;
      const chunks: string[] = [];
      let hasText = false;
      for (let number = 1; number <= pdf.numPages && number <= 50; number++) {
        setStatus(t("readingPage", { page: number, count: Math.min(pdf.numPages, 50) }));
        const page = await pdf.getPage(number);
        const content = await page.getTextContent();
        const lineMap = new Map<number, string[]>();
        for (const item of content.items as any[]) {
          if (!("str" in item) || !item.str.trim()) continue;
          const y = Math.round((item.transform?.[5] || 0) / 3) * 3;
          const row = lineMap.get(y) || []; row.push(item.str); lineMap.set(y, row);
        }
        const nativeText = [...lineMap.entries()].sort((a, b) => b[0] - a[0]).map(([, row]) => row.join(" ")).join("\n").trim();
        if (nativeText.length > 12) { chunks.push(nativeText); hasText = true; continue; }
        if (!worker) {
          setStatus(t("loadingOcr"));
          const { createWorker } = await import("tesseract.js");
          worker = await createWorker(ocrLang, 1, {
            workerPath: "/tesseract.worker.min.js",
            corePath: "/tesseract-core-simd-lstm.wasm.js",
            langPath: "https://tessdata.projectnaptha.com/4.0.0",
            logger: (message: any) => { if (message.status === "recognizing text") setStatus(t("ocrProgress", { page: number, percent: Math.round((message.progress || 0) * 100) })); },
          });
        }
        const viewport = page.getViewport({ scale: 1.6 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width; canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas rendering is unavailable in this browser.");
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const result = await worker.recognize(canvas);
        chunks.push(result.data.text || "");
        canvas.width = 0; canvas.height = 0;
      }
      const parsed = parseQuoteText(chunks.join("\n"));
      setExtracted({ currency: parsed.currency === "EUR" ? "EUR" : "CHF", total: parsed.total, description: parsed.description });
      setStatus(t("extractionDone"));
      await loadingTask.destroy();
    } catch (e) {
      setError(t("extractFailed"));
      setStatus("");
    } finally {
      await worker?.terminate?.();
      setWorking(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setWorking(true); setError(""); setStatus(t("saving"));
    try {
      if (!file) throw new Error(t("choosePdf"));
      if (fields.length === 0 || !fields.some((field) => field.type === "signature")) throw new Error(t("signatureRequired"));
      if (documentType === "QUOTE" && (!extracted?.total || extracted.total <= 0)) throw new Error(t("positiveQuote"));
      const form = new FormData();
      form.set("file", file); form.set("title", title); form.set("recipientEmail", recipientEmail);
      form.set("documentType", documentType); form.set("contactId", contactId); form.set("fields", JSON.stringify(fields));
      if (documentType === "QUOTE" && extracted) form.set("extractedData", JSON.stringify(extracted));
      const response = await fetch("/app/api/signing", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(t("saveFailed"));
      posthog.capture("signing_request_created", {
        document_type: documentType,
        field_count: fields.length,
        has_contact: Boolean(contactId),
      });
      window.location.assign(`/app/signing/${encodeURIComponent(data.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("saveFailed")); setStatus(""); setWorking(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
    <section className="min-w-0 space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="mb-2 block text-sm font-semibold text-gray-800">{t("pdfLabel")}</label>
        <input type="file" accept="application/pdf,.pdf" onChange={(e) => chooseFile(e.target.files?.[0] || null)} required className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-semibold file:text-emerald-800" />
        <p className="mt-2 text-xs text-gray-500">{t("pdfHelp")}</p>
      </div>
      {url && <div className="rounded-xl border border-gray-200 bg-gray-50 p-0">
        <div className="hidden">
          <label className="text-xs font-semibold text-gray-600">{t("addField")}</label>
          {(["signature", "initials", "date"] as FieldType[]).map((type) => <button key={type} type="button" onClick={() => setActiveType(type)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${activeType === type ? "bg-indigo-700 text-white" : "border border-gray-300 bg-white text-gray-700"}`}>{t(type)}</button>)}
          <span className="ml-auto text-xs text-gray-500">{t("fieldHint")}</span>
        </div>
        <PdfDocumentCanvas url={url} fields={fields} interactive activeType={activeType} onAdd={(field) => setFields((old) => [...old, field])} onRemove={(id) => setFields((old) => old.filter((f) => f.id !== id))} onChange={(next) => setFields(old => old.map(field => field.id === next.id ? next : field))} onTypeChange={setActiveType} />
      </div>}
    </section>
    <aside className="space-y-4">
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="font-semibold text-gray-900">{t("request")}</h2>
        <label className="block text-sm">{t("documentTitle")}<input required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
        <label className="block text-sm">{t("documentType")}<select value={documentType} onChange={(e) => { setDocumentType(e.target.value); setExtracted(null); }} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"><option value="OTHER">{t("OTHER")}</option><option value="AGREEMENT">{t("AGREEMENT")}</option><option value="QUOTE">{t("quoteOption")}</option></select></label>
        <label className="block text-sm">{t("customer")}<select value={contactId} onChange={(e) => { setContactId(e.target.value); const c = contacts.find((item) => item.id === e.target.value); if (c) setRecipientEmail(c.email); }} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"><option value="">{t("chooseCustomer")}</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.label} · {c.email}</option>)}</select></label>
        <label className="block text-sm">{t("signerEmail")}<input required type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
        {documentType === "QUOTE" && <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
          <div><h3 className="text-sm font-semibold text-emerald-950">{t("quoteToInvoice")}</h3><p className="mt-1 text-xs text-emerald-900">{t("ocrHelp")}</p></div>
          <label className="block text-xs text-gray-700">{t("ocrLanguage")}<select value={ocrLang} onChange={(e) => setOcrLang(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5"><option value="eng">{t("langEnglish")}</option><option value="deu">{t("langGerman")}</option><option value="fra">{t("langFrench")}</option><option value="ita">{t("langItalian")}</option></select></label>
          <button type="button" disabled={!file || working} onClick={extractQuote} className="w-full rounded-md border border-emerald-700 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 disabled:opacity-50">{t("extractQuote")}</button>
          {extracted && <div className="space-y-2 border-t border-emerald-200 pt-3">
            <label className="block text-xs">{t("description")}<input value={extracted.description} maxLength={200} onChange={(e) => setExtracted({ ...extracted, description: e.target.value })} className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5" /></label>
            <div className="grid grid-cols-[1fr_95px] gap-2"><label className="block text-xs">{t("amount")}<input type="number" min="0.01" step="0.01" value={extracted.total ?? ""} onChange={(e) => setExtracted({ ...extracted, total: e.target.value ? Number(e.target.value) : null })} className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5" /></label><label className="block text-xs">{t("currency")}<select value={extracted.currency} onChange={(e) => setExtracted({ ...extracted, currency: e.target.value as "CHF" | "EUR" })} className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5"><option>CHF</option><option>EUR</option></select></label></div>
          </div>}
        </div>}
        <div className="space-y-2 rounded-md border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600"><div>{t("fieldsPlaced", { count: fields.length })}</div><div>{fields.filter((f) => f.type === "signature").length} {t("signature")} · {fields.filter((f) => f.type === "initials").length} {t("initials")} · {fields.filter((f) => f.type === "date").length} {t("date")}</div></div>
        {status && <p aria-live="polite" className="text-xs text-gray-500">{status}</p>}{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <button type="submit" disabled={!file || working} className="w-full rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{t("saveRequest")}</button>
      </div>
    </aside>
  </form>;
}
