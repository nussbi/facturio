import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { getManagedSigningEnvelope, isStandaloneSigningHost } from "@/server/signing-access";
import { getSigningLanguage } from "@/lib/signing-copy-server";
const { deliverSigningRequest } = require("@/lib/signing-flow.cjs");
export const runtime = "nodejs";
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isStandaloneSigningHost()) return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  const envelope = await getManagedSigningEnvelope((await params).id);
  if (!envelope) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const { recipientEmail } = await req.json();
    const result = await deliverSigningRequest({ client: prisma, envelope, recipientEmail, env: process.env, lang: await getSigningLanguage() });
    return NextResponse.json({ ...result, guest: !await getCurrentUser() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: any) {
    return NextResponse.json({ error: "Could not send for signature.", code: error.message }, { status: error.status || 500, headers: { "Cache-Control": "private, no-store" } });
  }
}
