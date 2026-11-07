import { NextRequest, NextResponse } from "next/server";
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
    select: {
      id: true,
      title: true,
      originalFileName: true,
      pageCount: true,
      status: true,
      fieldsJson: true,
    },
  });
  if (!envelope) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.json(envelope, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(
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

  try {
    const { fields } = await req.json();
    if (!Array.isArray(fields)) {
      return NextResponse.json({ error: "Invalid fields." }, { status: 400 });
    }

    const envelope = await prisma.signingEnvelope.findUnique({ where: { id } });
    if (!envelope) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
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