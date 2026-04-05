import { type NextRequest } from "next/server";
import { SHEET, appendRow } from "@/lib/sheets";

type Params = { params: Promise<{ id: string }> };

// POST /api/partners/:id/commitments
export async function POST(request: NextRequest, { params }: Params) {
  const { id: partner_id } = await params;
  const body = await request.json();
  const { title, description, due_date, deliverable_url } = body;

  if (!title?.trim()) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }

  const row = await appendRow(SHEET.commitments, {
    partner_id,
    title: title.trim(),
    description: description?.trim() || "",
    due_date: due_date || "",
    status: "pending",
    deliverable_url: deliverable_url?.trim() || "",
  });

  return Response.json(row, { status: 201 });
}
