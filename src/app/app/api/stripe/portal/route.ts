import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getCurrentUser } from "@/server/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  if (!user.stripeCustomerId) {
    return NextResponse.json({ error: "No active subscription to manage" }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);
  const baseUrl = process.env.APP_BASE_URL || "https://app.facturio.ch";

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Stripe portal error" }, { status: 500 });
  }
}
