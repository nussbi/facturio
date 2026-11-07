import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { signingBucket, fetchSigningPdf } from "@/lib/signing";
import signingCore from "@/lib/signing-core.cjs";
const { hashOpaqueToken } = signingCore;
export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) return new NextResponse("Not found", { status: 404 });
  const envelope = await prisma.signingEnvelope.findFirst({ where: { tokenHash: hashOpaqueToken(token), status: { in: ["SENT", "SIGNED"] } }, select: { id: true, userId: true, documentKey: true, signedDocumentKey: true, status: true, expiresAt: true, title: true } });
  if (!envelope || (envelope.status === "SENT" && envelope.expiresAt && envelope.expiresAt <= new Date())) return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const key = envelope.status === "SIGNED" && envelope.signedDocumentKey ? envelope.signedDocumentKey : envelope.documentKey;
  const pdf = await fetchSigningPdf(signingBucket(), key);
  if (!pdf) return new NextResponse("Document unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  const bytes = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  return new NextResponse(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="document-${envelope.id}.pdf"`, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" } });
}
