"""
Nomad profile scorer.
Adapted from Ivybound lead_engine/contact_scorer.py.
New scoring: nomad-specific quality signals instead of B2B decision-maker seniority.

Scoring rubric:
  has_email          +1  — contactable
  has_website        +1  — established online presence
  has_linkedin       +1  — professional profile
  has_social         +1  — any social (twitter/instagram/facebook)
  nomad_profession   +1  — profession matches nomad-friendly keywords
  in_cm_groups       +2  — active in Chiang Mai nomad Facebook groups
  has_coworking      +1  — frequents known CM coworking spaces
  email_verified     +1  — verified email (not disposable / catch-all)
  has_company        +1  — has company name/URL (operator, not tourist)

Max score: 10
"""
from typing import Dict, List

from nomad_engine.config import NOMAD_PROFESSIONS, CM_NOMAD_GROUPS, GENERIC_EMAIL_PREFIXES


def score_nomad_profile(profile: Dict) -> int:
    """
    Score a candidate nomad profile. Higher = stronger nomad signal.
    Returns integer 0–10.
    """
    score = 0

    # Email
    email = (profile.get("email_primary") or profile.get("email") or "").strip().lower()
    if email and "@" in email:
        prefix = email.split("@")[0]
        if prefix not in GENERIC_EMAIL_PREFIXES:
            score += 1

    # Website
    if profile.get("website") or profile.get("company_url"):
        score += 1

    # LinkedIn
    if profile.get("linkedin_url"):
        score += 1

    # Any social (twitter, instagram, facebook personal)
    if any(profile.get(s) for s in ["twitter_x_handle", "instagram_handle", "facebook_profile_url"]):
        score += 1

    # Nomad-relevant profession
    profession = (profile.get("profession") or profile.get("title") or "").lower()
    if any(kw in profession for kw in NOMAD_PROFESSIONS):
        score += 1

    # CM nomad groups
    groups_raw = profile.get("facebook_groups") or ""
    if isinstance(groups_raw, list):
        groups = {g.lower() for g in groups_raw}
    else:
        groups = {g.strip().lower() for g in str(groups_raw).split(",") if g.strip()}
    cm_groups_lower = {g.lower() for g in CM_NOMAD_GROUPS}
    if groups & cm_groups_lower:
        score += 2

    # Known CM coworking space
    coworking_raw = profile.get("coworking_spaces") or ""
    if isinstance(coworking_raw, list):
        coworking = [c.lower() for c in coworking_raw]
    else:
        coworking = [c.strip().lower() for c in str(coworking_raw).split(",") if c.strip()]
    if coworking:
        score += 1

    # Verified email
    if profile.get("email_status") == "verified":
        score += 1

    # Has company info (suggests they're an operator, not a tourist)
    if profile.get("company_name") or profile.get("company_url"):
        score += 1

    return min(score, 10)


def select_top_profiles(
    profiles: List[Dict],
    min_score: int = 2,
    max_profiles: int = 50,
) -> List[Dict]:
    """
    Score and filter profiles. Returns top N above min_score, sorted descending.
    """
    scored = []
    seen_emails: set = set()

    for profile in profiles:
        email = (
            profile.get("email_primary") or profile.get("email") or ""
        ).strip().lower()

        # Dedup by email if present
        if email and email in seen_emails:
            continue
        if email:
            seen_emails.add(email)

        s = score_nomad_profile(profile)
        if s >= min_score:
            profile["confidence_score"] = s
            scored.append(profile)

    scored.sort(key=lambda x: x.get("confidence_score", 0), reverse=True)
    return scored[:max_profiles]
