import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { hashPassword, setSession } from "@/server/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, email, password } = body || {};
  if (!email || !password) return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  const normEmail = String(email).trim().toLowerCase();

  const exists = await prisma.user.findUnique({ where: { email: normEmail } });
  if (exists) return NextResponse.json({ error: "User already exists" }, { status: 409 });

  const passwordHash = await hashPassword(String(password));
  const role = normEmail === "nussbaumer@gmail.com" ? "ADMIN" : "USER";
  const user = await prisma.user.create({ data: { email: normEmail, name: name || null, passwordHash, role: role as any, founder: false } });

  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
  await setSession(res as any, { id: user.id, email: user.email, role: user.role });
  return res;
}

