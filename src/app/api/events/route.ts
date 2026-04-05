import { type NextRequest } from "next/server";
import { SHEET, getRows, appendRow } from "@/lib/sheets";

// GET /api/events — upcoming public events
export async function GET() {
  const now = new Date().toISOString();
  const all = await getRows(SHEET.events);

  const upcoming = all
    .filter(({ row }) => row.is_public === "true" && row.event_date >= now)
    .sort((a, b) => a.row.event_date.localeCompare(b.row.event_date))
    .map(({ row }) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      event_date: row.event_date,
      speakers: row.speakers,
      rsvp_count: row.rsvp_count,
    }));

  return Response.json(upcoming);
}

// POST /api/events — create a new event (admin only)
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, event_date, venue, speakers, is_public } = body;

  if (!title?.trim() || !event_date) {
    return Response.json({ error: "title and event_date are required" }, { status: 400 });
  }

  const row = await appendRow(SHEET.events, {
    title: title.trim(),
    description: description?.trim() || "",
    event_date,
    venue: venue?.trim() || "",
    speakers: JSON.stringify(speakers ?? []),
    rsvp_count: "0",
    is_public: String(is_public ?? true),
  });

  return Response.json(row, { status: 201 });
}
