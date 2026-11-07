"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { useLanguage } from "@/components/language-context";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallAppButton() {
  const { t } = useLanguage();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const nav = navigator as unknown as { standalone?: boolean };
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true
    );
    setIsIOS(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (standalone) return null;

  if (isIOS) {
    return (
      <p className="px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        {t("nav.iosHint")}
      </p>
    );
  }

  const gradient = {
    backgroundImage: "linear-gradient(to right, #4f46e5, #2563eb, #06b6d4)",
  };
  const btnClass =
    "w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90";

  if (deferred) {
    return (
      <button
        type="button"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
        className={btnClass}
        style={gradient}
      >
        <Smartphone className="h-4 w-4" />
        {t("nav.installApp")}
      </button>
    );
  }

  return (
    <a href="/facturio-android.apk" download className={btnClass} style={gradient}>
      <Download className="h-4 w-4" />
      {t("nav.downloadApp")}
    </a>
  );
}
