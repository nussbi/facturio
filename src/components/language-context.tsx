"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { t as translate, LANG_KEY, LANGS, type Lang } from "@/lib/i18n";

export type { Lang };
export { LANG_KEY, LANGS };

type LanguageContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: (key: string) => key,
});

function persistCookie(l: Lang) {
  try {
    const domain = location.hostname.endsWith(".facturio.ch") || location.hostname === "facturio.ch" ? ";domain=.facturio.ch" : "";
    if (domain) document.cookie = `${LANG_KEY}=;path=/;max-age=0`;
    document.cookie = `${LANG_KEY}=${l};path=/;max-age=31536000;samesite=lax${domain}`;
    localStorage.setItem(LANG_KEY, l);
    document.documentElement.lang = l;
  } catch {
    /* ignore */
  }
}

export function LanguageProvider({
  children,
  initialLang = "en",
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = (l: Lang) => {
    setLangState(l);
    persistCookie(l);
  };

  const t = (key: string) => translate(lang, key);

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
