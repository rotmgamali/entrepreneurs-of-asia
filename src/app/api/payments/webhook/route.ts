/**
 * POST /api/payments/webhook
 *
 * Stripe webhook receiver. Verifies the Stripe-Signature header using
 * STRIPE_WEBHOOK_SECRET then handles:
 *   checkout.session.completed  — log payment, update partner/contact status
 *   customer.subscription.deleted — mark membership as cancelled
 *
 * Stripe requires the raw (unparsed) request body for signature verification,
 * so we read it with request.text() before any JSON.parse.
 *
 * Configure in Stripe dashboard: https://dashboard.stripe.com/webhooks
 *   Endpoint URL: https://<your-domain>/api/payments/webhook
 *   Events to send: checkout.session.completed, customer.subscription.deleted
 */

import { type NextRequest } from "next/server";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

// supabaseAdmin is a Proxy — cast once for clean usage below
const db = supabaseAdmin as unknown as SupabaseClient;

// Disable Next.js body parsing — we need the raw bytes for Stripe signature check
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set");
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // Read raw body as text for signature verification
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Signature verification failed";
    console.error("[stripe-webhook] Verification failed:", msg);
    return Response.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        // Unhandled event type — acknowledge receipt but take no action
        break;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Handler error";
    console.error(`[stripe-webhook] Error handling ${event.type}:`, msg);
    // Return 200 so Stripe doesn't retry — we log internally
    return Response.json({ received: true, warning: msg });
  }

  return Response.json({ received: true });
}

// ── Event handlers ──────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const product = session.metadata?.product ?? "unknown";
  const partnerId = session.metadata?.partner_id ?? null;

  const payment = {
    stripe_session_id:    session.id,
    stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
    stripe_subscription:  typeof session.subscription === "string" ? session.subscription : null,
    customer_email:       session.customer_email ?? session.customer_details?.email ?? null,
    amount_total:         session.amount_total ?? 0,
    currency:             session.currency ?? "thb",
    product,
    partner_id:           partnerId,
    status:               "completed",
  };

  const { error } = await db.from("payments").insert(payment);

  if (error) {
    throw new Error(`Failed to insert payment record: ${error.message}`);
  }

  // If a partner_id was supplied and this is a sponsor payment, mark partner active
  if (
    partnerId &&
    ["sponsor_bronze", "sponsor_silver", "sponsor_gold"].includes(product)
  ) {
    await db
      .from("partners")
      .update({ status: "active", notes: `Paid via Stripe (${product}) – session ${session.id}` })
      .eq("id", partnerId);
  }

  console.log(`[stripe-webhook] Payment recorded: ${product} / ${session.id}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { error } = await db
    .from("payments")
    .update({ status: "cancelled" })
    .eq("stripe_subscription", subscription.id);

  if (error) {
    throw new Error(`Failed to cancel subscription record: ${error.message}`);
  }

  console.log(`[stripe-webhook] Subscription cancelled: ${subscription.id}`);
}
