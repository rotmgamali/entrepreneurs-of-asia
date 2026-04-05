"""
EOA Outreach Scheduler
Adapted from Ivybound mailreef_automation/scheduler.py

Key changes:
- Uses GmailRotator instead of MailreefClient
- Timezone set to Asia/Bangkok (Chiang Mai)
- Supports EOA campaign types and archetypes
- Google Sheets as the CRM source of truth (same as Ivybound)
"""

import random
import time
import threading
import sys
import os
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from automation.config import (
    TIMEZONE,
    BUSINESS_DAY_WINDOWS,
    WEEKEND_DAY_WINDOWS,
    INBOXES_PER_DAY_BUSINESS,
    INBOXES_PER_DAY_WEEKEND,
    EMAILS_PER_INBOX_DAY_BUSINESS,
    EMAILS_PER_INBOX_DAY_WEEKEND,
    MAX_DAILY_SENDS_PER_INBOX,
    FOLLOWUP_DELAYS,
    PHYSICAL_ADDRESS,
    UNSUBSCRIBE_MAILTO,
    CAMPAIGN_PROFILES,
)
from automation.suppression_manager import SuppressionManager
from automation.logger_util import get_logger
from generators.email_generator import EmailGenerator
from senders.gmail_rotator import GmailRotator

TZ = pytz.timezone(TIMEZONE)


class EmailScheduler:
    """Manages daily scheduling and sending for an EOA campaign profile."""

    def __init__(self, campaign_profile: str = "EOA_EVENT_INVITE"):
        self.profile_key = campaign_profile
        self.profile = CAMPAIGN_PROFILES[campaign_profile]
        self.campaign_type = self.profile["campaign_type"]

        log_file = self.profile["log_file"]
        self.logger = get_logger("SCHEDULER", log_file)

        self.rotator = GmailRotator()
        self.generator = EmailGenerator(
            templates_dir=self.profile["templates_dir"],
            log_file=log_file,
            archetypes=self.profile.get("archetypes", {}),
        )
        self.suppression = SuppressionManager()

        self.scheduler = BackgroundScheduler(timezone=TZ)
        self.is_running = False

        # Per-inbox daily send cap tracking  (inbox_email_YYYYMMDD -> count)
        self._daily_send_counts: dict = {}
        self._daily_cap = MAX_DAILY_SENDS_PER_INBOX

        # Sheets integration (Google Sheets as CRM)
        from sheets_integration import GoogleSheetsClient
        self.sheets = GoogleSheetsClient(
            input_sheet_name=self.profile["input_sheet"],
            replies_sheet_name=self.profile["replies_sheet"],
        )
        self.sheets.setup_sheets()

        # Lead caches
        self._lead_cache: list = []
        self._followup_cache: dict = {}
        self._last_cache_update = datetime.min
        self._last_followup_update = datetime.min
        self._cache_lock = threading.Lock()
        self.CACHE_TTL = timedelta(minutes=5)
        self.FOLLOWUP_CACHE_TTL = timedelta(minutes=10)

    # ─────────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────────

    def start(self):
        if not self.is_running:
            self.scheduler.start()
            self.is_running = True
            self.logger.info(f"EOA Email Scheduler started ({self.profile_key}) — {TIMEZONE}")
            self._schedule_daily_runs()
            self.logger.info("Triggering immediate daily queue prep…")
            self._prepare_daily_queue()

    def stop(self):
        self.scheduler.shutdown()
        self.is_running = False
        self.logger.info("Scheduler stopped.")

    # ─────────────────────────────────────────────────────────────────────────
    # Scheduling
    # ─────────────────────────────────────────────────────────────────────────

    def _schedule_daily_runs(self):
        """Schedule daily queue preparation at 5 AM Bangkok time."""
        self.scheduler.add_job(
            self._prepare_daily_queue,
            CronTrigger(hour=5, minute=0, day_of_week="0-6", timezone=TIMEZONE),
            id="daily_prepare",
            replace_existing=True,
        )
        self.logger.info("Daily queue prep scheduled for 05:00 Asia/Bangkok.")

    def _prepare_daily_queue(self):
        self.logger.info("Starting daily queue preparation…")
        now = datetime.now(TZ)
        day_type = "weekend" if now.weekday() in (5, 6) else "business"
        slots = self._generate_send_slots(day_type)
        self.logger.info(f"Generated {len(slots)} send slots ({day_type}).")

        for slot in slots:
            job_id = (
                f"slot_{slot['inbox_email']}_"
                f"{slot['scheduled_time'].strftime('%Y%m%d%H%M%S')}_"
                f"{random.randint(1000, 9999)}"
            )
            self.scheduler.add_job(
                self._execute_slot,
                "date",
                run_date=slot["scheduled_time"],
                args=[slot["inbox_email"], slot["scheduled_time"]],
                id=job_id,
                misfire_grace_time=3600,
            )

        self._log_upcoming_sends(limit=5)

    def _generate_send_slots(self, day_type: str) -> list:
        """Build a list of {inbox_email, scheduled_time} dicts for today."""
        windows = BUSINESS_DAY_WINDOWS if day_type == "business" else WEEKEND_DAY_WINDOWS
        inboxes = self.rotator.get_all_inboxes()
        if not inboxes:
            self.logger.warning("No Gmail inboxes configured — skipping slot generation.")
            return []

        slots = []
        now = datetime.now(TZ)

        for window in windows:
            for inbox in inboxes:
                for _ in range(window["emails_per_inbox"]):
                    if window["start"] == now.hour:
                        jitter = now.minute + random.randint(2, 10)
                        jitter = min(jitter, 59)
                    else:
                        jitter = random.randint(5, 55)

                    send_time = now.replace(
                        hour=window["start"],
                        minute=jitter,
                        second=0,
                        microsecond=0,
                    ) + timedelta(seconds=random.randint(60, 300))

                    slots.append(
                        {"inbox_email": inbox["email"], "scheduled_time": send_time}
                    )

        slots.sort(key=lambda x: x["scheduled_time"])
        return slots

    # ─────────────────────────────────────────────────────────────────────────
    # Slot execution
    # ─────────────────────────────────────────────────────────────────────────

    def _execute_slot(self, inbox_email: str, scheduled_time: datetime):
        """Execute one send slot with sequence prioritization."""
        today_key = f"{inbox_email}_{datetime.now(TZ).strftime('%Y%m%d')}"
        if self._daily_send_counts.get(today_key, 0) >= self._daily_cap:
            return

        # Random jitter to avoid burst pattern
        time.sleep(random.uniform(0, 15))

        seq_len = self.profile.get("sequence_length", 3)
        prospects = None
        stage = 1

        # Prioritize follow-ups
        if seq_len > 1:
            for s in range(seq_len, 1, -1):
                prospects = self._select_followup(inbox_email, s)
                if prospects:
                    stage = s
                    break

        if not prospects:
            prospects = self._select_stage1(inbox_email)
            stage = 1

        if not prospects:
            return

        lead_email = prospects[0].get("email")
        if self.suppression.is_suppressed(lead_email):
            self.logger.warning(f"Skipping suppressed lead: {lead_email}")
            try:
                self.sheets.update_lead_status(lead_email, "duplicate")
            except Exception:
                pass
            return

        self.logger.info(
            f"[SLOT] Stage {stage} send for {lead_email} from {inbox_email}"
        )
        self.execute_send(inbox_email, prospects, sequence_number=stage)

    # ─────────────────────────────────────────────────────────────────────────
    # Lead selection (Sheets-first, same as Ivybound pattern)
    # ─────────────────────────────────────────────────────────────────────────

    def _select_stage1(self, inbox_email: str) -> list:
        self._refresh_stage1_cache()
        selected = []
        with self._cache_lock:
            while self._lead_cache:
                candidate = self._lead_cache.pop(0)
                if not self.suppression.is_suppressed(candidate.get("email", "")):
                    selected.append(candidate)
                    break
        return selected

    def _select_followup(self, inbox_email: str, stage: int) -> list:
        now = datetime.now()
        if inbox_email not in self._followup_cache or (
            now - self._last_followup_update
        ) > self.FOLLOWUP_CACHE_TTL:
            try:
                new_batch = self.sheets.get_leads_for_followup(
                    sender_email=inbox_email, limit=20
                )
                self._followup_cache[inbox_email] = new_batch
                self._last_followup_update = now
            except Exception as e:
                self.logger.error(f"Follow-up cache refresh failed: {e}")
                return []

        cache = self._followup_cache.get(inbox_email, [])
        while cache:
            candidate = cache.pop(0)
            if not self.suppression.is_suppressed(candidate.get("email")):
                return [candidate]
        return []

    def _refresh_stage1_cache(self):
        with self._cache_lock:
            now = datetime.now()
            if (now - self._last_cache_update) <= self.CACHE_TTL:
                return
            try:
                new_batch = self.sheets.get_pending_leads(limit=50)
                self._last_cache_update = now
                self._lead_cache = new_batch or []
                self.logger.info(f"Stage-1 cache refreshed: {len(self._lead_cache)} leads.")
            except Exception as e:
                self._last_cache_update = now  # back off on error
                self.logger.error(f"Stage-1 cache refresh failed: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # Send execution
    # ─────────────────────────────────────────────────────────────────────────

    def execute_send(self, inbox_email: str, prospects: list, sequence_number: int = 1):
        """Generate and send an email for each prospect via Gmail."""
        inbox = self.rotator.get_inbox_by_email(inbox_email)
        if not inbox:
            self.logger.error(f"Inbox not found: {inbox_email}")
            return []

        results = []
        for prospect in prospects:
            target_email = prospect.get("email", "").strip()
            if not target_email:
                continue

            try:
                # Lock before generation to prevent double-send
                self.suppression.add_to_suppression(
                    target_email, self.profile_key
                )

                result = self.generator.generate_email(
                    campaign_type=self.campaign_type,
                    sequence_number=sequence_number,
                    lead_data=dict(prospect),
                    sender_email=inbox_email,
                )

                if result.get("subject") == "SKIP_LEAD":
                    self.logger.warning(
                        f"SKIP_LEAD for {target_email}: {result.get('body')}"
                    )
                    self.sheets.update_lead_status(
                        target_email, "invalid", sent_at=datetime.now(), sender_email=inbox_email
                    )
                    continue

                subject = result["subject"]
                body_text = result["body"]
                body_html = body_text.replace("\n", "<br>")

                # CAN-SPAM footer
                if PHYSICAL_ADDRESS and UNSUBSCRIBE_MAILTO:
                    body_text += (
                        f"\n\n---\n{PHYSICAL_ADDRESS}\n"
                        f"To stop receiving these emails, reply \"unsubscribe\" or "
                        f"email {UNSUBSCRIBE_MAILTO}"
                    )
                    body_html += (
                        f'<br><br><hr style="border:none;border-top:1px solid #ddd;margin:20px 0">'
                        f'<p style="font-size:11px;color:#999">{PHYSICAL_ADDRESS}<br>'
                        f'To stop receiving these, reply "unsubscribe" or email '
                        f'<a href="mailto:{UNSUBSCRIBE_MAILTO}" style="color:#999">'
                        f"{UNSUBSCRIBE_MAILTO}</a></p>"
                    )

                msg_id = self.rotator.send_email(
                    inbox=inbox,
                    to_email=target_email,
                    subject=subject,
                    body_text=body_text,
                    body_html=f"<html><body>{body_html}</body></html>",
                )

                self.logger.info(
                    f"[SENT] {target_email} via {inbox_email} "
                    f"({self.campaign_type} stage {sequence_number}) MsgID={msg_id}"
                )

                # Track daily cap
                today_key = f"{inbox_email}_{datetime.now(TZ).strftime('%Y%m%d')}"
                self._daily_send_counts[today_key] = (
                    self._daily_send_counts.get(today_key, 0) + 1
                )

                # Update Sheets CRM
                status = f"email_{sequence_number}_sent"
                self.sheets.update_lead_status(
                    email=target_email,
                    status=status,
                    sent_at=datetime.now(),
                    sender_email=inbox_email,
                    content=body_text,
                )

                results.append({"email": target_email, "status": "sent", "msg_id": msg_id})

            except Exception as e:
                self.logger.error(f"[SEND FAILURE] {target_email}: {e}")

        return results

    # ─────────────────────────────────────────────────────────────────────────

    def _log_upcoming_sends(self, limit: int = 5):
        jobs = [j for j in self.scheduler.get_jobs() if j.id.startswith("slot_")]
        jobs.sort(key=lambda x: x.next_run_time)
        if not jobs:
            self.logger.info("No upcoming send slots in queue.")
            return
        self.logger.info(f"Upcoming sends (next {min(len(jobs), limit)}):")
        for i, job in enumerate(jobs[:limit]):
            rt = job.next_run_time.strftime("%I:%M %p %Z")
            self.logger.info(f"  {i+1}. {rt} → {job.id.split('_')[1]}")
