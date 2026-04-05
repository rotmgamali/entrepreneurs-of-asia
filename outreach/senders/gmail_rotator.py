"""
Gmail SMTP inbox rotator for EOA outreach engine.
Replaces Ivybound's MailreefRotator with direct Gmail SMTP sending.

Supports multiple Gmail accounts for rotation (add more accounts to
GMAIL_ACCOUNTS in automation/config.py to scale volume).
"""

import smtplib
import os
import sys
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, List, Dict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from automation.config import GMAIL_ACCOUNTS
from automation.logger_util import get_logger

logger = get_logger("GMAIL_ROTATOR")

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


class GmailRotator:
    """
    Round-robin rotation across configured Gmail accounts.
    Mirrors the interface of Ivybound's MailreefRotator.
    """

    def __init__(self):
        self._accounts: List[Dict] = [a for a in GMAIL_ACCOUNTS if a.get("email") and a.get("password")]
        self._cursor = 0
        if not self._accounts:
            logger.warning("No Gmail accounts configured — check GMAIL_USER / GMAIL_APP_PASSWORD env vars.")

    # ─────────────────────────────────────────────────────────────────────────
    # Inbox accessors
    # ─────────────────────────────────────────────────────────────────────────

    def get_all_inboxes(self) -> List[Dict]:
        """Return all configured inbox configs."""
        return list(self._accounts)

    def get_next_sender(self) -> Optional[Dict]:
        """Round-robin: return the next inbox and advance the cursor."""
        if not self._accounts:
            return None
        inbox = self._accounts[self._cursor]
        self._cursor = (self._cursor + 1) % len(self._accounts)
        return inbox

    def get_inbox_by_email(self, email: str) -> Optional[Dict]:
        """Look up an inbox config by email address."""
        for account in self._accounts:
            if account["email"].lower() == email.lower():
                return account
        return None

    # ─────────────────────────────────────────────────────────────────────────
    # Sending
    # ─────────────────────────────────────────────────────────────────────────

    def send_email(
        self,
        inbox: Dict,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
    ) -> str:
        """
        Send an email via Gmail SMTP.
        Returns a local message ID for tracking.
        Raises on failure (caller handles retry/logging).
        """
        sender_email = inbox["email"]
        sender_password = inbox["password"]
        display_name = inbox.get("display_name", "Entrepreneurs of Asia")

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{display_name} <{sender_email}>"
        msg["To"] = to_email
        msg["Message-ID"] = f"<{uuid.uuid4()}@eoa.community>"

        msg.attach(MIMEText(body_text, "plain"))
        if body_html:
            msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as server:
            server.ehlo()
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, [to_email], msg.as_string())

        local_id = msg["Message-ID"]
        logger.debug(f"Sent to {to_email} from {sender_email} — ID: {local_id}")
        return local_id

    def send_from_next(
        self,
        to_email: str,
        subject: str,
        body_text: str,
        body_html: Optional[str] = None,
    ) -> Optional[str]:
        """Convenience: pick the next sender and send."""
        inbox = self.get_next_sender()
        if not inbox:
            logger.error("No inboxes available to send.")
            return None
        return self.send_email(inbox, to_email, subject, body_text, body_html)
