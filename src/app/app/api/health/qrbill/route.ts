import { NextResponse } from "next/server";

// QR bill generation is now handled by the Node.js swissqrbill library
// No external service needed, so always return healthy
export async function GET() {
  return NextResponse.json({ ok: true });
}
