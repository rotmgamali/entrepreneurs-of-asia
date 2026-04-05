/**
 * ============================================================
 * EOA STRIPE PRODUCT SETUP SCRIPT
 * ============================================================
 *
 * Run ONCE to create EOA products and prices in Stripe.
 * Copy the printed env vars into your .env.local file.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/stripe-setup.ts
 *
 * Products created:
 *   1. Bronze Sponsor Package   — 5,000 THB one-time
 *   2. Silver Sponsor Package   — 10,000 THB one-time
 *   3. Gold Sponsor Package     — 15,000 THB one-time
 *   4. Premium Community Membership — 990 THB/month recurring
 */

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

interface ProductSpec {
  name: string;
  description: string;
  metadata: Record<string, string>;
  amountThb: number;
  recurring?: { interval: "month" | "year"; interval_count: number };
}

const PRODUCTS: ProductSpec[] = [
  {
    name: "EOA Bronze Sponsor Package",
    description:
      "Bronze-tier sponsorship for Entrepreneurs of Asia events. Includes logo placement, 2 event tickets, and social media mention.",
    metadata: { product_type: "sponsor_bronze", program: "eoa_sponsorship" },
    amountThb: 5_000,
  },
  {
    name: "EOA Silver Sponsor Package",
    description:
      "Silver-tier sponsorship for Entrepreneurs of Asia events. Includes prominent logo placement, 4 event tickets, dedicated social posts, and speaking slot.",
    metadata: { product_type: "sponsor_silver", program: "eoa_sponsorship" },
    amountThb: 10_000,
  },
  {
    name: "EOA Gold Sponsor Package",
    description:
      "Gold-tier sponsorship for Entrepreneurs of Asia events. Includes headline branding, 8 event tickets, video feature, keynote slot, and 1:1 introductions.",
    metadata: { product_type: "sponsor_gold", program: "eoa_sponsorship" },
    amountThb: 15_000,
  },
  {
    name: "EOA Premium Community Membership",
    description:
      "Monthly premium membership for the Entrepreneurs of Asia community. Includes private networking events, member directory access, and exclusive resources.",
    metadata: { product_type: "membership_monthly", program: "eoa_membership" },
    amountThb: 990,
    recurring: { interval: "month", interval_count: 1 },
  },
];

async function setup() {
  console.log("🚀 Setting up EOA products in Stripe (currency: THB)...\n");

  const envLines: string[] = [];

  for (const spec of PRODUCTS) {
    console.log(`Creating: ${spec.name} ...`);

    const product = await stripe.products.create({
      name: spec.name,
      description: spec.description,
      metadata: spec.metadata,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: spec.amountThb * 100, // Stripe uses smallest unit (satang)
      currency: "thb",
      ...(spec.recurring
        ? { recurring: spec.recurring }
        : {}),
      metadata: spec.metadata,
    });

    const key = `STRIPE_PRICE_${spec.metadata.product_type.toUpperCase()}`;
    const productKey = `STRIPE_PRODUCT_${spec.metadata.product_type.toUpperCase()}`;

    console.log(`  ✅ Product ID : ${product.id}`);
    console.log(`  ✅ Price ID   : ${price.id}`);
    console.log(`  ✅ Amount     : ${spec.amountThb.toLocaleString()} THB${spec.recurring ? "/month" : ""}\n`);

    envLines.push(`${key}=${price.id}`);
    envLines.push(`${productKey}=${product.id}`);
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ SETUP COMPLETE — add these to .env.local:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log(envLines.join("\n"));
  console.log("\n# Webhook secret (from Stripe dashboard after registering endpoint):");
  console.log("STRIPE_WEBHOOK_SECRET=whsec_...");
  console.log("\n# Public base URL (for redirect after checkout):");
  console.log("NEXT_PUBLIC_BASE_URL=https://yourdomain.com");
}

setup().catch((err) => {
  console.error("❌ Setup failed:", err.message);
  process.exit(1);
});
