import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { verifyPassword, setSession } from "@/server/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body || {};
  if (!email || !password) return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  const normEmail = String(email).trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: normEmail } });
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const ok = await verifyPassword(String(password), user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
  await setSession(res as any, { id: user.id, email: user.email, role: user.role });
  return res;
}

