import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/server/db";
import { ensureInvoicePdf } from "@/lib/invoiceArchive";

export const runtime = "nodejs";

function getSecret() {
  return process.env.SECRET_KEY || "dev-secret-change-me";
}

function b64url(input: Buffer | string) {
  const b = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return b.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromB64url(str: string) {
  const pad = 4 - (str.length % 4 || 4);
  const s = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad === 4 ? 0 : pad);
  return Buffer.from(s, "base64");
}

function verifyToken(token: string): { id: string; u: string; exp: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadB64, sig] = parts;
    const expected = crypto.createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(fromB64url(payloadB64).toString("utf8"));
    if (!payload || typeof payload !== "object") return null;
    if (Date.now() > (payload.exp as number)) return null;
    return payload as any;
  } catch {
    return null;
  }
}

function formatInvCode(id: string, number?: number | null): string {
  if (typeof number === "number" && Number.isFinite(number) && number >= 0) {
    const s = String(number).padStart(9, "0");
    return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6, 9)}`;
  }
  let h = 0;
  for (let i = 0; i < id.length; i++) { h = ((h << 5) - h + id.charCodeAt(i)) | 0; }
  const num = Math.abs(h) % 1_000_000_000;
  const s = String(num).padStart(9, "0");
  return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6, 9)}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const data = verifyToken(token);
  if (!data) return NextResponse.json({ error: "invalid or expired link" }, { status: 400 });

  // Fetch invoice with relations needed for on-demand PDF generation (no local disk on Workers)
  const invoice = await prisma.invoice.findUnique({
    where: { id: data.id },
    include: {
      items: true,
      contact: true,
      user: { include: { orgProfile: true } },
    },
  });
  if (!invoice || invoice.userId !== data.u) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // The token authenticates this exact invoice. R2 stays private.
  try {
    const code = formatInvCode(invoice.id, invoice.number ?? null);
    const pdf = await ensureInvoicePdf(invoice, invoice.user?.orgProfile, invoice.user?.plan || 'FREE');
    const pdfBuffer = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${code}.pdf"`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
  } catch (error) {
    console.error('Public invoice PDF archival failed', error);
    return NextResponse.json({ error: 'PDF unavailable' }, { status: 503 });
  }
}
