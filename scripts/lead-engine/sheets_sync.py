"""
Batch sync verified contacts from SQLite to Google Sheets.
Reuses existing sheets_integration.py for auth and API.
"""
import logging
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lead_engine.db import HarvestDB

logger = logging.getLogger("lead_engine.sheets_sync")


def sync_run(run_id: int, db: HarvestDB, sheet_name: str = None):
    """Sync all unsynced verified contacts from a run to Google Sheets."""
    try:
        from sheets_integration import GoogleSheetsClient
    except ImportError:
        logger.error("Could not import GoogleSheetsClient")
        return 0

    stats = db.get_run_stats(run_id)
    if not stats:
        logger.error(f"Run {run_id} not found")
        return 0

    default_sheet = sheet_name or f"Harvest - {stats['niche']}"

    try:
        sheets = GoogleSheetsClient(input_sheet_name=default_sheet)
        sheets.setup_sheets()
    except Exception as e:
        logger.error(f"Sheets setup failed: {e}")
        return 0

    total_synced = 0

    while True:
        contacts = db.get_unsynced_contacts(run_id, limit=50)
        if not contacts:
            break

        batch = []
        contact_ids = []
        for c in contacts:
            batch.append({
                "email": c["email"],
                "first_name": c.get("first_name", ""),
                "last_name": c.get("last_name", ""),
                "role": c.get("title", ""),
                "school_name": c.get("business_name", ""),
                "domain": c.get("website", ""),
                "city": c.get("city", ""),
                "state": c.get("state", ""),
                "phone": c.get("business_phone", ""),
                "status": "pending",
                "email_verified": c.get("email_status", "unknown"),
                "school_type": c.get("category", ""),
            })
            contact_ids.append(c["id"])

        try:
            sheets.add_leads_batch(batch)
            db.mark_synced(contact_ids, default_sheet)
            total_synced += len(batch)
            logger.info(f"Synced batch of {len(batch)} contacts ({total_synced} total)")
        except Exception as e:
            logger.error(f"Sheets sync batch failed: {e}")
            break

    logger.info(f"Sync complete: {total_synced} contacts pushed to '{default_sheet}'")
    return total_synced
