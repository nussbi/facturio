import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getCurrentUser, hashPassword, verifyPassword } from "@/server/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json().catch(() => ({}));
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (String(newPassword).length < 8) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  }

  const ok = await verifyPassword(String(currentPassword), user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "wrong_password" }, { status: 400 });
  }

  const passwordHash = await hashPassword(String(newPassword));
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
