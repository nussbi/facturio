import { NextResponse } from "next/server";
import { clearSession } from "@/server/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSession(res as any);
  return res;
}

