import { type NextRequest } from "next/server";
import { SHEET, findRowBy, updateRow } from "@/lib/sheets";

// GET /api/events/[id] — single public event
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const found = await findRowBy(SHEET.events, "id", id);
  if (!found || found.row.is_public !== "true") {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  const { row } = found;
  return Response.json({
    id: row.id,
    title: row.title,
    description: row.description,
    event_date: row.event_date,
    speakers: row.speakers,
    rsvp_count: row.rsvp_count,
  });
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

  const allowedFields = ["title", "description", "event_date", "venue", "speakers", "is_public"] as const;
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = field === "is_public" ? String(body[field]) : body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const found = await findRowBy(SHEET.events, "id", id);
  if (!found) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  await updateRow(SHEET.events, found.rowIndex, updates);
  return Response.json({ ...found.row, ...updates });
}
