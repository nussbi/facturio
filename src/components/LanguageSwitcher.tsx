"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage, LANGS, type Lang } from "@/components/language-context";

export default function LanguageSwitcher({
  className = "",
}: {
  className?: string;
  /**
   * @deprecated "flags" now renders the same text-code dropdown as "dropdown".
   */
  variant?: "flags" | "dropdown";
}) {
  return <DropdownSwitcher className={className} />;
}

function DropdownSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Change language"
        onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white h-11 px-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <span className="text-xs font-bold tracking-widest text-gray-700">
          {current.code.toUpperCase()}
        </span>
        <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
          {LANGS.map((l) => (
            <button
              key={l.code}
              role="menuitemradio"
              aria-checked={l.code === lang}
              type="button"
              onClick={() => {
                if (l.code !== lang) {
                  setLang(l.code as Lang);
                  window.location.reload();
                  return;
                }
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                l.code === lang ? "font-semibold text-gray-900" : "text-gray-600"
              }`}
            >
              <span className="inline-flex w-7 shrink-0 items-center text-xs font-bold tracking-wide text-gray-500">
                {l.code.toUpperCase()}
              </span>
              <span>{l.label}</span>
              {l.code === lang && <span className="ml-auto text-blue-600">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
