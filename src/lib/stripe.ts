/**
 * Stripe client and EOA product/price configuration.
 *
 * Products:
 *   Sponsor packages  — 3 tiers, one-time (THB)
 *   Premium membership — recurring monthly (THB)
 *   Event ticket       — one-time per event (THB)
 *
 * Run `npx tsx scripts/stripe-setup.ts` once to create the products/prices in
 * Stripe, then copy the resulting IDs into your .env file.
 */

import Stripe from "stripe";

// Lazy singleton — safe to import at build time
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" });
  }
  return _stripe;
}

// ── Product/Price IDs (set via env after running stripe-setup.ts) ─────────

export const STRIPE_PRICES = {
  // Sponsor tiers (one-time)
  sponsor_bronze: process.env.STRIPE_PRICE_SPONSOR_BRONZE ?? "",  // 5,000 THB
  sponsor_silver: process.env.STRIPE_PRICE_SPONSOR_SILVER ?? "",  // 10,000 THB
  sponsor_gold:   process.env.STRIPE_PRICE_SPONSOR_GOLD   ?? "",  // 15,000 THB
  // Premium community membership (monthly recurring)
  membership_monthly: process.env.STRIPE_PRICE_MEMBERSHIP_MONTHLY ?? "",
  // Event ticket (one-time) — populated dynamically per event
} as const;

export type SponsorTier = "bronze" | "silver" | "gold";
export type PaymentProduct = "sponsor_bronze" | "sponsor_silver" | "sponsor_gold" | "membership_monthly" | "event_ticket";

export const SPONSOR_TIERS: Record<SponsorTier, { label: string; amountThb: number; priceKey: keyof typeof STRIPE_PRICES }> = {
  bronze: { label: "Bronze Sponsor",  amountThb: 5_000,  priceKey: "sponsor_bronze" },
  silver: { label: "Silver Sponsor",  amountThb: 10_000, priceKey: "sponsor_silver" },
  gold:   { label: "Gold Sponsor",    amountThb: 15_000, priceKey: "sponsor_gold"   },
};
