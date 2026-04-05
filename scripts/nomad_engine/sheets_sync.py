"""
Sync nomad profiles to the EOA Google Sheets CRM (Nomads sheet).
Adapted from Ivybound lead_engine/sheets_sync.py.

Uses the same GOOGLE_SPREADSHEET_ID / GOOGLE_SERVICE_ACCOUNT_EMAIL /
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY env vars as the Next.js app.

Nomads sheet columns (must match HEADERS.Nomads in src/lib/sheets.ts):
  id, contact_id, slug, full_name, first_name, last_name, nationality,
  languages, profession, skills, company_name, company_url, current_projects,
  email_primary, email_secondary, phone_whatsapp, website, linkedin_url,
  twitter_x_handle, instagram_handle, facebook_profile_url, youtube_channel_url,
  tiktok_handle, github_url, coworking_spaces, neighborhoods, stay_pattern,
  cm_first_seen_date, cm_last_active_date, event_history, facebook_groups,
  community_role, crm_contact_id, outreach_status, relationship_strength,
  data_sources, enrichment_status, confidence_score, verified_at, tags,
  notes, created_at, updated_at
"""
import os
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env.local"))
logger = logging.getLogger("nomad_engine.sheets_sync")

SHEET_NAME = "Nomads"

NOMADS_HEADERS = [
    "id", "contact_id", "slug", "full_name", "first_name", "last_name", "nationality",
    "languages", "profession", "skills", "company_name", "company_url", "current_projects",
    "email_primary", "email_secondary", "phone_whatsapp", "website", "linkedin_url",
    "twitter_x_handle", "instagram_handle", "facebook_profile_url", "youtube_channel_url",
    "tiktok_handle", "github_url", "coworking_spaces", "neighborhoods", "stay_pattern",
    "cm_first_seen_date", "cm_last_active_date", "event_history", "facebook_groups",
    "community_role", "crm_contact_id", "outreach_status", "relationship_strength",
    "data_sources", "enrichment_status", "confidence_score", "verified_at", "tags",
    "notes", "created_at", "updated_at",
]


def _get_sheets_client():
    """Build authenticated Google Sheets client."""
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError:
        raise RuntimeError(
            "google-api-python-client not installed. "
            "Run: pip install google-api-python-client google-auth"
        )

    spreadsheet_id = os.getenv("GOOGLE_SPREADSHEET_ID")
    client_email = os.getenv("GOOGLE_SERVICE_ACCOUNT_EMAIL")
    private_key = os.getenv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", "").replace("\\n", "\n")

    if not all([spreadsheet_id, client_email, private_key]):
        raise RuntimeError(
            "Missing Google Sheets env vars. "
            "Set GOOGLE_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, "
            "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in .env.local"
        )

    creds = service_account.Credentials.from_service_account_info(
        {
            "type": "service_account",
            "client_email": client_email,
            "private_key": private_key,
            "token_uri": "https://oauth2.googleapis.com/token",
        },
        scopes=["https://www.googleapis.com/auth/spreadsheets"],
    )
    service = build("sheets", "v4", credentials=creds, cache_discovery=False)
    return service.spreadsheets(), spreadsheet_id


def _slug_from_name(name: str) -> str:
    import re
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]", "-", name.lower().strip())).strip("-")


def _serialize(v) -> str:
    if v is None:
        return ""
    if isinstance(v, (list, dict)):
        return json.dumps(v)
    return str(v)


def _profile_to_row(profile: Dict) -> List[str]:
    """Map an enriched nomad profile dict to a Nomads sheet row."""
    now = datetime.now(timezone.utc).isoformat()
    full_name = (profile.get("full_name") or profile.get("name") or "").strip()
    parts = full_name.split(" ", 1) if full_name else ["", ""]
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ""

    data = {
        "id": profile.get("id") or str(uuid.uuid4()),
        "contact_id": profile.get("contact_id") or "",
        "slug": profile.get("slug") or _slug_from_name(full_name),
        "full_name": full_name,
        "first_name": profile.get("first_name") or first_name,
        "last_name": profile.get("last_name") or last_name,
        "nationality": profile.get("nationality") or "",
        "languages": _serialize(profile.get("languages") or []),
        "profession": profile.get("profession") or profile.get("title") or "",
        "skills": _serialize(profile.get("skills") or []),
        "company_name": profile.get("company_name") or "",
        "company_url": profile.get("company_url") or "",
        "current_projects": profile.get("current_projects") or "",
        "email_primary": profile.get("email_primary") or profile.get("email") or "",
        "email_secondary": profile.get("email_secondary") or "",
        "phone_whatsapp": profile.get("phone_whatsapp") or profile.get("phone") or "",
        "website": profile.get("website") or "",
        "linkedin_url": profile.get("linkedin_url") or "",
        "twitter_x_handle": profile.get("twitter_x_handle") or "",
        "instagram_handle": profile.get("instagram_handle") or "",
        "facebook_profile_url": profile.get("facebook_profile_url") or "",
        "youtube_channel_url": profile.get("youtube_channel_url") or "",
        "tiktok_handle": profile.get("tiktok_handle") or "",
        "github_url": profile.get("github_url") or "",
        "coworking_spaces": _serialize(profile.get("coworking_spaces") or []),
        "neighborhoods": _serialize(profile.get("neighborhoods") or []),
        "stay_pattern": profile.get("stay_pattern") or "",
        "cm_first_seen_date": profile.get("cm_first_seen_date") or "",
        "cm_last_active_date": profile.get("cm_last_active_date") or "",
        "event_history": _serialize(profile.get("event_history") or []),
        "facebook_groups": _serialize(profile.get("facebook_groups") or []),
        "community_role": profile.get("community_role") or "",
        "crm_contact_id": profile.get("crm_contact_id") or "",
        "outreach_status": profile.get("outreach_status") or "not_contacted",
        "relationship_strength": str(profile.get("relationship_strength") or 0),
        "data_sources": _serialize(profile.get("data_sources") or {}),
        "enrichment_status": profile.get("enrichment_status") or "raw",
        "confidence_score": str(profile.get("confidence_score") or 0),
        "verified_at": profile.get("verified_at") or "",
        "tags": _serialize(profile.get("tags") or []),
        "notes": profile.get("notes") or "",
        "created_at": profile.get("created_at") or now,
        "updated_at": now,
    }

    return [data.get(h, "") for h in NOMADS_HEADERS]


def get_existing_slugs(sheets_api, spreadsheet_id: str) -> dict:
    """
    Fetch all existing Nomads rows. Returns {slug: row_number} for dedup.
    Row numbers are 1-based (row 1 = header).
    """
    result = sheets_api.values().get(
        spreadsheetId=spreadsheet_id,
        range=f"{SHEET_NAME}!A1:A",
    ).execute()
    values = result.get("values", [])
    # Skip header row (index 0 = row 1)
    slug_col_index = NOMADS_HEADERS.index("slug")

    # Re-fetch with slug column
    result2 = sheets_api.values().get(
        spreadsheetId=spreadsheet_id,
        range=f"{SHEET_NAME}!A1:{chr(65 + slug_col_index + 1)}",
    ).execute()
    all_rows = result2.get("values", [])
    existing: dict = {}
    for i, row in enumerate(all_rows[1:], start=2):  # skip header, 1-based
        if len(row) > slug_col_index:
            slug = row[slug_col_index]
            if slug:
                existing[slug] = i
    return existing


def get_existing_emails(sheets_api, spreadsheet_id: str) -> dict:
    """Returns {email_primary: row_number} for dedup."""
    email_col_index = NOMADS_HEADERS.index("email_primary")
    col_letter = chr(65 + email_col_index)
    result = sheets_api.values().get(
        spreadsheetId=spreadsheet_id,
        range=f"{SHEET_NAME}!A1:{col_letter}",
    ).execute()
    all_rows = result.get("values", [])
    existing: dict = {}
    for i, row in enumerate(all_rows[1:], start=2):
        if len(row) > email_col_index:
            email = row[email_col_index].strip().lower()
            if email:
                existing[email] = i
    return existing


def sync_nomads(profiles: List[Dict], dry_run: bool = False) -> Dict:
    """
    Sync enriched nomad profiles to Google Sheets Nomads tab.
    - Upserts by slug (or email as fallback).
    - New profiles appended; existing ones updated in place.
    Returns {"synced": N, "inserted": N, "updated": N, "skipped": N}.
    """
    if not profiles:
        logger.info("No profiles to sync")
        return {"synced": 0, "inserted": 0, "updated": 0, "skipped": 0}

    try:
        sheets_api, spreadsheet_id = _get_sheets_client()
    except RuntimeError as e:
        logger.error(str(e))
        return {"synced": 0, "inserted": 0, "updated": 0, "skipped": 0, "error": str(e)}

    existing_slugs = get_existing_slugs(sheets_api, spreadsheet_id)
    existing_emails = get_existing_emails(sheets_api, spreadsheet_id)

    to_insert: List[List[str]] = []
    to_update: List[tuple] = []  # (row_number, row_data)
    skipped = 0

    for profile in profiles:
        row_data = _profile_to_row(profile)
        slug = row_data[NOMADS_HEADERS.index("slug")]
        email = row_data[NOMADS_HEADERS.index("email_primary")].lower()

        existing_row = existing_slugs.get(slug) or (existing_emails.get(email) if email else None)

        if existing_row:
            to_update.append((existing_row, row_data))
        else:
            to_insert.append(row_data)

    if dry_run:
        logger.info(f"[dry_run] Would insert {len(to_insert)}, update {len(to_update)}")
        return {"synced": len(to_insert) + len(to_update), "inserted": len(to_insert),
                "updated": len(to_update), "skipped": skipped, "dry_run": True}

    # Batch append new rows
    if to_insert:
        sheets_api.values().append(
            spreadsheetId=spreadsheet_id,
            range=f"{SHEET_NAME}!A1",
            valueInputOption="RAW",
            body={"values": to_insert},
        ).execute()
        logger.info(f"Inserted {len(to_insert)} new nomad profiles")

    # Update existing rows one by one (Google Sheets API doesn't support batch update by row easily)
    num_cols = len(NOMADS_HEADERS)
    last_col = chr(64 + num_cols) if num_cols <= 26 else f"A{chr(64 + num_cols - 26)}"
    for row_num, row_data in to_update:
        sheets_api.values().update(
            spreadsheetId=spreadsheet_id,
            range=f"{SHEET_NAME}!A{row_num}:{last_col}{row_num}",
            valueInputOption="RAW",
            body={"values": [row_data]},
        ).execute()
    if to_update:
        logger.info(f"Updated {len(to_update)} existing nomad profiles")

    total = len(to_insert) + len(to_update)
    logger.info(f"Sync complete: {total} profiles synced ({len(to_insert)} new, {len(to_update)} updated)")

    return {
        "synced": total,
        "inserted": len(to_insert),
        "updated": len(to_update),
        "skipped": skipped,
    }


def get_all_nomads(sheets_api=None, spreadsheet_id: str = None) -> List[Dict]:
    """Fetch all rows from the Nomads sheet. Returns list of dicts."""
    if sheets_api is None:
        sheets_api, spreadsheet_id = _get_sheets_client()

    num_cols = len(NOMADS_HEADERS)
    last_col = chr(64 + num_cols) if num_cols <= 26 else f"A{chr(64 + num_cols - 26)}"
    result = sheets_api.values().get(
        spreadsheetId=spreadsheet_id,
        range=f"{SHEET_NAME}!A1:{last_col}",
    ).execute()
    all_rows = result.get("values", [])
    if len(all_rows) <= 1:
        return []
    return [
        dict(zip(NOMADS_HEADERS, row + [""] * (len(NOMADS_HEADERS) - len(row))))
        for row in all_rows[1:]
    ]


def get_existing_profile_ids(sheets_api=None, spreadsheet_id: str = None) -> set:
    """Return set of existing email_primary values for dedup."""
    if sheets_api is None:
        sheets_api, spreadsheet_id = _get_sheets_client()
    nomads = get_all_nomads(sheets_api, spreadsheet_id)
    return {n["email_primary"].lower() for n in nomads if n.get("email_primary")}
