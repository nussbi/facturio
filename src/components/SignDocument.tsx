"use client";

import { useEffect, useRef, useState } from "react";
import { useSigningT } from "@/components/use-signing-copy";
import PdfDocumentCanvas, { type SigningField } from "@/components/PdfDocumentCanvas";

function SignaturePad({ label, onSave }: { label: string; onSave: (data: string) => void }) {
  const t = useSigningT();
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = ref.current!; const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  }
  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = ref.current!; canvas.setPointerCapture(event.pointerId); const p = point(event);
    const ctx = canvas.getContext("2d")!; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#142f46"; drawing.current = true;
  }
  function move(event: React.PointerEvent<HTMLCanvasElement>) { if (!drawing.current) return; const p = point(event); const ctx = ref.current!.getContext("2d")!; ctx.lineTo(p.x, p.y); ctx.stroke(); }
  function end() { if (!drawing.current) return; drawing.current = false; onSave(ref.current!.toDataURL("image/png")); }
  function clear() { const canvas = ref.current!; canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height); onSave(""); }
  return <div><div className="mb-1 flex items-center justify-between"><label className="text-sm font-semibold text-gray-800">{label}</label><button type="button" onClick={clear} className="text-xs text-gray-500 underline">{t("clear")}</button></div><canvas ref={ref} width={560} height={220} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} className="h-[160px] w-full touch-none rounded-md border border-gray-300 bg-white" aria-label={label} /><p className="mt-1 text-xs text-gray-500">{t("drawHint")}</p></div>;
}

type Envelope = { title: string; originalFileName: string; documentType: string; pageCount: number; fields: SigningField[]; status: "SENT" | "SIGNED"; signerName: string | null; signedAt: string | null; documentUrl: string };

export default function SignDocument({ token }: { token: string }) {
  const t = useSigningT();
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [signature, setSignature] = useState("");
  const [initials, setInitials] = useState("");
  const [signerName, setSignerName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => { fetch(`/api/sign/${encodeURIComponent(token)}`, { cache: "no-store" }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(t("signingUnavailable")); setEnvelope(d); }).catch((e) => setError(e.message)); }, [token]);
  const signatureFields = envelope?.fields.filter((field) => field.type === "signature") || [];
  const initialsFields = envelope?.fields.filter((field) => field.type === "initials") || [];
  const hasDateFields = envelope?.fields.some((field) => field.type === "date") || false;

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setWorking(true); setError("");
    try {
      if (!signature) throw new Error(t("signatureRequired"));
      if (initialsFields.length && !initials) throw new Error(t("initialsRequired"));
      const date = new Date().toISOString().slice(0, 10);
      const values: Record<string, string> = {};
      for (const field of signatureFields) values[field.id] = signature;
      for (const field of initialsFields) values[field.id] = initials;
      for (const field of envelope!.fields.filter((f) => f.type === "date")) values[field.id] = date;
      const response = await fetch(`/api/sign/${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signerName, values, accepted }) });
      const data = await response.json();
      if (!response.ok) throw new Error(t("signFailed"));
      setDone(true); setEnvelope((old) => old ? { ...old, status: "SIGNED", signerName, signedAt: data.signedAt } : old);
    } catch (e) { setError(e instanceof Error ? e.message : t("signFailed")); }
    finally { setWorking(false); }
  }

  if (!envelope) return <main className="mx-auto max-w-3xl px-4 py-12"><div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">{error ? <p role="alert" className="text-rose-700">{error}</p> : <p className="text-gray-600">{t("loadingSecure")}</p>}</div></main>;
  const fieldValues: Record<string, string> = {};
  if (envelope.status === "SENT") for (const field of envelope.fields) {
    if (field.type === "signature") fieldValues[field.id] = signature;
    else if (field.type === "initials") fieldValues[field.id] = initials;
    else fieldValues[field.id] = new Date().toISOString().slice(0, 10);
  }
  return <main className="min-h-screen bg-transparent px-4 py-6 sm:py-10">
    <div className="mx-auto max-w-[1600px]">
      <header className="mb-6 flex items-center justify-between"><span className="rounded-full bg-white px-3 py-1 text-xs text-gray-500">{t("secureSigning")}</span></header>
      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5"><h1 className="text-xl font-bold text-gray-900">{envelope.title}</h1><p className="mt-1 text-sm text-gray-500">{envelope.originalFileName} · {t("pageCount", { count: envelope.pageCount })}</p>{done && <div className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-900">{t("signSuccess", { name: envelope.signerName || "" })}</div>}{envelope.status === "SIGNED" && !done && <div className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">{t("alreadySigned")}</div>}</div>
      {envelope.status === "SIGNED" ? <div className="mb-5"><a href={envelope.documentUrl} className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{t("downloadSigned")}</a></div> : <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0"><PdfDocumentCanvas url={envelope.documentUrl} fields={envelope.fields} fieldValues={fieldValues} /></section>
        <form onSubmit={submit} className="h-fit space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900">{t("yourSignature")}</h2>
          <label className="block text-sm">{t("legalName")}<input required maxLength={120} value={signerName} onChange={(e) => setSignerName(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
          <SignaturePad label={t("signature")} onSave={setSignature} />
          {initialsFields.length > 0 && <SignaturePad label={t("initials")} onSave={setInitials} />}
          {hasDateFields && <p className="rounded-md bg-slate-50 p-3 text-xs text-gray-600">{t("autoDate")}</p>}
          <label className="flex items-start gap-2 text-xs leading-5 text-gray-700"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" required /><span>{t("consent")}</span></label>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <button type="submit" disabled={working} className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{t(working ? "signing" : "signDocument")}</button>
          <p className="text-[11px] leading-4 text-gray-500">{t("signingDisclaimer")}</p>
        </form>
      </div>}
      <footer className="mt-8 text-center text-xs text-gray-400">{t("poweredBy")}</footer>
    </div>
  </main>;
}
