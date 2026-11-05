import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type SigningField = { id: string; type: "signature" | "initials" | "date"; page: number; x: number; y: number; width: number; height: number; required: boolean };
type SigningBucket = {
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
  head(key: string): Promise<unknown | null>;
  put(key: string, data: Uint8Array, options?: { httpMetadata?: { contentType: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
};

export function signingBucket(): SigningBucket {
  const bucket = (getCloudflareContext().env as any).INVOICE_PDFS as SigningBucket | undefined;
  if (!bucket) throw new Error("INVOICE_PDFS R2 binding is not configured");
  return bucket;
}

function safeId(value: string) {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(value)) throw new Error("Invalid storage identifier");
  return value;
}

export function signingObjectKey(userId: string, envelopeId: string, signed = false) {
  return `users/${safeId(userId)}/signing/${safeId(envelopeId)}/${signed ? "signed" : "source"}.pdf`;
}

export async function loadPdf(buffer: Uint8Array) {
  const pdf = await PDFDocument.load(buffer, { ignoreEncryption: false, updateMetadata: false });
  if (!pdf.getPageCount() || pdf.getPageCount() > 100) throw new Error("PDF must have between 1 and 100 pages");
  return pdf;
}

export async function getPdfPageCount(buffer: Uint8Array) {
  return (await loadPdf(buffer)).getPageCount();
}

export async function applySigningFields(original: Uint8Array, fields: SigningField[], values: Record<string, string>) {
  const pdf = await loadPdf(original);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const field of fields) {
    const value = values[field.id];
    if (!value) continue;
    const page = pdf.getPage(field.page - 1);
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const boxWidth = field.width * pageWidth;
    const boxHeight = field.height * pageHeight;
    const x = field.x * pageWidth;
    const y = pageHeight - (field.y + field.height) * pageHeight;
    if (field.type === "date") {
      page.drawText(value, { x: x + 2, y: y + Math.max(2, (boxHeight - 10) / 2), size: Math.min(12, boxHeight * 0.55), maxWidth: boxWidth - 4, font, color: rgb(0.12, 0.16, 0.22) });
      continue;
    }
    const base64 = value.slice("data:image/png;base64,".length);
    const image = await pdf.embedPng(Buffer.from(base64, "base64"));
    const scale = Math.min((boxWidth - 4) / image.width, (boxHeight - 4) / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    page.drawImage(image, { x: x + (boxWidth - drawWidth) / 2, y: y + (boxHeight - drawHeight) / 2, width: drawWidth, height: drawHeight });
  }
  return new Uint8Array(await pdf.save({ useObjectStreams: false }));
}

export async function saveSigningPdf(bucket: SigningBucket, key: string, pdf: Uint8Array, meta: Record<string, string>) {
  if (pdf.length < 8 || new TextDecoder().decode(pdf.slice(0, 5)) !== "%PDF-") throw new Error("Invalid PDF document");
  await bucket.put(key, pdf, { httpMetadata: { contentType: "application/pdf" }, customMetadata: meta });
  if (!(await bucket.head(key))) throw new Error("R2 document write was not confirmed");
}

export async function fetchSigningPdf(bucket: SigningBucket, key: string) {
  const obj = await bucket.get(key);
  return obj ? new Uint8Array(await obj.arrayBuffer()) : null;
}
