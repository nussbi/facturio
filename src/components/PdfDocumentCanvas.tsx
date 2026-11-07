"use client";

import { useEffect, useRef, useState } from "react";

export type FieldType = "signature" | "initials" | "date";
export type SigningField = { id: string; type: FieldType; page: number; x: number; y: number; width: number; height: number; required: boolean };

export default function PdfDocumentCanvas({
  url, fields, interactive = false, activeType = "signature", fieldValues = {}, onAdd, onRemove,
}: {
  url: string;
  fields: SigningField[];
  interactive?: boolean;
  activeType?: FieldType;
  fieldValues?: Record<string, string>;
  onAdd?: (field: SigningField) => void;
  onRemove?: (fieldId: string) => void;
}) {
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const docRef = useRef<any>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    setPageCount(0);
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const doc = await pdfjs.getDocument({ url }).promise;
        if (!active) return;
        if (doc.numPages > 100) throw new Error("This document has more than 100 pages.");
        docRef.current = doc;
        setPageCount(doc.numPages);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not render this PDF.");
      }
    })();
    return () => { active = false; docRef.current = null; };
  }, [url]);

  useEffect(() => {
    let active = true;
    async function render() {
      const doc = docRef.current;
      if (!doc || !pageCount) return;
      setBusy(true);
      try {
        for (let n = 1; n <= pageCount; n++) {
          const wrapper = pageRefs.current[n - 1];
          if (!wrapper) continue;
          const page = await doc.getPage(n);
          const viewport = page.getViewport({ scale: 1.35 });
          const canvas = wrapper.querySelector("canvas");
          if (!canvas) continue;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas rendering is unavailable in this browser.");
          await page.render({ canvas, canvasContext: context, viewport }).promise;
          if (!active) return;
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not render this PDF.");
      } finally {
        if (active) setBusy(false);
      }
    }
    render();
    return () => { active = false; };
  }, [pageCount, url]);

  function addField(e: React.MouseEvent<HTMLDivElement>, page: number) {
    if (!interactive || !onAdd || (e.target as HTMLElement).closest("[data-signing-field]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const width = activeType === "signature" ? 0.30 : activeType === "initials" ? 0.14 : 0.21;
    const height = activeType === "date" ? 0.045 : 0.095;
    const x = Math.max(0, Math.min(1 - width, (e.clientX - rect.left) / rect.width - width / 2));
    const y = Math.max(0, Math.min(1 - height, (e.clientY - rect.top) / rect.height - height / 2));
    onAdd({ id: crypto.randomUUID(), type: activeType, page, x, y, width, height, required: true });
  }

  return <div className="space-y-5">
    {busy && !pageCount && <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading document preview…</div>}
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
    {Array.from({ length: pageCount }, (_, index) => {
      const page = index + 1;
      const pageFields = fields.filter((field) => field.page === page);
      return <div key={page} className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 text-xs text-gray-500"><span>Page {page} of {pageCount}</span>{interactive && <span>Click on the page to add a {activeType} field</span>}</div>
        <div ref={(node) => { pageRefs.current[index] = node; }} onClick={(e) => addField(e, page)} className={`relative ${interactive ? "cursor-crosshair" : ""}`}>
          <canvas className="block w-full" />
          {pageFields.map((field) => {
            const value = fieldValues[field.id];
            return <div key={field.id} data-signing-field="true" title={interactive ? "Click × to remove this field" : field.type} className={`absolute flex items-center justify-center overflow-hidden border-2 ${value ? "border-emerald-500 bg-emerald-50/50" : interactive ? "border-indigo-500 bg-indigo-100/50" : "border-amber-500 bg-amber-50/60"} text-center text-[10px] font-semibold text-gray-800`} style={{ left: `${field.x * 100}%`, top: `${field.y * 100}%`, width: `${field.width * 100}%`, height: `${field.height * 100}%` }}>
              {field.type === "date" && value ? <span>{value}</span> : (field.type !== "date" && value) ? <img alt={field.type} src={value} className="h-full w-full object-contain" /> : <span>{field.type === "initials" ? "Initials" : field.type === "date" ? "Date" : "Signature"}{field.required ? " *" : ""}</span>}
              {interactive && <button type="button" onClick={(event) => { event.stopPropagation(); onRemove?.(field.id); }} aria-label="Remove field" className="absolute right-0 top-0 z-10 flex h-5 w-5 items-center justify-center rounded-bl bg-indigo-700 text-xs leading-none text-white">×</button>}
            </div>;
          })}
        </div>
      </div>;
    })}
  </div>;
}
