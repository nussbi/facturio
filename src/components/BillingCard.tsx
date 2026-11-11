"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/language-context";
import posthog from "posthog-js";

export default function BillingCard({ plan, autoUpgrade = false }: { plan: string; autoUpgrade?: boolean }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isPro = plan === "PRO";

  async function go(endpoint: "checkout" | "portal") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/stripe/${endpoint}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      if (data.url) {
        posthog.capture(endpoint === "checkout" ? "checkout_started" : "billing_portal_opened");
        window.location.href = data.url;
      } else {
        setError(t("settings.billingError"));
      }
    } catch (e: any) {
      setError(e?.message || t("settings.billingError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoUpgrade && !isPro && !loading) {
      go("checkout");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoUpgrade]);

  const planLabel = isPro ? t("settings.pro") : t("settings.free");

  return (
    <div className="rounded-lg border p-4 bg-white">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium">
            {t("settings.plan")} — {planLabel}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{t("settings.upgradeDesc")}</div>
          {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
        </div>
        {isPro ? (
          <button
            onClick={() => go("portal")}
            disabled={loading}
            className="shrink-0 rounded-md border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
          >
            {loading ? t("settings.redirecting") : t("settings.manageSubscription")}
          </button>
        ) : (
          <button
            onClick={() => go("checkout")}
            disabled={loading}
            className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t("settings.redirecting") : t("settings.upgradeToPro")}
          </button>
        )}
      </div>
    </div>
  );
}
