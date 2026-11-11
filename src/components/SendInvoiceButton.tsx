"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/components/language-context";
import posthog from "posthog-js";

interface SendInvoiceButtonProps {
  invoiceId: string;
  contactEmail: string;
  status?: "DRAFT" | "SENT" | "PAID" | "CANCELLED";
  variant?: "primary" | "secondary" | "icon";
  className?: string;
  onSuccess?: () => void;
}

export default function SendInvoiceButton({ 
  invoiceId, 
  contactEmail,
  status,
  variant = "secondary",
  className = "",
  onSuccess 
}: SendInvoiceButtonProps) {
  const { t } = useLanguage();
  const [showDialog, setShowDialog] = useState(false);
  const [email, setEmail] = useState(contactEmail);
  const [loading, startTransition] = useTransition();
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { show } = useToast();
  const router = useRouter();
  const isResend = status === "SENT";

  async function handleSend() {
    if (!email) {
      setErrorMsg(t("invoice.emailRequired"));
      show({ title: t("invoice.emailRequired"), variant: "error" });
      return;
    }

    setSending(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/app/api/invoices/${invoiceId}/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ recipientEmail: email }),
      });

      if (res.ok) {
        posthog.capture("invoice_emailed", { is_resend: isResend });
        show({ title: t("invoice.sentSuccess"), variant: "success" });
        setShowDialog(false);
        window.location.reload();
        onSuccess?.();
      } else {
        let data: any = null;
        try { data = await res.json(); } catch { data = await res.text(); }
        const msg = typeof data === 'string' ? data : (data?.error || t("invoice.failedSend"));
        setErrorMsg(msg);
        show({ title: msg, variant: "error" });
      }
    } catch (error) {
      setErrorMsg(t("invoice.networkError"));
      show({ title: t("invoice.failedSend"), variant: "error" });
    } finally {
      setSending(false);
    }
  }

  const dialog = showDialog ? createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
      >
        <h2 className="text-xl font-semibold mb-4">{t(isResend ? "invoice.resendInvoice" : "invoice.sendInvoice")}</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">{t("invoice.recipientEmail")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@example.com"
            className="w-full border border-gray-300 rounded px-3 py-2"
            autoFocus
          />
          {errorMsg && (
            <p className="text-xs text-red-600 mt-2">{errorMsg}</p>
          )}
        </div>
        
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDialog(false); }}
            disabled={sending}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSend(); }}
            disabled={sending}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? t("invoice.sending") : t("invoice.send")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  if (variant === "icon") {
    return (
      <>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDialog(true); }}
          className={`p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors ${className}`}
          title={t("invoice.sendViaEmail")}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>
        {dialog}
      </>
    );
  }

  const buttonClass = variant === "primary"
    ? "px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
    : "px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDialog(true); }}
        className={`${buttonClass} ${className}`}
      >
        <span className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {t(isResend ? "invoice.resendInvoice" : "invoice.sendInvoice")}
        </span>
      </button>

      {dialog}
    </>
  );
}
