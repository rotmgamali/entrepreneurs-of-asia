/**
 * POST /api/payments/checkout
 *
 * Creates a Stripe Checkout session for:
 *   - Sponsor packages (bronze / silver / gold, one-time)
 *   - Premium community membership (monthly recurring)
 *   - Event tickets (one-time, per-event price ID supplied by caller)
 *
 * Body:
 *   product      "sponsor_bronze" | "sponsor_silver" | "sponsor_gold"
 *                | "membership_monthly" | "event_ticket"
 *   email        Pre-fill customer email (optional)
 *   eventPriceId Stripe price ID for event tickets (required when product="event_ticket")
 *   partnerId    Internal partner/contact ID to store in metadata (optional)
 *   successUrl   Redirect after successful payment (optional, defaults to NEXT_PUBLIC_BASE_URL)
 *   cancelUrl    Redirect on cancel (optional)
 */

import { type NextRequest } from "next/server";
import { getStripe, STRIPE_PRICES, type PaymentProduct } from "@/lib/stripe";

const ONE_TIME_PRODUCTS = new Set<PaymentProduct>([
  "sponsor_bronze",
  "sponsor_silver",
  "sponsor_gold",
  "event_ticket",
]);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    product,
    email,
    eventPriceId,
    partnerId,
    successUrl,
    cancelUrl,
  } = body as {
    product: PaymentProduct;
    email?: string;
    eventPriceId?: string;
    partnerId?: string;
    successUrl?: string;
    cancelUrl?: string;
  };

  if (!product) {
    return Response.json({ error: "product is required" }, { status: 400 });
  }

  const validProducts: PaymentProduct[] = [
    "sponsor_bronze",
    "sponsor_silver",
    "sponsor_gold",
    "membership_monthly",
    "event_ticket",
  ];
  if (!validProducts.includes(product)) {
    return Response.json({ error: `Unknown product: ${product}` }, { status: 400 });
  }

  // Resolve the Stripe price ID
  let priceId: string;
  if (product === "event_ticket") {
    if (!eventPriceId) {
      return Response.json(
        { error: "eventPriceId is required for event_ticket product" },
        { status: 400 }
      );
    }
    priceId = eventPriceId;
  } else {
    priceId = STRIPE_PRICES[product];
    if (!priceId) {
      return Response.json(
        { error: `Stripe price ID not configured for ${product}. Run scripts/stripe-setup.ts first.` },
        { status: 500 }
      );
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const mode = ONE_TIME_PRODUCTS.has(product) ? "payment" : "subscription";

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    success_url: successUrl ?? `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl ?? `${baseUrl}/payment/cancel`,
    metadata: {
      product,
      ...(partnerId ? { partner_id: partnerId } : {}),
    },
    payment_intent_data:
      mode === "payment"
        ? { metadata: { product, ...(partnerId ? { partner_id: partnerId } : {}) } }
        : undefined,
  });

  return Response.json({ url: session.url, sessionId: session.id }, { status: 201 });
}
