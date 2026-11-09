"use client";
import { useEffect, useRef, useState } from "react";
import { useSigningT } from "@/components/use-signing-copy";
const { newSigningField, editSigningField } = require("@/lib/signing-fields.cjs");
export type FieldType = "signature" | "initials" | "date";
export type SigningField = { id: string; type: FieldType; page: number; x: number; y: number; width: number; height: number; required: boolean };
type Props = { url: string; fields: SigningField[]; interactive?: boolean; activeType?: FieldType; fieldValues?: Record<string, string>; onAdd?: (field: SigningField) => void; onRemove?: (id: string) => void; onChange?: (field: SigningField) => void; onTypeChange?: (type: FieldType) => void };
export default function PdfDocumentCanvas({ url, fields, interactive = false, activeType = "signature", fieldValues = {}, onAdd, onRemove, onChange, onTypeChange }: Props) {
  const t = useSigningT();
  const [doc, setDoc] = useState<any>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [fallbackFull, setFallbackFull] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    let task: any;
    setDoc(null); setError(false);
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        if (!active) return;
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        task = pdfjs.getDocument({ url, withCredentials: true });
        const next = await task.promise;
        if (!active) return;
        if (!next.numPages || next.numPages > 100) throw new Error("Invalid page count");
        setDoc(next);
      } catch { if (active) setError(true); }
    })();
    return () => { active = false; task?.destroy()?.catch?.(() => undefined); };
  }, [url, attempt]);
  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  const full = fullscreen || fallbackFull;
  useEffect(() => {
    if (!full) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [full]);
  async function toggleFull() {
    if (full) { setFallbackFull(false); if (document.fullscreenElement) await document.exitFullscreen(); return; }
    try { if (!root.current?.requestFullscreen) throw new Error("unsupported"); await root.current.requestFullscreen(); }
    catch { setFallbackFull(true); }
  }
  return <div ref={root} className={`${full ? "fixed inset-0 z-[80] h-screen" : "rounded-xl border border-gray-200"} flex min-w-0 flex-col bg-slate-100`}>
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white p-3">
      {interactive && onTypeChange && <div className="flex flex-wrap gap-1" role="group" aria-label={t("addField")}>
        {(["signature", "initials", "date"] as FieldType[]).map(type => <button type="button" key={type} aria-pressed={activeType === type} onClick={() => onTypeChange(type)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeType === type ? "bg-indigo-600 text-white" : "border border-gray-200 text-gray-700"}`}>{t(type)}</button>)}
      </div>}
      <div className="ml-auto flex flex-wrap items-center gap-1">
        <button type="button" aria-label={t("zoomOut")} disabled={zoom <= 0.5} onClick={() => setZoom(value => Math.max(0.5, value - 0.25))} className="h-10 w-10 rounded-lg border border-gray-200 text-xl disabled:opacity-40">−</button>
        <span className="w-12 text-center text-xs tabular-nums text-gray-600">{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label={t("zoomIn")} disabled={zoom >= 2.5} onClick={() => setZoom(value => Math.min(2.5, value + 0.25))} className="h-10 w-10 rounded-lg border border-gray-200 text-xl disabled:opacity-40">+</button>
        <button type="button" onClick={() => setZoom(1)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium">{t("fitWidth")}</button>
        <button type="button" onClick={toggleFull} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium">{t(full ? "exitFullscreen" : "fullscreen")}</button>
      </div>
      {interactive && <p className="w-full text-xs text-gray-500">{t("fieldHint")}</p>}
    </div>
    <div className={`min-h-0 overflow-auto p-3 sm:p-4 ${full ? "flex-1" : "max-h-[82vh]"}`}>
      {!doc && !error && <p aria-live="polite" className="rounded-lg bg-white p-6 text-sm text-gray-600">{t("loadingPdf")}</p>}
      {error && <div role="alert" className="space-y-3 rounded-lg border border-rose-200 bg-white p-5 text-sm text-rose-700"><p>{t("renderFailed")}</p><button type="button" onClick={() => setAttempt(value => value + 1)} className="mr-4 font-semibold underline">{t("retry")}</button><a href={url} target="_blank" rel="noreferrer" className="font-semibold underline">{t("openPdf")}</a></div>}
      {doc && <div className="mx-auto space-y-5" style={{ width: `${zoom * 100}%` }}>
        {Array.from({ length: doc.numPages }, (_, index) => <PdfPage key={`${url}:${attempt}:${index}`} doc={doc} page={index + 1} count={doc.numPages} fields={fields.filter(field => field.page === index + 1)} values={fieldValues} interactive={interactive} activeType={activeType} onAdd={onAdd} onRemove={onRemove} onChange={onChange} />)}
      </div>}
    </div>
  </div>;
}
function PdfPage({ doc, page, count, fields, values, interactive, activeType, onAdd, onRemove, onChange }: { doc: any; page: number; count: number; fields: SigningField[]; values: Record<string, string>; interactive: boolean; activeType: FieldType; onAdd?: Props["onAdd"]; onRemove?: Props["onRemove"]; onChange?: Props["onChange"] }) {
  const t = useSigningT();
  const wrapper = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ field: SigningField; mode: "move" | "resize"; x: number; y: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 595, height: 842 });
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!wrapper.current) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: "500px" });
    observer.observe(wrapper.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let active = true;
    let task: any;
    (async () => {
      try {
        const pdfPage = await doc.getPage(page);
        if (!active || !canvas.current) return;
        const viewport = pdfPage.getViewport({ scale: 1.75 });
        setDimensions({ width: viewport.width, height: viewport.height });
        canvas.current.width = Math.ceil(viewport.width); canvas.current.height = Math.ceil(viewport.height);
        const context = canvas.current.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");
        task = pdfPage.render({ canvas: canvas.current, canvasContext: context, viewport });
        await task.promise;
        if (active) setLoaded(true);
      } catch { if (active) setFailed(true); }
    })();
    return () => { active = false; task?.cancel?.(); };
  }, [doc, page, visible]);
  function start(event: React.PointerEvent<HTMLElement>, field: SigningField, mode: "move" | "resize") {
    if (!interactive || !onChange) return;
    event.preventDefault(); event.stopPropagation();
    drag.current = { field: { ...field }, mode, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: React.PointerEvent<HTMLElement>) {
    const state = drag.current; const rect = wrapper.current?.getBoundingClientRect();
    if (!state || !rect || !onChange) return;
    event.preventDefault(); onChange(editSigningField(state.field, state.mode, (event.clientX - state.x) / rect.width, (event.clientY - state.y) / rect.height));
  }
  function add(event: React.MouseEvent<HTMLDivElement>) {
    if (!interactive || !onAdd || !loaded || (event.target as HTMLElement).closest("[data-signing-field]")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    onAdd(newSigningField(activeType, page, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height, crypto.randomUUID()));
  }
  return <section className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm" aria-label={t("pageOf", { page, count })}>
    <div className="border-b border-gray-100 px-3 py-2 text-xs text-gray-500">{t("pageOf", { page, count })}</div>
    <div ref={wrapper} onClick={add} data-pdf-page={page} className={`relative ${interactive && loaded ? "cursor-crosshair" : ""}`} style={{ aspectRatio: `${dimensions.width}/${dimensions.height}` }}>
      <canvas ref={canvas} className="block h-full w-full" aria-label={t("pageOf", { page, count })} />
      {!loaded && <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">{t(failed ? "renderFailed" : "loadingPdf")}</div>}
      {loaded && fields.map(field => <div key={field.id} data-signing-field={field.id} tabIndex={interactive ? 0 : undefined} aria-label={`${t(field.type)} · ${t("moveField")}`} onPointerDown={event => { if (!(event.target as HTMLElement).closest("button")) start(event, field, "move"); }} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onKeyDown={event => { const keys: Record<string, [number, number]> = { ArrowLeft: [-0.005, 0], ArrowRight: [0.005, 0], ArrowUp: [0, -0.005], ArrowDown: [0, 0.005] }; if (interactive && onChange && keys[event.key]) { event.preventDefault(); const [x, y] = keys[event.key]; onChange(editSigningField(field, event.shiftKey ? "resize" : "move", x, y)); } }} className={`absolute flex touch-none items-center justify-center border-2 text-center text-sm font-semibold text-gray-800 ${interactive ? "cursor-move border-indigo-500 bg-indigo-100/60" : values[field.id] ? "border-emerald-500 bg-emerald-50/40" : "border-amber-500 bg-amber-50/50"}`} style={{ left: `${field.x * 100}%`, top: `${field.y * 100}%`, width: `${field.width * 100}%`, height: `${field.height * 100}%` }}>
        {values[field.id] ? field.type === "date" ? <span>{values[field.id]}</span> : <img alt={t(field.type)} src={values[field.id]} className="h-full w-full object-contain" /> : <span className="px-2">{t(field.type)}{field.required ? " *" : ""}</span>}
        {interactive && <><button type="button" aria-label={t("removeField")} onClick={event => { event.stopPropagation(); onRemove?.(field.id); }} className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center rounded-bl-lg bg-indigo-700 text-lg leading-none text-white">×</button><button type="button" aria-label={t("resizeField")} onPointerDown={event => start(event, field, "resize")} onPointerMove={move} onPointerUp={() => { drag.current = null; }} className="absolute bottom-0 right-0 h-6 w-6 touch-none cursor-se-resize rounded-tl-lg bg-indigo-700 text-white">↘</button></>}
      </div>)}
    </div>
  </section>;
}
