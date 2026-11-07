import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PRIVACY_URL = "https://facturio.ch/privacy";

// Preserve this historical URL for crawlers and old external links. A permanent
// redirect consolidates indexing signals on the canonical marketing-site policy.
export function GET() {
  return NextResponse.redirect(PRIVACY_URL, 308);
}

export function HEAD() {
  return NextResponse.redirect(PRIVACY_URL, 308);
}
