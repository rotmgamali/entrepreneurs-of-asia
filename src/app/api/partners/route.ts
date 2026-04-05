import { type NextRequest } from "next/server";
import { SHEET, getRows, appendRow } from "@/lib/sheets";
import type { PartnerType, PartnerStatus } from "@/lib/supabase";

// GET /api/partners?type=sponsor&status=active
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type   = searchParams.get("type") as PartnerType | null;
  const status = searchParams.get("status") as PartnerStatus | null;

  const all = await getRows(SHEET.partners);

  let filtered = all;
  if (type)   filtered = filtered.filter(({ row }) => row.type === type);
  if (status) filtered = filtered.filter(({ row }) => row.status === status);

  filtered.sort((a, b) => b.row.updated_at.localeCompare(a.row.updated_at));

  return Response.json(filtered.map(({ row }) => row));
}

// POST /api/partners
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, type, company, email, phone, status, notes, renewal_date } = body;

  if (!name?.trim() || !type) {
    return Response.json({ error: "name and type are required" }, { status: 400 });
  }

  const validTypes: PartnerType[] = ["sponsor", "venue", "speaker", "collaborator"];
  if (!validTypes.includes(type)) {
    return Response.json({ error: `type must be one of: ${validTypes.join(", ")}` }, { status: 400 });
  }

  const row = await appendRow(SHEET.partners, {
    name: name.trim(),
    type,
    company: company?.trim() || "",
    email: email?.trim().toLowerCase() || "",
    phone: phone?.trim() || "",
    status: status ?? "active",
    notes: notes?.trim() || "",
    renewal_date: renewal_date || "",
  });

  return Response.json(row, { status: 201 });
}
