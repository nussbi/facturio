import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { signingBucket, fetchSigningPdf } from "@/lib/signing";
export const runtime = "nodejs";
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const envelope = await prisma.signingEnvelope.findFirst({ where: { id, userId: user.id }, select: { id: true, status: true, documentKey: true, signedDocumentKey: true } });
  if (!envelope) return new NextResponse("Not found", { status: 404 });
  const key = envelope.status === "SIGNED" && envelope.signedDocumentKey ? envelope.signedDocumentKey : envelope.documentKey;
  const pdf = await fetchSigningPdf(signingBucket(), key);
  if (!pdf) return new NextResponse("Document unavailable", { status: 503 });
  const bytes = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  return new NextResponse(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="document-${envelope.id}.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
