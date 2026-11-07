import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth";

const { createOpaqueToken, hashOpaqueToken } = require("@/lib/signing-core.cjs");

const { activePortalShareFilter, portalLinkToken } = require("@/lib/customer-portal.cjs");

export const runtime = "nodejs";

// GET: fetch existing portal share for this contact
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const share = await prisma.portalShare.findFirst({
    where: { contactId: id, userId: user.id, ...activePortalShareFilter() },
    orderBy: { createdAt: "desc" },
  });

  if (!share) {
    return NextResponse.json({ url: null, hasExistingShare: false, expiresAt: null }, { headers: { "Cache-Control": "no-store" } });
  }

  const origin = process.env.APP_BASE_URL || "https://app.facturio.ch";
  return NextResponse.json(
    { url: `${origin}/portal/${portalLinkToken(share)}`, hasExistingShare: true, expiresAt: share.expiresAt },
    { headers: { "Cache-Control": "no-store" } }
  );
}

// POST: create or update (upsert) portal share
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const contact = await prisma.contact.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!contact) return NextResponse.json({ error: "customer not found" }, { status: 404 });

  const token = createOpaqueToken();
  // Portal links never expire - no expiresAt
  const upserted = await prisma.portalShare.upsert({
    where: { userId_contactId: { userId: user.id, contactId: contact.id } },
    create: {
      userId: user.id,
      contactId: contact.id,
      tokenHash: hashOpaqueToken(token),
      expiresAt: null, // never expires
    },
    update: {
      tokenHash: hashOpaqueToken(token),
      expiresAt: null,
      revokedAt: null,
    },
  });

  const origin = process.env.APP_BASE_URL || "https://app.facturio.ch";
  return NextResponse.json({ url: `${origin}/portal/${portalLinkToken(upserted)}`, expiresAt: null }, {
    headers: { "Cache-Control": "no-store" },
  });
}