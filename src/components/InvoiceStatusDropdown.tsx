"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Clock, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-context";
import { useToast } from "@/components/ui/Toast";
import posthog from "posthog-js";

type Status = "DRAFT" | "SENT" | "PAID" | "CANCELLED";

export default function InvoiceStatusDropdown({
  invoiceId,
  currentStatus,
}: {
  invoiceId: string;
  currentStatus: Status;
}) {
  const { t } = useLanguage();
  const { show } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const statusConfig = {
    DRAFT: { icon: FileText, color: "text-blue-700", bg: "bg-blue-100", border: "border-blue-400", hoverBg: "hover:bg-blue-200", label: t("status.draft") },
    SENT: { icon: Clock, color: "text-yellow-700", bg: "bg-yellow-100", border: "border-yellow-400", hoverBg: "hover:bg-yellow-200", label: t("status.sent") },
    PAID: { icon: CheckCircle, color: "text-green-700", bg: "bg-green-100", border: "border-green-400", hoverBg: "hover:bg-green-200", label: t("status.paid") },
    CANCELLED: { icon: AlertCircle, color: "text-red-700", bg: "bg-red-100", border: "border-red-400", hoverBg: "hover:bg-red-200", label: t("status.cancelled") },
  };

  const currentConfig = statusConfig[currentStatus];
  const Icon = currentConfig.icon;

  const handleStatusChange = async (newStatus: Status) => {
    setIsOpen(false);
    
    const endpoint =
      newStatus === "DRAFT"
        ? `/api/invoices/${invoiceId}/mark-draft`
        : newStatus === "SENT"
        ? `/api/invoices/${invoiceId}/mark-sent`
        : newStatus === "PAID"
        ? `/api/invoices/${invoiceId}/mark-paid`
        : newStatus === "CANCELLED"
        ? `/api/invoices/${invoiceId}/mark-cancelled`
        : null;

    if (!endpoint) return;

    startTransition(async () => {
      try {
        const res = await fetch(endpoint, { method: "PATCH" });
        if (res.ok) {
          posthog.capture("invoice_status_changed", {
            previous_status: currentStatus,
            status: newStatus,
          });
          window.location.reload();
        } else {
          show({ title: t("invoice.failedSend"), variant: "error" });
        }
      } catch {
        show({ title: t("invoice.failedSend"), variant: "error" });
      }
    });
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        title={t("status.changeStatus")}
        aria-label={t("status.changeStatus")}
        className={cn(
          "inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-sm font-medium transition-all border",
          currentConfig.bg,
          currentConfig.color,
          currentConfig.border,
          currentConfig.hoverBg,
          "hover:shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
          isPending && "opacity-50 cursor-wait"
        )}
      >
        <Icon className="h-4 w-4" />
        {currentConfig.label}
        <span className="h-4 w-px bg-current opacity-30" aria-hidden />
        <ChevronDown className="h-4 w-4 opacity-80" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 overflow-hidden">
            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100">
              {t("status.changeStatus")}
            </div>
            <div className="py-1">
              {(Object.keys(statusConfig) as Status[]).map((status) => {
                const config = statusConfig[status];
                const StatusIcon = config.icon;
                
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleStatusChange(status)}
                    disabled={status === currentStatus}
                    className={cn(
                      "w-full flex items-center gap-2 px-4 py-2 text-sm",
                      status === currentStatus
                        ? "bg-gray-100 text-gray-900 font-medium cursor-default"
                        : "text-gray-700 hover:bg-gray-50 cursor-pointer"
                    )}
                  >
                    <StatusIcon className="h-4 w-4" />
                    {config.label}
                    {status === currentStatus && (
                      <span className="ml-auto text-blue-600">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
