"""
Contact and campaign state management for EOA outreach engine.
Adapted from Ivybound mailreef_automation/contact_manager.py

Key changes:
- Schema adapted for EOA archetypes (no school fields)
- Supports 3 campaign types: event_invite, speaker_recruitment, sponsor_pitch
- Atomic pick-and-lock pattern preserved for concurrent safety
"""

import sqlite3
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from .logger_util import get_logger

logger = get_logger("CONTACT_MANAGER")

_DEFAULT_DB = os.path.join(os.path.dirname(os.path.dirname(__file__)), "campaign.db")


class ContactManager:
    """Manages EOA prospect contacts, sequence stages, and send history."""

    def __init__(self, database_path: str = _DEFAULT_DB):
        self.db_path = database_path
        self.init_database()

    # ─────────────────────────────────────────────────────────────────────────
    # Schema
    # ─────────────────────────────────────────────────────────────────────────

    def init_database(self):
        """Initialize SQLite with WAL mode for concurrent safety."""
        conn = sqlite3.connect(self.db_path, timeout=30)
        cursor = conn.cursor()
        try:
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS contacts (
                    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                    email               TEXT UNIQUE NOT NULL,
                    first_name          TEXT,
                    last_name           TEXT,
                    role                TEXT,
                    company_name        TEXT,
                    business_niche      TEXT,
                    website             TEXT,
                    linkedin_url        TEXT,
                    home_country        TEXT,
                    source              TEXT,         -- facebook-group, linkedin, coworking, referral
                    archetype           TEXT,         -- founder, agency_owner, freelancer, developer, content_creator
                    status              TEXT DEFAULT 'active',
                    bounced             INTEGER DEFAULT 0,
                    complained          INTEGER DEFAULT 0,
                    last_contacted_at   TIMESTAMP,
                    claimed_by_inbox    TEXT,
                    claimed_at          TIMESTAMP,
                    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS send_log (
                    id               INTEGER PRIMARY KEY AUTOINCREMENT,
                    contact_id       INTEGER NOT NULL,
                    inbox_email      TEXT NOT NULL,
                    campaign_type    TEXT NOT NULL,  -- event_invite, speaker_recruitment, sponsor_pitch
                    sequence_stage   INTEGER NOT NULL,
                    message_id       TEXT,
                    sent_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status           TEXT,
                    error            TEXT,
                    FOREIGN KEY (contact_id) REFERENCES contacts(id)
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS inbox_contact_history (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    inbox_email  TEXT NOT NULL,
                    contact_id   INTEGER NOT NULL,
                    contacted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (contact_id) REFERENCES contacts(id)
                )
            """)

            conn.commit()
            logger.debug("EOA campaign.db initialized / verified.")
        except sqlite3.Error as e:
            logger.error(f"Database init error: {e}")
        finally:
            conn.close()

    # ─────────────────────────────────────────────────────────────────────────
    # Lead selection (atomic pick-and-lock, same as Ivybound pattern)
    # ─────────────────────────────────────────────────────────────────────────

    def get_pending_for_inbox(
        self,
        inbox_email: str,
        campaign_type: str,
        sequence_stage: int,
        followup_delay_days: int = 4,
    ) -> List[Dict]:
        """
        Atomically claim a single contact for the given stage.

        Stage 1 — fresh leads not yet contacted for this campaign_type.
        Stage 2+ — contacts who received the previous stage at least
                   followup_delay_days ago, from this same inbox.
        """
        conn = sqlite3.connect(self.db_path, timeout=30)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        try:
            if sequence_stage == 1:
                query = """
                    UPDATE contacts
                    SET claimed_by_inbox = ?, claimed_at = CURRENT_TIMESTAMP
                    WHERE id = (
                        SELECT c.id FROM contacts c
                        LEFT JOIN send_log sl
                            ON c.id = sl.contact_id
                            AND sl.campaign_type = ?
                            AND sl.sequence_stage >= 1
                        WHERE sl.id IS NULL
                          AND c.status = 'active'
                          AND c.bounced = 0
                          AND c.complained = 0
                          AND c.claimed_by_inbox IS NULL
                          AND c.id NOT IN (
                              SELECT contact_id FROM inbox_contact_history
                              WHERE inbox_email = ?
                          )
                        ORDER BY c.last_contacted_at ASC NULLS FIRST
                        LIMIT 1
                    )
                    RETURNING *
                """
                cursor.execute(query, (inbox_email, campaign_type, inbox_email))

            else:
                prev_stage = sequence_stage - 1
                query = """
                    UPDATE contacts
                    SET claimed_by_inbox = ?, claimed_at = CURRENT_TIMESTAMP
                    WHERE id = (
                        SELECT c.id FROM contacts c
                        JOIN send_log s_prev
                            ON c.id = s_prev.contact_id
                            AND s_prev.campaign_type = ?
                            AND s_prev.sequence_stage = ?
                            AND s_prev.inbox_email = ?
                        LEFT JOIN send_log s_next
                            ON c.id = s_next.contact_id
                            AND s_next.campaign_type = ?
                            AND s_next.sequence_stage = ?
                        WHERE s_next.id IS NULL
                          AND c.status = 'active'
                          AND c.bounced = 0
                          AND c.complained = 0
                          AND c.claimed_by_inbox IS NULL
                          AND s_prev.sent_at <= datetime('now', ?)
                        ORDER BY s_prev.sent_at ASC
                        LIMIT 1
                    )
                    RETURNING *
                """
                cursor.execute(query, (
                    inbox_email,
                    campaign_type, prev_stage, inbox_email,
                    campaign_type, sequence_stage,
                    f"-{followup_delay_days} days",
                ))

            rows = cursor.fetchall()
            conn.commit()
            if rows:
                logger.info(f"Claimed {rows[0]['email']} for {campaign_type} stage {sequence_stage}")
                return [dict(row) for row in rows]
            return []

        except sqlite3.Error as e:
            logger.error(f"get_pending_for_inbox error: {e}")
            return []
        finally:
            conn.close()

    # ─────────────────────────────────────────────────────────────────────────
    # Recording
    # ─────────────────────────────────────────────────────────────────────────

    def record_send(
        self,
        contact_id: int,
        inbox_email: str,
        campaign_type: str,
        sequence_stage: int,
        message_id: str,
        status: str = "sent",
        error: Optional[str] = None,
    ):
        """Record a successful (or failed) send and release the claim lock."""
        conn = sqlite3.connect(self.db_path, timeout=30)
        cursor = conn.cursor()
        try:
            cursor.execute(
                """
                INSERT INTO send_log (contact_id, inbox_email, campaign_type,
                                      sequence_stage, message_id, status, error)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (contact_id, inbox_email, campaign_type,
                 sequence_stage, message_id, status, error),
            )
            cursor.execute(
                """
                UPDATE contacts
                SET last_contacted_at = CURRENT_TIMESTAMP,
                    claimed_by_inbox = NULL,
                    claimed_at = NULL
                WHERE id = ?
                """,
                (contact_id,),
            )
            cursor.execute(
                "INSERT INTO inbox_contact_history (inbox_email, contact_id) VALUES (?, ?)",
                (inbox_email, contact_id),
            )
            conn.commit()
        except sqlite3.Error as e:
            logger.error(f"record_send error: {e}")
        finally:
            conn.close()

    def update_contact_status(self, email: str, status: str):
        """Update a contact's status (e.g. 'replied', 'unsubscribed', 'bounced')."""
        conn = sqlite3.connect(self.db_path, timeout=30)
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE contacts SET status = ? WHERE email = ?", (status, email)
            )
            conn.commit()
        except sqlite3.Error as e:
            logger.error(f"update_contact_status error: {e}")
        finally:
            conn.close()

    # ─────────────────────────────────────────────────────────────────────────
    # Bulk import (from Google Sheets / CSV)
    # ─────────────────────────────────────────────────────────────────────────

    def bulk_import_leads(self, leads: List[Dict]) -> int:
        """
        Upsert leads into the database.
        Returns the number of new rows added.
        """
        if not leads:
            return 0

        conn = sqlite3.connect(self.db_path, timeout=60)
        cursor = conn.cursor()
        added = 0
        try:
            data = [
                (
                    lead.get("email"),
                    lead.get("first_name"),
                    lead.get("last_name"),
                    lead.get("role"),
                    lead.get("company_name"),
                    lead.get("business_niche"),
                    lead.get("website"),
                    lead.get("linkedin_url"),
                    lead.get("home_country"),
                    lead.get("source"),
                    lead.get("archetype"),
                    lead.get("status", "active"),
                )
                for lead in leads
                if lead.get("email")
            ]
            cursor.executemany(
                """
                INSERT OR IGNORE INTO contacts (
                    email, first_name, last_name, role, company_name,
                    business_niche, website, linkedin_url, home_country,
                    source, archetype, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                data,
            )
            added = cursor.rowcount
            conn.commit()
            logger.info(f"Bulk imported {added} new leads.")
        except sqlite3.Error as e:
            logger.error(f"bulk_import_leads error: {e}")
        finally:
            conn.close()
        return added

    # ─────────────────────────────────────────────────────────────────────────
    # Maintenance
    # ─────────────────────────────────────────────────────────────────────────

    def scan_stale_locks(self) -> List[Dict]:
        """Return contacts whose claim lock is older than 60 minutes."""
        conn = sqlite3.connect(self.db_path, timeout=30)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        try:
            cursor.execute(
                """
                SELECT * FROM contacts
                WHERE claimed_by_inbox IS NOT NULL
                  AND claimed_at < datetime('now', '-60 minutes')
                """
            )
            rows = cursor.fetchall()
            stale = [dict(r) for r in rows]
            for lead in stale:
                logger.warning(
                    f"Stale lock: {lead['email']} locked by {lead['claimed_by_inbox']} "
                    f"since {lead['claimed_at']} — manual review required."
                )
            return stale
        except sqlite3.Error as e:
            logger.error(f"scan_stale_locks error: {e}")
            return []
        finally:
            conn.close()
