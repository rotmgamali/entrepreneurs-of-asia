"""
Global suppression list for EOA outreach engine.
Adapted from Ivybound mailreef_automation/suppression_manager.py

Ensures no email address is ever contacted twice across any campaign.
Uses SQLite for high-speed local lookups.
"""

import sqlite3
import os
from datetime import datetime
from typing import Optional, List
from .logger_util import get_logger

logger = get_logger("SUPPRESSION")

_DEFAULT_DB = os.path.join(os.path.dirname(os.path.dirname(__file__)), "suppression.db")


class SuppressionManager:
    """Fast local suppression list backed by SQLite."""

    def __init__(self, db_path: str = _DEFAULT_DB):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS suppressed_emails (
                    email      TEXT PRIMARY KEY,
                    campaign   TEXT,
                    added_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Failed to initialize suppression DB: {e}")

    # ─────────────────────────────────────────────────────────────────────────

    def is_suppressed(self, email: str) -> bool:
        if not email:
            return True
        email = email.lower().strip()
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM suppressed_emails WHERE email = ?", (email,))
            result = cursor.fetchone()
            conn.close()
            return result is not None
        except Exception as e:
            logger.error(f"is_suppressed error for {email}: {e}")
            return False

    def add_to_suppression(self, email: str, campaign: Optional[str] = None):
        if not email:
            return
        email = email.lower().strip()
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO suppressed_emails (email, campaign, added_at) "
                "VALUES (?, ?, CURRENT_TIMESTAMP)",
                (email, campaign),
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"add_to_suppression error for {email}: {e}")

    def acquire_lock(self, email: str, campaign: str = "LOCK_PROCESSING") -> bool:
        """Atomically lock email for processing. Returns False if already locked."""
        if not email:
            return False
        email = email.lower().strip()
        try:
            conn = sqlite3.connect(self.db_path)
            conn.isolation_level = "IMMEDIATE"
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO suppressed_emails (email, campaign) VALUES (?, ?)",
                (email, campaign),
            )
            conn.commit()
            conn.close()
            return True
        except sqlite3.IntegrityError:
            return False
        except Exception as e:
            logger.error(f"acquire_lock error for {email}: {e}")
            return False

    def release_lock(self, email: str):
        """Release a processing lock (e.g. if email generation fails)."""
        if not email:
            return
        email = email.lower().strip()
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM suppressed_emails WHERE email = ? AND campaign = 'LOCK_PROCESSING'",
                (email,),
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"release_lock error for {email}: {e}")

    def bulk_add(self, emails: List[str], campaign: Optional[str] = None):
        """Add multiple emails at once (e.g. bounces, unsubscribes from sheets)."""
        if not emails:
            return
        data = [(e.lower().strip(), campaign) for e in emails if e]
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.executemany(
                "INSERT OR IGNORE INTO suppressed_emails (email, campaign) VALUES (?, ?)",
                data,
            )
            conn.commit()
            conn.close()
            logger.info(f"Bulk-suppressed {len(data)} emails.")
        except Exception as e:
            logger.error(f"bulk_add error: {e}")
