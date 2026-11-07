import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { ensureInvoicePdf } from "@/lib/invoiceArchive";

const { resolvePortalShare, customerInvoiceFilter } = require("@/lib/customer-portal.cjs");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) {
    return NextResponse.json({ error: "not found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  const share = await resolvePortalShare(prisma, token);
  if (!share) return NextResponse.json({ error: "not found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });

  const invoice = await prisma.invoice.findFirst({
    where: customerInvoiceFilter(share, id),
    include: { contact: true, items: true, user: { include: { orgProfile: true } } },
  });
  if (!invoice) return NextResponse.json({ error: "not found" }, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  try {
    const pdf = await ensureInvoicePdf(invoice, invoice.user?.orgProfile, invoice.user?.plan || "FREE");
    const code = String(invoice.number ?? invoice.id).replace(/[^a-zA-Z0-9-]/g, "");
    const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${new URL(req.url).searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="invoice-${code}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    console.error("Portal invoice PDF unavailable", { id, error });
    return NextResponse.json({ error: "PDF unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
