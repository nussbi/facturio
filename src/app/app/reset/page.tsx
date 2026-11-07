"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useLanguage } from "@/components/language-context";

function LoadingFallback() {
  const { t } = useLanguage();
  return (
    <div className="mx-auto max-w-md p-6">
      <div className="text-center">{t("common.loading")}</div>
    </div>
  );
}

const ResetContent = dynamic(() => import("@/components/ResetPageInner"), {
  ssr: false,
  loading: LoadingFallback,
});

export default function ResetPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetContent />
    </Suspense>
  );
}
