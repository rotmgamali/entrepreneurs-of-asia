import { supabase } from "@/lib/supabase";

// GET /api/events/past — past public events, most recent first
export async function GET() {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, description, event_date, speakers, rsvp_count")
    .eq("is_public", true)
    .lt("event_date", new Date().toISOString())
    .order("event_date", { ascending: false });

  if (error) {
    console.error("[GET /api/events/past]", error);
    return Response.json({ error: "Failed to fetch past events" }, { status: 500 });
  }

  return Response.json(data);
}
