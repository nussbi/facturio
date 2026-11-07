import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/server/db";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 503 });
  }

  const stripe = new Stripe(secretKey);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (e: any) {
    return NextResponse.json({ error: `Invalid signature: ${e?.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const userId = session.client_reference_id as string | undefined;
        const customerId = session.customer as string | undefined;
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { plan: "PRO", stripeCustomerId: customerId ?? null },
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const userId = sub?.metadata?.userId as string | undefined;
        if (userId) {
          await prisma.user.update({ where: { id: userId }, data: { plan: "FREE" } });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        const userId = sub?.metadata?.userId as string | undefined;
        const status = sub?.status as string | undefined;
        if (userId && status && status !== "active" && status !== "trialing") {
          await prisma.user.update({ where: { id: userId }, data: { plan: "FREE" } });
        }
        break;
      }
    }
  } catch (e: any) {
    // Don't fail the webhook on a processing error — log it so Stripe doesn't retry a DB-only issue.
    console.error("stripe webhook processing error", e?.message);
  }

  return NextResponse.json({ received: true });
}
