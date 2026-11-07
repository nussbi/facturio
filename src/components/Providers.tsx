"use client";

import React from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { LanguageProvider } from "@/components/language-context";
import type { Lang } from "@/lib/i18n";

export default function Providers({
  children,
  initialLang = "en",
}: {
  children: React.ReactNode;
  initialLang?: Lang;
}) {
  return (
    <LanguageProvider initialLang={initialLang}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </LanguageProvider>
  );
}
