"use client";

import GlobalSearch from "@/components/GlobalSearch";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useLanguage } from "@/components/language-context";

export default function GlobalHeader() {
  const { t } = useLanguage();
  return (
    <div className="border-b bg-white/90 backdrop-blur-sm sticky top-0 z-30">
      <div className="mx-auto w-full max-w-5xl px-6 md:px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <GlobalSearch
              placeholder={t("header.searchPlaceholder")}
              inputClassName="w-full h-11 text-base px-4 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <Button asChild variant="default" size="lg" className="bg-brand-gradient shadow-sm hover:opacity-90 font-medium h-11 px-6 text-base">
            <Link href="/invoices/new">
              {t("header.addInvoice")}
            </Link>
          </Button>
          <div className="hidden md:flex items-center">
            <LanguageSwitcher variant="dropdown" />
          </div>
        </div>
      </div>
    </div>
  );
}
