import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { prisma } from "@/server/db";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await (prisma as any).user.update({ where: { id: user.id }, data: { profileCompleted: true } });
  return NextResponse.json({ ok: true });
}

