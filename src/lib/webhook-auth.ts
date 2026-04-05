/**
 * HMAC-SHA256 webhook authentication utilities.
 *
 * Pattern borrowed from /Documents/veterans/app/webhooks/security.py.
 *
 * Signature header format: `x-webhook-signature: t=<timestamp_ms>,v1=<hex_signature>`
 * Signature input: HMAC-SHA256(secret, `${timestamp}.${rawBody}`)
 *
 * Incoming: use verifyWebhookSignature() to authenticate requests from N8N / admin callers.
 * Outgoing: use signWebhookPayload() to sign requests sent to N8N webhooks.
 */

import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

export interface VerifyResult {
  valid: boolean;
  /** Raw request body text — use JSON.parse() on this after verification. */
  body: string;
  error?: string;
}

/**
 * Verify an incoming HMAC-SHA256 webhook signature.
 *
 * Reads and returns the raw request body so callers can JSON.parse it
 * without consuming the stream twice.
 */
export async function verifyWebhookSignature(
  request: Request,
  secret: string,
  maxAgeMs = DEFAULT_MAX_AGE_MS
): Promise<VerifyResult> {
  const sigHeader = request.headers.get("x-webhook-signature");
  if (!sigHeader) {
    return { valid: false, body: "", error: "Missing x-webhook-signature header" };
  }

  // Parse `t=<timestamp>,v1=<signature>`
  const parts: Record<string, string> = {};
  for (const segment of sigHeader.split(",")) {
    const idx = segment.indexOf("=");
    if (idx !== -1) parts[segment.slice(0, idx).trim()] = segment.slice(idx + 1).trim();
  }
  const { t, v1 } = parts;

  if (!t || !v1) {
    return { valid: false, body: "", error: "Invalid x-webhook-signature format" };
  }

  // Replay-attack protection
  const timestamp = Number(t);
  if (!Number.isFinite(timestamp) || Date.now() - timestamp > maxAgeMs) {
    return { valid: false, body: "", error: "Signature timestamp expired or invalid" };
  }

  const rawBody = await request.text();
  const message = `${t}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(message).digest("hex");

  // Constant-time comparison (prevents timing attacks)
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(v1);
  if (
    expectedBuf.byteLength !== receivedBuf.byteLength ||
    !timingSafeEqual(expectedBuf, receivedBuf)
  ) {
    return { valid: false, body: rawBody, error: "Invalid signature" };
  }

  return { valid: true, body: rawBody };
}

/**
 * Sign an outgoing webhook payload.
 * Returns headers to merge into the outgoing fetch() call.
 */
export function signWebhookPayload(body: string, secret: string): Record<string, string> {
  const t = String(Date.now());
  const signature = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return { "x-webhook-signature": `t=${t},v1=${signature}` };
}
