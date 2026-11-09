"use client";
import { useState } from "react";
import { useSigningT } from "@/components/use-signing-copy";
export default function SignUpload() {
  const t = useSigningT();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function choose(next: File | null) {
    setError(""); setFile(null);
    if (!next) return;
    if (next.type !== "application/pdf" && !next.name.toLowerCase().endsWith(".pdf")) { setError(t("pdfOnly")); return; }
    if (next.size > 12 * 1024 * 1024) { setError(t("pdfTooLarge")); return; }
    setFile(next);
  }
  async function upload() {
    if (!file || busy) return;
    setBusy(true); setError("");
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(t(body.code || "uploadFailed"));
      window.location.assign(`/editor/${encodeURIComponent(body.id)}`);
    } catch (e) { setError(e instanceof Error ? e.message : t("uploadFailed")); setBusy(false); }
  }
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
    <header><h1 className="text-3xl font-semibold tracking-tight text-gray-900">{t("title")}</h1><p className="mt-3 text-gray-600">{t("uploadIntro")}</p></header>
    <section className="f-card space-y-5 p-6 sm:p-8"><h2 className="text-xl font-semibold">{t("uploadStep")}</h2><label className="block rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-6"><span className="mb-3 block text-sm font-medium">{t("pdfLabel")}</span><input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={event => choose(event.target.files?.[0] || null)} className="block w-full text-sm" /></label><p className="text-xs text-gray-500">{t("pdfHelp")}</p>{file && <p className="rounded-lg bg-blue-50 p-3 text-sm font-medium text-blue-900">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}<button type="button" onClick={upload} disabled={!file || busy} className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{t(busy ? "uploading" : "continueEditor")}</button></section>
  </main>;
}
