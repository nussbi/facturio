import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { headers } from "next/headers";
import crypto from "crypto";
import { signSession, SESSION_COOKIE } from "@/server/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const host = (await headers()).get("host") || "";
  const isSignDomain =
    host === "staging.sign.facturio.ch" ||
    host === "sign.facturio.ch" ||
    host.endsWith(".sign.facturio.ch");
  if (!isSignDomain) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  try {
    const { email, password, name } = await req.json();
    if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || email.split("@")[0],
        passwordHash: "", // Will be set below
      },
      select: { id: true, email: true, name: true },
    });

    // Hash and store password
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = await new Promise<string>((resolve, reject) => {
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(derivedKey.toString("hex"));
      });
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: `${salt}:${hash}` },
    });

    // Create session
    const sessionToken = signSession({ userId: user.id, email: user.email });
    const response = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SESSION_COOKIE, sessionToken, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });

    return response;
  } catch (error) {
    console.error("Signup failed", error);
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }
}