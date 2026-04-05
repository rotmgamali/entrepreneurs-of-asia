import { type NextRequest } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

// GET /api/events/[id] — single event (venue revealed only to approved contacts via service role)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("events")
    .select("id, title, description, event_date, speakers, rsvp_count")
    .eq("id", id)
    .eq("is_public", true)
    .single();

  if (error || !data) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  return Response.json(data);
}

// PATCH /api/events/[id] — update an event (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const secret = request.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const allowedFields = [
    "title",
    "description",
    "event_date",
    "venue",
    "speakers",
    "is_public",
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("events")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    console.error("[PATCH /api/events/[id]]", error);
    return Response.json({ error: "Failed to update event" }, { status: 500 });
  }

  return Response.json(data);
}
