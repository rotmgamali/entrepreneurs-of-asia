import { type NextRequest } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

// GET /api/events — upcoming public events
export async function GET() {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, description, event_date, speakers, rsvp_count")
    .eq("is_public", true)
    .gte("event_date", new Date().toISOString())
    .order("event_date", { ascending: true });

  if (error) {
    console.error("[GET /api/events]", error);
    return Response.json({ error: "Failed to fetch events" }, { status: 500 });
  }

  return Response.json(data);
}

// POST /api/events — create a new event (service-role only via Authorization header)
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, event_date, venue, speakers, is_public } = body;

  if (!title?.trim() || !event_date) {
    return Response.json(
      { error: "title and event_date are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("events")
    .insert({
      title: title.trim(),
      description: description?.trim() ?? null,
      event_date,
      venue: venue?.trim() ?? null,
      speakers: speakers ?? [],
      is_public: is_public ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error("[POST /api/events]", error);
    return Response.json({ error: "Failed to create event" }, { status: 500 });
  }

  return Response.json(data, { status: 201 });
}
