import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { headers } from "next/headers";
import crypto from "crypto";
import signingCore from "@/lib/signing-core.cjs";
const { hashOpaqueToken } = signingCore;

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const host = (await headers()).get("host") || "";
  const isSignDomain =
    host === "staging.sign.facturio.ch" ||
    host === "sign.facturio.ch" ||
    host.endsWith(".sign.facturio.ch");
  if (!isSignDomain) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { recipientEmail } = await req.json();
    if (!recipientEmail || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(recipientEmail)) {
      return NextResponse.json({ error: "Valid recipient email required." }, { status: 400 });
    }

    const envelope = await prisma.signingEnvelope.findUnique({ where: { id } });
    if (!envelope) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }
    if (envelope.status !== "DRAFT") {
      return NextResponse.json({ error: "Document already sent or signed." }, { status: 400 });
    }
    if (!envelope.fieldsJson || JSON.parse(envelope.fieldsJson).length === 0) {
      return NextResponse.json({ error: "Add at least one signing field before sending." }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashOpaqueToken(token);

    await prisma.signingEnvelope.update({
      where: { id },
      data: {
        recipientEmail,
        status: "SENT",
        tokenHash,
      },
    });

    const signingUrl = `https://${host}/sign/${token}`;

    return NextResponse.json({ token, signingUrl }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Send failed", error);
    return NextResponse.json({ error: "Could not send for signature." }, { status: 500 });
  }
}