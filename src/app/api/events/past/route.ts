import { getRows, SHEET } from "@/lib/sheets";

// GET /api/events/past — past public events, most recent first
export async function GET() {
  const now = new Date().toISOString();
  const all = await getRows(SHEET.events);

  const past = all
    .filter(({ row }) => row.is_public === "true" && row.event_date < now)
    .sort((a, b) => b.row.event_date.localeCompare(a.row.event_date))
    .map(({ row }) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      event_date: row.event_date,
      speakers: row.speakers,
      rsvp_count: row.rsvp_count,
    }));

  return Response.json(past);
}
