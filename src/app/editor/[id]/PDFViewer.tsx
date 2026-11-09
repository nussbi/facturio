"use client";
import PdfDocumentCanvas from "@/components/PdfDocumentCanvas";
export function PDFViewer({ id }: { id: string; pageCount: number }) {
  return <PdfDocumentCanvas url={`/api/upload/${encodeURIComponent(id)}/document`} fields={[]} />;
}
