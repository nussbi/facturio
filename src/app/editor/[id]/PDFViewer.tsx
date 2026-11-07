"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Set worker source to CDN (matching pdfjs-dist version)
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs";

interface PDFViewerProps {
  id: string;
  pageCount: number;
}

export function PDFViewer({ id, pageCount }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());

  useEffect(() => {
    let mounted = true;
    
    const loadPDF = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(`/api/upload/${id}/document`);
        if (!response.ok) throw new Error("Failed to load PDF");
        const data = await response.arrayBuffer();
        
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        
        if (!mounted) return;
        setPdfDoc(pdf);
        setLoading(false);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load PDF");
          setLoading(false);
        }
      }
    };

    loadPDF();
    return () => { mounted = false; };
  }, [id]);

  const renderPage = async (pageNum: number, canvas: HTMLCanvasElement) => {
    if (!pdfDoc) return;
    
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    
    const context = canvas.getContext("2d");
    if (!context) return;
    
    await page.render({ canvasContext: context, viewport }).promise;
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b" }}>
        Loading document…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#dc2626", textAlign: "center", padding: 20 }}>
        <div>
          <div style={{ fontSize: "1rem", fontWeight: "600", marginBottom: 8 }}>Failed to load PDF</div>
          <div style={{ fontSize: "0.9rem" }}>{error}</div>
          <a href={`/api/upload/${id}/document`} target="_blank" rel="noopener noreferrer" style={{ color: "#0ea5e9", marginTop: 12, display: "inline-block" }}>
            Open PDF in new tab →
          </a>
        </div>
      </div>
    );
  }

  if (!pdfDoc) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b" }}>
        Loading document…
      </div>
    );
  }

  useEffect(() => {
    if (!containerRef.current || !pdfDoc) return;
    
    const container = containerRef.current;
    const pagesToRender = Array.from({ length: pageCount }, (_, i) => i + 1);
    
    pagesToRender.forEach(async (pageNum) => {
      if (renderedPages.has(pageNum)) return;
      
      const pageDiv = document.createElement("div");
      pageDiv.style.marginBottom = "16px";
      pageDiv.style.textAlign = "center";
      pageDiv.style.background = "#f8fafc";
      pageDiv.style.borderRadius = "4px";
      pageDiv.style.overflow = "hidden";
      
      const canvas = document.createElement("canvas");
      pageDiv.appendChild(canvas);
      container.appendChild(pageDiv);
      
      await renderPage(pageNum, canvas);
      setRenderedPages(prev => new Set([...prev, pageNum]));
    });
  }, [pdfDoc, pageCount, renderedPages]);

  return (
    <div ref={containerRef} style={{ height: "100%", overflow: "auto", padding: "16px", background: "white" }}>
      {/* Pages will be rendered here */}
    </div>
  );
}