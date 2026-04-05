import { type NextRequest } from "next/server";
import { SHEET, appendRow } from "@/lib/sheets";
import type { TouchpointType } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

// POST /api/partners/:id/touchpoints
export async function POST(request: NextRequest, { params }: Params) {
  const { id: partner_id } = await params;
  const body = await request.json();
  const { type, summary, occurred_at, created_by } = body;

  if (!type || !summary?.trim()) {
    return Response.json({ error: "type and summary are required" }, { status: 400 });
  }

  const validTypes: TouchpointType[] = ["email", "call", "meeting", "event", "message"];
  if (!validTypes.includes(type)) {
    return Response.json({ error: `type must be one of: ${validTypes.join(", ")}` }, { status: 400 });
  }

  const row = await appendRow(SHEET.touchpoints, {
    partner_id,
    type,
    summary: summary.trim(),
    occurred_at: occurred_at || new Date().toISOString(),
    created_by: created_by?.trim() || "",
  });

  return Response.json(row, { status: 201 });
}
