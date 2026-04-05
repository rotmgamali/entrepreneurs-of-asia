"""
Apify Google Maps scraper for CM nomad venue discovery.
Adapted from Ivybound lead_engine/scraper.py — searches coworking spaces,
nomad cafes, and tech communities in Chiang Mai instead of US businesses.
"""
import os
import logging
import time
from typing import List, Dict, Optional

from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env.local"))
logger = logging.getLogger("nomad_engine.scraper")


def search_cm_venues(
    pass_name: str,
    search_terms: List[str],
    max_results: int = 50,
) -> List[Dict]:
    """
    Search Google Maps via Apify for nomad-relevant venues in Chiang Mai.
    Returns normalized venue dicts.
    """
    token = os.getenv("APIFY_API_TOKEN")
    if not token:
        logger.error("APIFY_API_TOKEN not set")
        return []

    try:
        from apify_client import ApifyClient
    except ImportError:
        logger.error("apify-client not installed. Run: pip install apify-client")
        return []

    client = ApifyClient(token)

    run_input = {
        "searchStringsArray": search_terms,
        "maxCrawledPlacesPerSearch": max_results,
        "language": "en",
        "scrapeSocialMediaProfiles": True,
        "emailAndContactScrapingMode": "emailsFromWebsite",
        "onlyConfirmedEmails": False,
        "maxImages": 0,
        "maxReviews": 0,
    }

    logger.info(f"[{pass_name}] Searching Maps: {len(search_terms)} terms")

    try:
        run = client.actor("compass/crawler-google-places").call(run_input=run_input)
        items = client.dataset(run["defaultDatasetId"]).list_items().items
        logger.info(f"[{pass_name}] Found {len(items)} venues")
    except Exception as e:
        logger.error(f"[{pass_name}] Apify error: {e}")
        try:
            time.sleep(5)
            run = client.actor("compass/crawler-google-places").call(run_input=run_input)
            items = client.dataset(run["defaultDatasetId"]).list_items().items
            logger.info(f"[{pass_name}] Retry: {len(items)} venues")
        except Exception as e2:
            logger.error(f"[{pass_name}] Apify retry failed: {e2}")
            return []

    venues = []
    seen_names: set = set()

    for item in items:
        name = (item.get("title") or "").strip()
        if not name or name.lower() in seen_names:
            continue
        seen_names.add(name.lower())

        raw_emails = []
        if item.get("emails"):
            for e in item["emails"]:
                if isinstance(e, dict):
                    raw_emails.append({"email": e.get("value", ""), "title": e.get("description", "")})
                elif isinstance(e, str):
                    raw_emails.append({"email": e, "title": ""})
        elif item.get("email"):
            raw_emails.append({"email": item["email"], "title": ""})

        venues.append({
            "venue_name": name,
            "pass_name": pass_name,
            "category": item.get("categoryName", ""),
            "website": item.get("website") or item.get("url") or "",
            "phone": item.get("phone") or item.get("phoneNumber") or "",
            "address": item.get("address") or "",
            "raw_emails": raw_emails,
            # Social profiles from Apify (when available)
            "facebook_url": item.get("facebook") or "",
            "instagram": item.get("instagram") or "",
            "linkedin_url": item.get("linkedin") or "",
        })

    return venues
