import { type NextRequest } from "next/server";
import { SHEET, findRowBy, getRows, updateRow } from "@/lib/sheets";

type Params = { params: Promise<{ id: string }> };

// GET /api/partners/:id — partner detail with touchpoints + commitments
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const [partnerRes, allTouchpoints, allCommitments] = await Promise.all([
    findRowBy(SHEET.partners, "id", id),
    getRows(SHEET.touchpoints),
    getRows(SHEET.commitments),
  ]);

  if (!partnerRes) {
    return Response.json({ error: "Partner not found" }, { status: 404 });
  }

  const touchpoints = allTouchpoints
    .filter(({ row }) => row.partner_id === id)
    .sort((a, b) => b.row.occurred_at.localeCompare(a.row.occurred_at))
    .map(({ row }) => row);

  const commitments = allCommitments
    .filter(({ row }) => row.partner_id === id)
    .sort((a, b) => a.row.due_date.localeCompare(b.row.due_date))
    .map(({ row }) => row);

  return Response.json({ ...partnerRes.row, touchpoints, commitments });
}

// PATCH /api/partners/:id
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const allowed = ["name", "type", "company", "email", "phone", "status", "notes", "renewal_date"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const found = await findRowBy(SHEET.partners, "id", id);
  if (!found) {
    return Response.json({ error: "Partner not found" }, { status: 404 });
  }

  await updateRow(SHEET.partners, found.rowIndex, updates);
  return Response.json({ ...found.row, ...updates });
}
