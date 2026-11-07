"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/language-context";

export default function GlobalSearch({
  placeholder,
  inputClassName,
  className,
}: {
  placeholder?: string;
  inputClassName?: string;
  className?: string;
} = {}) {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Array<{ id: string; type: "customer"|"invoice"; label: string; url: string }>>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      const s = q.trim();
      if (!s) { setItems([]); return; }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(s)}`, { signal: ctrl.signal });
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
          setOpen(true);
        }
      } catch {}
      setLoading(false);
    }, 200);
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className={"relative " + (className || "")} ref={ref}>
      <input
        value={q}
        onChange={(e)=>setQ(e.target.value)}
        placeholder={placeholder ?? t("search.default")}
        className={(inputClassName || "w-56 text-sm") + " border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 bg-white"}
        onFocus={()=>{ if(items.length) setOpen(true); }}
        onKeyDown={(e)=>{ if (e.key==='Enter') { window.location.href = `/search?q=${encodeURIComponent(q)}`; } }}
        spellCheck={false}
        data-ms-editor={false}
      />
      {open && items.length>0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow">
          <ul className="max-h-64 overflow-auto text-sm">
            {items.map(it => (
              <li key={`${it.type}-${it.id}`}>
                <a href={it.url} className="block px-3 py-2 hover:bg-gray-50">
                  <span className="text-gray-500 mr-2">{it.type==='customer' ? '👤' : '🧾'}</span>
                  <span>{it.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
