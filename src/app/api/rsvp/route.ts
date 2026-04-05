import { type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface RSVPPayload {
  name: string;
  email: string;
  whatsapp: string;
  businessNiche: string;
  website?: string;
  socials?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RSVPPayload;

  // Validate required fields
  if (
    !body.name?.trim() ||
    !body.email?.trim() ||
    !body.whatsapp?.trim() ||
    !body.businessNiche?.trim()
  ) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!isValidEmail(body.email)) {
    return Response.json({ error: "Invalid email address" }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();

  // Upsert contact into Supabase
  const { data: contact, error: contactError } = await supabaseAdmin
    .from("contacts")
    .upsert(
      {
        name: body.name.trim(),
        email,
        whatsapp: body.whatsapp.trim(),
        business_niche: body.businessNiche.trim(),
        website: body.website?.trim() || null,
        socials: body.socials?.trim() || null,
      },
      { onConflict: "email", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (contactError || !contact) {
    console.error("[POST /api/rsvp] contact upsert error:", contactError);
    return Response.json({ error: "Failed to save contact" }, { status: 500 });
  }

  // Find the next upcoming event and register attendance
  const { data: nextEvent } = await supabaseAdmin
    .from("events")
    .select("id")
    .gte("event_date", new Date().toISOString())
    .order("event_date", { ascending: true })
    .limit(1)
    .single();

  if (nextEvent) {
    // Insert attendee record (ignore if already exists)
    const { error: attendeeError } = await supabaseAdmin
      .from("event_attendees")
      .upsert(
        { event_id: nextEvent.id, contact_id: contact.id, rsvp_status: "rsvp" },
        { onConflict: "event_id,contact_id", ignoreDuplicates: true }
      );

    if (!attendeeError) {
      // Increment RSVP count
      await supabaseAdmin.rpc("increment_rsvp_count", { event_id: nextEvent.id });
    }
  }

  // Forward to N8N automation webhook (CRM, WhatsApp, Telegram, email)
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (webhookUrl) {
    const payload = {
      name: body.name.trim(),
      email,
      whatsapp: body.whatsapp.trim(),
      businessNiche: body.businessNiche.trim(),
      website: body.website?.trim() || null,
      socials: body.socials?.trim() || null,
      source: "eoa-landing-rsvp",
      submittedAt: new Date().toISOString(),
    };

    const webhookRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!webhookRes.ok) {
      console.error(
        "N8N webhook error:",
        webhookRes.status,
        await webhookRes.text()
      );
      // Don't fail the request — contact is already saved in Supabase
    }
  } else {
    console.log("[RSVP submission]", { email, name: body.name.trim() });
  }

  return Response.json({ success: true });
}
