import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getManagedSigningEnvelope, isStandaloneSigningHost } from "@/server/signing-access";
const { validateSigningFields } = require("@/lib/signing-core.cjs");
export const runtime = "nodejs";
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isStandaloneSigningHost()) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const { id } = await params;
  const envelope = await getManagedSigningEnvelope(id);
  if (!envelope) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (envelope.status !== "DRAFT") return NextResponse.json({ error: "Only drafts can be edited" }, { status: 409 });
  try {
    const { fields } = await req.json();
    validateSigningFields(fields, envelope.pageCount);
    if (!fields.some((field: any) => field.type === "signature")) return NextResponse.json({ error: "Add a signature field.", code: "signatureRequired" }, { status: 400 });
    const changed = await prisma.signingEnvelope.updateMany({ where: { id, userId: envelope.userId, status: "DRAFT" }, data: { fieldsJson: JSON.stringify(fields) } });
    return NextResponse.json({ ok: Boolean(changed.count) }, { status: changed.count ? 200 : 409, headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Invalid fields", code: "saveFailed" }, { status: 400 }); }
}
