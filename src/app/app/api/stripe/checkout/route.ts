import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getCurrentUser } from "@/server/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Stripe is not configured (missing STRIPE_SECRET_KEY)" }, { status: 503 });
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: "No PRO price configured (missing STRIPE_PRO_PRICE_ID)" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { priceId?: string };
  const price = body.priceId || priceId;
  const baseUrl = process.env.APP_BASE_URL || "https://app.facturio.ch";

  const stripe = new Stripe(secretKey);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      subscription_data: { metadata: { userId: user.id } },
      allow_promotion_codes: true,
      success_url: `${baseUrl}/settings?checkout=success`,
      cancel_url: `${baseUrl}/settings?checkout=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Stripe checkout error" }, { status: 500 });
  }
}
