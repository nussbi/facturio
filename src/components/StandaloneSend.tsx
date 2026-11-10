"use client";
import { useState } from "react";
import { useSigningT } from "@/components/use-signing-copy";
export default function StandaloneSend({ id, title, initialEmail, initialStatus, guest, appBase }: { id: string; title: string; initialEmail: string; initialStatus: string; guest: boolean; appBase: string }) {
  const t = useSigningT();
  const [email, setEmail] = useState(initialEmail);
  const [senderEmail, setSenderEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(initialStatus !== "DRAFT");
  const [preview, setPreview] = useState(false);
  const [signingUrl, setSigningUrl] = useState("");
  const [error, setError] = useState("");
  async function send(event: React.FormEvent) {
    event.preventDefault(); if (busy || sent) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/send/${encodeURIComponent(id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipientEmail: email.trim(), ...(guest ? { senderEmail: senderEmail.trim() } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(t(["invalidEmail", "invalidSenderEmail", "signatureRequired", "notDraft", "requestChanged", "deliveryUnavailable"].includes(data.code) ? data.code : "sendFailed"));
      setSent(true); setPreview(Boolean(data.previewMode)); setSigningUrl(data.signingUrl || "");
    } catch (e) { setError(e instanceof Error ? e.message : t("sendFailed")); } finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
    <header><h1 className="text-2xl font-semibold text-gray-900">{t("sendTitle")}</h1><p className="mt-2 text-sm text-gray-600">{title}</p></header>
    {!sent ? <form onSubmit={send} className="f-card space-y-5 p-6"><p className="text-sm text-gray-600">{t("sendIntro")}</p>{guest && <div><label className="block text-sm font-medium">{t("senderEmail")}<input name="senderEmail" type="email" autoComplete="email" required maxLength={254} value={senderEmail} onChange={event => setSenderEmail(event.target.value)} aria-describedby="sender-email-help" className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3" /></label><p id="sender-email-help" className="mt-2 text-xs leading-5 text-gray-500">{t("senderEmailHelp")}</p></div>}<label className="block text-sm font-medium">{t("signerEmail")}<input name="recipientEmail" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3" /></label>{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}<button type="submit" disabled={busy} className="w-full rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{t(busy ? "sending" : "emailRequest")}</button><a href={`/editor/${encodeURIComponent(id)}`} className="block text-sm text-indigo-700">← {t("backEditor")}</a></form> : <section className="f-card space-y-4 p-6" aria-live="polite"><span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{t(initialStatus === "SIGNED" ? "SIGNED" : "sent")}</span><p className="text-sm text-gray-600">{t(preview ? "previewText" : initialStatus === "SIGNED" ? "alreadySigned" : initialStatus === "DRAFT" ? "sentText" : "awaiting")}</p>{signingUrl && <a href={signingUrl} target="_blank" rel="noreferrer" className="inline-block rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700">{t("openSigning")}</a>}</section>}
    {sent && guest && <section className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-6"><h2 className="text-xl font-semibold text-gray-900">{t("inviteTitle")}</h2><p className="mt-3 text-sm leading-6 text-gray-600">{t("inviteText")}</p><div className="mt-5 flex flex-wrap gap-3"><a href={`${appBase}/login?mode=signup`} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">{t("createAccount")}</a><a href={`${appBase}/login`} className="rounded-lg border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700">{t("login")}</a></div></section>}
    {sent && <a href="/" className="inline-block text-sm font-semibold text-indigo-700">{t("anotherDocument")} →</a>}
  </main>;
}
