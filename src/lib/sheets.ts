/**
 * Google Sheets database client — single source of truth for all CRM data.
 *
 * Required env vars:
 *   GOOGLE_SPREADSHEET_ID          — the ID of the target spreadsheet
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL   — service account client_email
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY — service account private key (newlines as \n)
 *
 * Sheet tabs must exist with header rows matching the HEADERS definitions below.
 * Share the spreadsheet with the service account email (Editor permission).
 */

import { google, type sheets_v4 } from "googleapis";
import { randomUUID } from "crypto";

// ── Configuration ─────────────────────────────────────────────────────────────

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

export const SHEET = {
  contacts:    "Contacts",
  nomads:      "Nomads",
  events:      "Events",
  attendees:   "Event_Attendees",
  partners:    "Partners",
  touchpoints: "Touchpoints",
  commitments: "Commitments",
  leads:       "Leads",
  prospects:   "Prospects",
  socialLogs:  "Social_Posts_Log",
} as const;

export type SheetName = (typeof SHEET)[keyof typeof SHEET];

// ── Column definitions ────────────────────────────────────────────────────────
// These MUST match the header row in each sheet exactly (same order, same names).

export const HEADERS: Record<SheetName, readonly string[]> = {
  Contacts: [
    "id", "name", "email", "whatsapp", "bio", "business_niche", "website", "socials",
    "skills", "status", "created_at", "updated_at",
  ],
  Nomads: [
    "id", "contact_id", "slug", "full_name", "first_name", "last_name", "nationality",
    "languages", "profession", "skills", "company_name", "company_url", "current_projects",
    "email_primary", "email_secondary", "phone_whatsapp", "website", "linkedin_url",
    "twitter_x_handle", "instagram_handle", "facebook_profile_url", "youtube_channel_url",
    "tiktok_handle", "github_url", "coworking_spaces", "neighborhoods", "stay_pattern",
    "cm_first_seen_date", "cm_last_active_date", "event_history", "facebook_groups",
    "community_role", "crm_contact_id", "outreach_status", "relationship_strength",
    "data_sources", "enrichment_status", "confidence_score", "verified_at", "tags",
    "notes", "created_at", "updated_at",
  ],
  Events: [
    "id", "title", "description", "event_date", "venue", "speakers", "rsvp_count",
    "is_public", "created_at", "updated_at",
  ],
  Event_Attendees: [
    "id", "event_id", "contact_id", "rsvp_status", "created_at",
  ],
  Partners: [
    "id", "name", "type", "company", "email", "phone", "status", "notes",
    "renewal_date", "created_at", "updated_at",
  ],
  Touchpoints: [
    "id", "partner_id", "type", "summary", "occurred_at", "created_by", "created_at",
  ],
  Commitments: [
    "id", "partner_id", "title", "description", "due_date", "status",
    "deliverable_url", "created_at", "updated_at",
  ],
  Leads: [
    "id", "name", "platform", "profile_url", "business_niche", "location",
    "outreach_status", "dm_sent_at", "follow_up_1_at", "follow_up_2_at", "last_reply_at",
    "message_body", "notes", "source", "campaign", "event_id", "contact_id",
    "created_at", "updated_at",
  ],
  Prospects: [
    "id", "name", "email", "whatsapp", "business_niche", "website", "socials",
    "status", "source", "score", "created_at",
  ],
  Social_Posts_Log: [
    "id", "source", "event_id", "content_preview", "platforms", "scheduled_at",
    "blotato_results", "success_count", "failure_count", "created_at",
  ],
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type SheetRow = Record<string, string>;

export interface RowWithIndex {
  row: SheetRow;
  /** 1-based row number in the sheet (row 1 = headers, row 2 = first data row) */
  rowIndex: number;
}

// ── Auth client (lazy singleton) ──────────────────────────────────────────────

let _client: sheets_v4.Sheets | null = null;

function sheetsClient(): sheets_v4.Sheets {
  if (!_client) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    _client = google.sheets({ version: "v4", auth });
  }
  return _client;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

function serialize(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function rowToObject(headers: readonly string[], values: string[]): SheetRow {
  const obj: SheetRow = {};
  for (let i = 0; i < headers.length; i++) {
    obj[headers[i]] = values[i] ?? "";
  }
  return obj;
}

function objectToRow(headers: readonly string[], data: Record<string, unknown>): string[] {
  return headers.map((h) => serialize(data[h]));
}

// ── Core CRUD ─────────────────────────────────────────────────────────────────

/**
 * Read all data rows from a sheet.
 * Skips the header row (row 1). Returns objects keyed by column headers.
 */
export async function getRows(sheet: SheetName): Promise<RowWithIndex[]> {
  const headers = HEADERS[sheet];
  const range = `${sheet}!A1:${colLetter(headers.length)}`;
  const res = await sheetsClient().spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  const rows = (res.data.values ?? []) as string[][];
  if (rows.length <= 1) return [];
  return rows.slice(1).map((row, i) => ({
    row: rowToObject(headers, row),
    rowIndex: i + 2,
  }));
}

/**
 * Append a new row. Auto-populates id/created_at/updated_at if absent.
 * Returns the inserted row as an object.
 */
export async function appendRow(
  sheet: SheetName,
  data: Record<string, unknown>
): Promise<SheetRow> {
  const headers = HEADERS[sheet];
  const now = new Date().toISOString();
  const full: Record<string, unknown> = {
    id: randomUUID(),
    created_at: now,
    updated_at: now,
    ...data,
  };
  const values = [objectToRow(headers, full)];
  await sheetsClient().spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheet}!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
  return rowToObject(headers, values[0]);
}

/**
 * Update a single row in place (merges patch into existing values).
 * rowIndex is 1-based sheet row number (row 1 = headers).
 */
export async function updateRow(
  sheet: SheetName,
  rowIndex: number,
  patch: Record<string, unknown>
): Promise<void> {
  const headers = HEADERS[sheet];
  const range = `${sheet}!A${rowIndex}:${colLetter(headers.length)}${rowIndex}`;
  const res = await sheetsClient().spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  const current = rowToObject(headers, (res.data.values?.[0] as string[]) ?? []);
  const updated: Record<string, unknown> = {
    ...current,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  await sheetsClient().spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [objectToRow(headers, updated)] },
  });
}

/** Find all rows where row[key] === value (exact string match). */
export async function findRowsBy(
  sheet: SheetName,
  key: string,
  value: string
): Promise<RowWithIndex[]> {
  const all = await getRows(sheet);
  return all.filter(({ row }) => row[key] === value);
}

/** Find the first row where row[key] === value. */
export async function findRowBy(
  sheet: SheetName,
  key: string,
  value: string
): Promise<RowWithIndex | null> {
  const results = await findRowsBy(sheet, key, value);
  return results[0] ?? null;
}

/**
 * Upsert: if a row with row[keyField] === data[keyField] exists, update it;
 * otherwise append a new row. Returns the resulting row.
 */
export async function upsertRow(
  sheet: SheetName,
  keyField: string,
  data: Record<string, unknown>
): Promise<SheetRow> {
  const keyValue = serialize(data[keyField]);
  if (keyValue) {
    const existing = await findRowBy(sheet, keyField, keyValue);
    if (existing) {
      await updateRow(sheet, existing.rowIndex, data);
      return { ...existing.row, ...data, updated_at: new Date().toISOString() } as SheetRow;
    }
  }
  return appendRow(sheet, data);
}

export { randomUUID };
