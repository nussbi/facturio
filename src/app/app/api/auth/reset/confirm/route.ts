import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { hashPassword } from "@/server/auth";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json().catch(() => ({}));
  if (!token || !password) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const rec = await (prisma as any).passwordResetToken.findUnique({ where: { token } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) {
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: rec.userId } });
  if (!user) return NextResponse.json({ error: "invalid_or_expired" }, { status: 400 });

  const passwordHash = await hashPassword(String(password));
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    (prisma as any).passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } }),
    (prisma as any).passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null, token: { not: token } } })
  ]);

  return NextResponse.json({ ok: true });
}

