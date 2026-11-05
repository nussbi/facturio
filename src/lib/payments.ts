import Stripe from "stripe";

// Creates a one-time Stripe Checkout session for an invoice so the customer
// can pay online with card / Google Pay. Returns the hosted URL, or null if
// Stripe isn't configured or the invoice amount is invalid.
export async function createInvoicePaymentLink(invoice: {
  id: string;
  number: number | null;
  totalGross: number;
  currency: string;
  userId: string | null;
}): Promise<string | null> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  const amount = Math.round(invoice.totalGross * 100);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const stripe = new Stripe(secretKey);
  const origin = process.env.APP_BASE_URL || "https://app.facturio.ch";
  const currency = (invoice.currency || "CHF").toLowerCase();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: amount,
          product_data: { name: `Invoice #${invoice.number ?? invoice.id}` },
        },
        quantity: 1,
      },
    ],
    client_reference_id: invoice.id,
    metadata: { invoiceId: invoice.id, userId: invoice.userId ?? "" },
    success_url: `${origin}/app/payments/thanks?status=success`,
    cancel_url: `${origin}/app/payments/thanks?status=cancelled`,
  });

  return session.url;
}
