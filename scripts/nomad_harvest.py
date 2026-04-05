#!/usr/bin/env python3
"""
Nomad Harvest — EOA Chiang Mai nomad discovery and enrichment pipeline.
Adapted from Ivybound Jobs/mass_harvest.py.

Usage:
  python scripts/nomad_harvest.py [--passes all|coworking|nomad_cafe|tech_community|expat_community]
                                  [--max-venues N]
                                  [--dry-run]
                                  [--skip-verify]
                                  [--min-score N]

Environment (from .env.local):
  APIFY_API_TOKEN                — required for Google Maps scraping
  GOOGLE_SPREADSHEET_ID          — EOA master spreadsheet
  GOOGLE_SERVICE_ACCOUNT_EMAIL   — service account email
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY — service account private key
"""
import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from typing import Dict, List

# Resolve scripts/ as package root
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../.env.local"))

from nomad_engine.config import DISCOVERY_PASSES, GENERIC_EMAIL_PREFIXES
from nomad_engine.scraper import search_cm_venues
from nomad_engine.website_crawler import extract_contacts
from nomad_engine.email_verifier import EmailVerifier
from nomad_engine.contact_scorer import score_nomad_profile, select_top_profiles
from nomad_engine.sheets_sync import sync_nomads, get_existing_profile_ids

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(name)s — %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("nomad_harvest")


def build_profile_from_contact(
    contact: Dict,
    venue: Dict,
    pass_name: str,
    email_status: str = "unknown",
) -> Dict:
    """
    Build a nomad profile dict from a venue contact.
    Maps Ivybound-style contact fields → EOA Nomads sheet fields.
    """
    name = contact.get("name", "").strip()
    parts = name.split(" ", 1) if name else ["", ""]
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ""

    return {
        "full_name": name,
        "first_name": first_name,
        "last_name": last_name,
        "email_primary": contact.get("email", "").lower().strip(),
        "email_status": email_status,
        "profession": contact.get("title", ""),
        "website": venue.get("website", ""),
        "linkedin_url": venue.get("linkedin_url", ""),
        "instagram_handle": venue.get("instagram", ""),
        "phone_whatsapp": venue.get("phone", ""),
        "company_name": venue.get("venue_name", ""),
        "company_url": venue.get("website", ""),
        # Venue tags as coworking signal
        "coworking_spaces": [venue.get("venue_name")] if pass_name == "coworking" else [],
        "data_sources": {
            "source": "nomad_harvest",
            "pass": pass_name,
            "venue": venue.get("venue_name", ""),
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        },
        "enrichment_status": "partial",
        "outreach_status": "not_contacted",
        "tags": [pass_name, "cm_venue_contact"],
        "notes": (
            f"Discovered via {pass_name} pass. "
            f"Venue: {venue.get('venue_name', '')}. "
            f"Category: {venue.get('category', '')}."
        ),
    }


def run_discovery_pass(
    pass_name: str,
    max_venues: int = 30,
    skip_verify: bool = False,
) -> List[Dict]:
    """
    Run one discovery pass: scrape venues → crawl websites → extract/verify contacts.
    Returns list of raw nomad profile candidates.
    """
    config = DISCOVERY_PASSES[pass_name]
    logger.info(f"\n{'='*60}")
    logger.info(f"DISCOVERY PASS: {pass_name.upper()}")
    logger.info(f"{'='*60}")

    venues = search_cm_venues(
        pass_name=pass_name,
        search_terms=config.map_search_terms,
        max_results=max_venues,
    )

    if not venues:
        logger.warning(f"[{pass_name}] No venues found")
        return []

    logger.info(f"[{pass_name}] Processing {len(venues)} venues")

    verifier = EmailVerifier()
    profiles: List[Dict] = []
    seen_emails: set = set()

    for venue in venues:
        venue_name = venue.get("venue_name", "Unknown")
        website = venue.get("website", "")

        logger.info(f"  → {venue_name} ({website or 'no website'})")

        contacts_data = {"emails": [], "contacts": []}

        # Add raw emails from Apify
        for raw in venue.get("raw_emails", []):
            email = raw.get("email", "").lower().strip()
            title = raw.get("title", "")
            if email and "@" in email:
                contacts_data["contacts"].append({"name": "", "title": title, "email": email})
                contacts_data["emails"].append(email)

        # Crawl website for more contacts
        if website:
            try:
                crawled = extract_contacts(website, config.subpage_paths)
                contacts_data["contacts"].extend(crawled["contacts"])
                contacts_data["emails"].extend(crawled["emails"])
            except Exception as e:
                logger.debug(f"  Crawl failed for {website}: {e}")

        if not contacts_data["contacts"] and not contacts_data["emails"]:
            logger.info(f"  No contacts found for {venue_name}")
            continue

        # Deduplicate and filter generic emails
        all_contacts = contacts_data["contacts"]

        # Also create placeholder contacts from raw emails without a name
        email_set = {c.get("email", "").lower() for c in all_contacts if c.get("email")}
        for e in contacts_data["emails"]:
            e_lower = e.lower().strip()
            if e_lower and e_lower not in email_set:
                prefix = e_lower.split("@")[0]
                if prefix not in GENERIC_EMAIL_PREFIXES:
                    all_contacts.append({"name": "", "title": "", "email": e_lower})
                    email_set.add(e_lower)

        for contact in all_contacts:
            email = contact.get("email", "").lower().strip()

            # Skip generic prefixes
            if email:
                prefix = email.split("@")[0]
                if prefix in GENERIC_EMAIL_PREFIXES:
                    continue

            # Skip already-seen emails in this run
            if email and email in seen_emails:
                continue
            if email:
                seen_emails.add(email)

            # Verify email
            email_status = "unknown"
            if email and not skip_verify:
                result = verifier.verify(email)
                email_status = result.status

            profile = build_profile_from_contact(contact, venue, pass_name, email_status)
            profiles.append(profile)

        time.sleep(1)  # polite crawl rate

    logger.info(f"[{pass_name}] Extracted {len(profiles)} candidate profiles")
    return profiles


def main():
    parser = argparse.ArgumentParser(description="EOA Nomad Harvest Pipeline")
    parser.add_argument(
        "--passes",
        nargs="+",
        default=["all"],
        choices=["all"] + list(DISCOVERY_PASSES.keys()),
        help="Discovery passes to run (default: all)",
    )
    parser.add_argument(
        "--max-venues",
        type=int,
        default=30,
        help="Max venues per search term per pass (default: 30)",
    )
    parser.add_argument(
        "--min-score",
        type=int,
        default=1,
        help="Min nomad score to include in sync (0–10, default: 1)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Score and log profiles without writing to Sheets",
    )
    parser.add_argument(
        "--skip-verify",
        action="store_true",
        help="Skip email DNS verification (faster, less accurate)",
    )
    args = parser.parse_args()

    passes_to_run = list(DISCOVERY_PASSES.keys()) if "all" in args.passes else args.passes

    logger.info("=" * 70)
    logger.info("EOA NOMAD HARVEST")
    logger.info(f"Passes: {passes_to_run}")
    logger.info(f"Max venues/term: {args.max_venues}")
    logger.info(f"Min score: {args.min_score}")
    logger.info(f"Dry run: {args.dry_run}")
    logger.info(f"Skip verify: {args.skip_verify}")
    logger.info("=" * 70)

    # Load existing emails for dedup (skip if dry run to avoid API calls)
    existing_emails: set = set()
    if not args.dry_run:
        try:
            existing_emails = get_existing_profile_ids()
            logger.info(f"Loaded {len(existing_emails)} existing nomad emails for dedup")
        except Exception as e:
            logger.warning(f"Could not load existing profiles: {e}")

    all_candidates: List[Dict] = []

    for pass_name in passes_to_run:
        try:
            profiles = run_discovery_pass(
                pass_name=pass_name,
                max_venues=args.max_venues,
                skip_verify=args.skip_verify,
            )
            all_candidates.extend(profiles)
        except Exception as e:
            logger.error(f"Pass {pass_name} failed: {e}")
            continue

    logger.info(f"\nTotal candidates across all passes: {len(all_candidates)}")

    # Dedup against existing sheet
    new_candidates = [
        p for p in all_candidates
        if not p.get("email_primary") or p["email_primary"].lower() not in existing_emails
    ]
    logger.info(f"After dedup: {len(new_candidates)} new candidates")

    # Score and filter
    top_profiles = select_top_profiles(
        new_candidates,
        min_score=args.min_score,
        max_profiles=500,
    )
    logger.info(f"After scoring (min={args.min_score}): {len(top_profiles)} profiles to sync")

    if not top_profiles:
        logger.info("Nothing to sync. Done.")
        return

    # Score distribution summary
    from collections import Counter
    score_counts = Counter(p.get("confidence_score", 0) for p in top_profiles)
    logger.info("Score distribution: " + ", ".join(
        f"{s}→{c}" for s, c in sorted(score_counts.items(), reverse=True)
    ))

    # Sync to Google Sheets
    result = sync_nomads(top_profiles, dry_run=args.dry_run)

    logger.info("\n" + "=" * 70)
    logger.info("HARVEST COMPLETE")
    logger.info(f"  Synced:   {result['synced']}")
    logger.info(f"  Inserted: {result['inserted']}")
    logger.info(f"  Updated:  {result['updated']}")
    if args.dry_run:
        logger.info("  [dry run — no data written]")
    logger.info("=" * 70)


if __name__ == "__main__":
    main()
