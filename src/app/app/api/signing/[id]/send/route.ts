import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";
import { getSigningLanguage } from "@/lib/signing-copy-server";
const { deliverSigningRequest } = require("@/lib/signing-flow.cjs");
export const runtime = "nodejs";
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const envelope = await prisma.signingEnvelope.findFirst({ where: { id, userId: user.id } });
  if (!envelope) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const company = await prisma.orgProfile.findUnique({ where: { userId: user.id }, select: { company: true, firstName: true, lastName: true, email: true } });
  try {
    const result = await deliverSigningRequest({ client: prisma, envelope, env: process.env, senderName: company?.company || [company?.firstName, company?.lastName].filter(Boolean).join(" ") || "Facturio", replyTo: company?.email || undefined, lang: await getSigningLanguage() });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error: any) { return NextResponse.json({ error: "Could not send for signature.", code: error.message }, { status: error.status || 500 }); }
}
