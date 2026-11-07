import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { headers } from "next/headers";
import { signingBucket, fetchSigningPdf } from "@/lib/signing";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const host = (await headers()).get("host") || "";
  const isSignDomain =
    host === "staging.sign.facturio.ch" ||
    host === "sign.facturio.ch" ||
    host.endsWith(".sign.facturio.ch");
  if (!isSignDomain) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const envelope = await prisma.signingEnvelope.findUnique({
    where: { id },
    select: { documentKey: true, status: true, signedDocumentKey: true, expiresAt: true },
  });
  if (!envelope) {
    return new NextResponse("Not found", { status: 404 });
  }

  const key = envelope.status === "SIGNED" && envelope.signedDocumentKey ? envelope.signedDocumentKey : envelope.documentKey;
  const pdf = await fetchSigningPdf(signingBucket(), key);
  if (!pdf) {
    return new NextResponse("Document unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const bytes = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="document-${id}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'",
    },
  });
}