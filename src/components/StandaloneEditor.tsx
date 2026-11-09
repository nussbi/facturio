"use client";
import { useState } from "react";
import PdfDocumentCanvas, { type SigningField, type FieldType } from "@/components/PdfDocumentCanvas";
import { useSigningT } from "@/components/use-signing-copy";
export default function StandaloneEditor({ id, title, fields: initialFields, editable }: { id: string; title: string; fields: SigningField[]; editable: boolean }) {
  const t = useSigningT();
  const [fields, setFields] = useState(initialFields);
  const [type, setType] = useState<FieldType>("signature");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (!fields.some(field => field.type === "signature")) { setError(t("signatureRequired")); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/upload/${encodeURIComponent(id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
      const body = await response.json();
      if (!response.ok) throw new Error(t(body.code || "saveFailed"));
      window.location.assign(`/send/${encodeURIComponent(id)}`);
    } catch (e) { setError(e instanceof Error ? e.message : t("saveFailed")); setBusy(false); }
  }
  return <main className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-6 sm:px-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><a href="/" className="text-sm text-indigo-700">← {t("backUpload")}</a><h1 className="mt-2 text-2xl font-semibold text-gray-900">{t("editStep")}</h1><p className="mt-2 text-sm text-gray-600">{title}</p></div>{editable && <button type="button" onClick={save} disabled={busy} className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{t(busy ? "saving" : "continueSend")}</button>}</header>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <PdfDocumentCanvas url={`/api/upload/${encodeURIComponent(id)}/document`} fields={fields} interactive={editable} activeType={type} onTypeChange={setType} onAdd={field => setFields(old => [...old, field])} onRemove={id => setFields(old => old.filter(field => field.id !== id))} onChange={next => setFields(old => old.map(field => field.id === next.id ? next : field))} />
    <p className="text-sm text-gray-500">{t("fieldsPlaced", { count: fields.length })}</p>
  </main>;
}
