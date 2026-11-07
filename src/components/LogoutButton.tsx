"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-context";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const { t } = useLanguage();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const marketingUrl =
          process.env.NEXT_PUBLIC_MARKETING_URL || "https://facturio.ch";
        window.location.href = marketingUrl;
      } else {
        setPending(false);
      }
    } catch (error) {
      console.error("Logout failed:", error);
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <LogOut className="h-4 w-4" />
      {t("nav.logout")}
    </button>
  );
}
