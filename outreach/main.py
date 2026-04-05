#!/usr/bin/env python3
"""
EOA Outreach Engine — Entry Point
Adapted from Ivybound mailreef_automation/main.py

Usage:
  python outreach/main.py --campaign EOA_EVENT_INVITE
  python outreach/main.py --campaign EOA_SPEAKER_RECRUITMENT
  python outreach/main.py --campaign EOA_SPONSOR_PITCH

The scheduler runs continuously, preparing a daily send queue at 5 AM Bangkok time
and firing emails across the configured Gmail inboxes within business-hours windows.

Required env vars (in .env or environment):
  OPENAI_API_KEY
  GMAIL_USER
  GMAIL_APP_PASSWORD
  EOA_RSVP_URL              (optional, defaults to https://eoa.community/rsvp)
  GOOGLE_SHEETS_CREDENTIALS (path to service account JSON, for Sheets CRM)
"""

import argparse
import sys
import os
import time
import signal
import logging

# Ensure outreach/ is on the path when running from project root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from automation.config import CAMPAIGN_PROFILES
from automation.scheduler import EmailScheduler
from automation.logger_util import get_logger

logger = get_logger("MAIN", "outreach/logs/main.log")


def parse_args():
    parser = argparse.ArgumentParser(description="EOA Outreach Engine")
    parser.add_argument(
        "--campaign",
        choices=list(CAMPAIGN_PROFILES.keys()),
        default="EOA_EVENT_INVITE",
        help="Campaign profile to run (default: EOA_EVENT_INVITE)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Prepare and log the daily queue without sending emails",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    logger.info(f"Starting EOA Outreach Engine — campaign: {args.campaign}")

    if args.dry_run:
        logger.info("[DRY RUN] Scheduler will prepare queue but NOT send emails.")

    scheduler = EmailScheduler(campaign_profile=args.campaign)

    # Graceful shutdown on SIGINT / SIGTERM
    def shutdown(signum, frame):
        logger.info("Received shutdown signal — stopping scheduler.")
        scheduler.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    scheduler.start()

    logger.info("Scheduler running. Press Ctrl+C to stop.")
    while True:
        time.sleep(60)


if __name__ == "__main__":
    main()
