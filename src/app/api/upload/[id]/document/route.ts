import { NextRequest, NextResponse } from "next/server";
import { getManagedSigningEnvelope, isStandaloneSigningHost } from "@/server/signing-access";
import { signingBucket, fetchSigningPdf } from "@/lib/signing";
export const runtime = "nodejs";
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isStandaloneSigningHost()) return new NextResponse("Not found", { status: 404 });
  const envelope = await getManagedSigningEnvelope((await params).id);
  if (!envelope) return new NextResponse("Not found", { status: 404 });
  const key = envelope.status === "SIGNED" && envelope.signedDocumentKey ? envelope.signedDocumentKey : envelope.documentKey;
  const pdf = await fetchSigningPdf(signingBucket(), key);
  if (!pdf) return new NextResponse("Document unavailable", { status: 503, headers: { "Cache-Control": "private, no-store" } });
  return new NextResponse(pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="document-${envelope.id}.pdf"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
}
