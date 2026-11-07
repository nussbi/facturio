import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import crypto from "crypto";
import { signingBucket, signingObjectKey, saveSigningPdf, getPdfPageCount } from "@/lib/signing";
import { headers } from "next/headers";

export const runtime = "nodejs";

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function POST(req: NextRequest) {
  const host = (await headers()).get("host") || "";
  const isSignDomain =
    host === "staging.sign.facturio.ch" ||
    host === "sign.facturio.ch" ||
    host.endsWith(".sign.facturio.ch");
  if (!isSignDomain) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 8 || file.size > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "Choose a PDF up to 12 MB." }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF documents are supported." }, { status: 415 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
      return NextResponse.json({ error: "This file does not contain a valid PDF." }, { status: 415 });
    }

    const pageCount = await getPdfPageCount(bytes);
    const title = String(form.get("title") || "").trim().slice(0, 160) || file.name.replace(/\.pdf$/i, "").slice(0, 160);

    const envelopeId = crypto.randomUUID();
    const token = generateToken();
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const documentKey = signingObjectKey(envelopeId, "original");

    const bucket = signingBucket();
    await saveSigningPdf(bucket, documentKey, bytes, { envelopeId, purpose: "signature-original" });

    const envelope = await prisma.signingEnvelope.create({
      data: {
        id: envelopeId,
        userId: 'dummy-user-001',
        title,
        documentType: "OTHER",
        recipientEmail: "",
        originalFileName: file.name.replace(/[\\/\\u0000-\\u001f]/g, "_").slice(0, 180),
        documentKey,
        pageCount,
        fieldsJson: "[]",
        tokenHash,
        status: "DRAFT",
      },
      select: { id: true, title: true },
    });

    return NextResponse.json({ id: envelope.id, title: envelope.title }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json({ error: "Could not upload document." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const host = (await headers()).get("host") || "";
  const isSignDomain =
    host === "staging.sign.facturio.ch" ||
    host === "sign.facturio.ch" ||
    host.endsWith(".sign.facturio.ch");
  if (!isSignDomain) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  try {
    const { fields } = await req.json();
    if (!Array.isArray(fields)) {
      return NextResponse.json({ error: "Invalid fields." }, { status: 400 });
    }

    await prisma.signingEnvelope.update({
      where: { id },
      data: { fieldsJson: JSON.stringify(fields) },
    });

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Save fields failed", error);
    return NextResponse.json({ error: "Could not save fields." }, { status: 500 });
  }
}