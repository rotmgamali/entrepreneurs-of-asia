"""
EOA Email Generator — OpenAI-powered personalized email generation.
Adapted from Ivybound generators/email_generator.py

Key changes:
- EOA archetypes (founder, agency_owner, freelancer, developer, content_creator)
- Chiang Mai / nomad community context in system prompt
- Removed school scraper; optional lightweight website summarization
- Supports 3 campaign types: event_invite, speaker_recruitment, sponsor_pitch
"""

import os
import sys
import re
import json
from pathlib import Path
from typing import Optional, Dict, Any

from openai import OpenAI
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from automation.config import OPENAI_API_KEY, OPENAI_MODEL, EVENT_NAME, EVENT_LOCATION, RSVP_URL
from automation.logger_util import get_logger

load_dotenv()

_logger = get_logger("EMAIL_GENERATOR")

# Default EOA archetype keyword map (overrideable per campaign profile)
DEFAULT_ARCHETYPES: Dict[str, list] = {
    "founder": [
        "founder", "co-founder", "cofounder", "ceo", "chief executive",
        "entrepreneur", "owner", "managing director",
    ],
    "agency_owner": [
        "agency", "studio", "marketing", "advertising",
        "creative director", "consulting", "services", "growth hacker",
    ],
    "freelancer": [
        "freelancer", "freelance", "independent", "contractor",
        "consultant", "self-employed",
    ],
    "developer": [
        "developer", "engineer", "programmer", "cto",
        "chief technology", "tech lead", "software", "backend",
        "frontend", "full stack", "devops", "data scientist",
    ],
    "content_creator": [
        "creator", "influencer", "blogger", "podcaster",
        "writer", "youtuber", "videographer", "content", "author",
    ],
}

EOA_SYSTEM_PROMPT = """
You write personalized cold outreach emails for Entrepreneurs of Asia (EOA) — a weekly founders
event in Chiang Mai, Thailand. The event is called CM Founders. It runs every Thursday evening at
{event_location} and brings together ~40 vetted founders, digital nomads, freelancers, and creators.

PERSONA: You are writing on behalf of the EOA organizer — a fellow entrepreneur in the community,
not a marketer. Tone is direct, warm, peer-to-peer. Never corporate. Never salesy.

RULES:
1. Write exactly the subject line and body requested by the template.
2. Subject line: short (≤8 words), curiosity-driven, no caps spam, no exclamation marks in subject.
3. Body: conversational, no fluff. Get to the point fast. 2-3 short paragraphs max.
4. Personalize the opening line using the lead data provided. Reference their actual work, niche,
   or background — not generic compliments.
5. Never invent facts. If you have no personalization data, write a neutral but honest opener.
6. Output ONLY valid JSON in this exact shape:
   {{"subject": "...", "body": "..."}}
   Do not include markdown, code fences, or any text outside the JSON.
""".strip()


class EmailGenerator:
    """
    Generates personalized outreach emails using OpenAI + template files.
    Mirrors the architecture of Ivybound's EmailGenerator.
    """

    def __init__(
        self,
        client: Optional[Any] = None,
        templates_dir: str = "templates",
        log_file: str = "outreach.log",
        archetypes: Optional[Dict] = None,
    ):
        self.client = client or OpenAI(api_key=OPENAI_API_KEY or os.getenv("OPENAI_API_KEY"))
        self.templates_dir = Path(templates_dir) if Path(templates_dir).is_absolute() else (
            Path(__file__).resolve().parent.parent / templates_dir
        )
        self.archetypes = archetypes or DEFAULT_ARCHETYPES
        self.logger = get_logger("EMAIL_GENERATOR", log_file)

    # ─────────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────────

    def generate_email(
        self,
        campaign_type: str,
        sequence_number: int,
        lead_data: dict,
        sender_email: Optional[str] = None,
    ) -> dict:
        """
        Generate a personalized email for the given campaign/stage/lead.
        Returns {"subject": str, "body": str}.
        """
        archetype = self._get_archetype(lead_data.get("role", "") or lead_data.get("archetype", ""))
        self.logger.debug(f"[GEN] {campaign_type} stage {sequence_number} — archetype: {archetype}")

        template = self._load_template(campaign_type, archetype, sequence_number)
        if not template and archetype != "general":
            template = self._load_template(campaign_type, "general", sequence_number)
        if not template:
            self.logger.error(
                f"No template found for {campaign_type}/{archetype}/{sequence_number}"
            )
            return {"subject": "Quick question", "body": "I'd love to connect — let me know if you have a moment."}

        # Optional light website enrichment
        website_summary = ""
        website = lead_data.get("website") or lead_data.get("domain") or ""
        if website:
            website_summary = self._light_scrape(website)

        user_prompt = self._build_prompt(
            template=template,
            lead_data=lead_data,
            website_summary=website_summary,
            sender_email=sender_email or "",
            sequence_number=sequence_number,
        )
        system_prompt = EOA_SYSTEM_PROMPT.format(event_location=EVENT_LOCATION)

        result = self._call_llm(user_prompt, system_prompt)

        # Build envelope
        first_name = (lead_data.get("first_name") or "").strip() or "there"
        greeting = f"Hi {first_name},"
        sign_off = self._build_sign_off(sender_email)

        body = result.get("body", "").strip()
        # Strip AI-hallucinated greeting if present
        if body.lower().startswith("hi ") or body.lower().startswith("hey "):
            first_line = body.split("\n")[0]
            if len(first_line) < 40:
                body = "\n".join(body.split("\n")[1:]).strip()

        final_body = f"{greeting}\n\n{body}\n\n{sign_off}"

        self.logger.info(f"Generated: '{result.get('subject')}' for {lead_data.get('email')}")
        return {
            "subject": result.get("subject") or "Quick question",
            "body": final_body,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Archetype detection
    # ─────────────────────────────────────────────────────────────────────────

    def _get_archetype(self, role: str) -> str:
        role = (role or "").lower().strip()
        for archetype, keywords in self.archetypes.items():
            if any(kw in role for kw in keywords):
                return archetype
        return "general"

    # ─────────────────────────────────────────────────────────────────────────
    # Template loading
    # ─────────────────────────────────────────────────────────────────────────

    def _load_template(self, campaign_type: str, archetype: str, stage: int) -> Optional[str]:
        path = self.templates_dir / campaign_type / archetype / f"email_{stage}.txt"
        if path.exists():
            return path.read_text(encoding="utf-8").strip()
        return None

    # ─────────────────────────────────────────────────────────────────────────
    # Prompt construction
    # ─────────────────────────────────────────────────────────────────────────

    def _build_prompt(
        self,
        template: str,
        lead_data: dict,
        website_summary: str,
        sender_email: str,
        sequence_number: int,
    ) -> str:
        first_name = lead_data.get("first_name") or "the recipient"
        role = lead_data.get("role") or "entrepreneur"
        business_niche = lead_data.get("business_niche") or lead_data.get("company_name") or ""
        home_country = lead_data.get("home_country") or ""
        source = lead_data.get("source") or ""
        linkedin_url = lead_data.get("linkedin_url") or ""

        context_parts = [
            f"First name: {first_name}",
            f"Role: {role}",
        ]
        if business_niche:
            context_parts.append(f"Business/niche: {business_niche}")
        if home_country:
            context_parts.append(f"Home country: {home_country}")
        if source:
            context_parts.append(f"How we found them: {source}")
        if linkedin_url:
            context_parts.append(f"LinkedIn: {linkedin_url}")
        if website_summary:
            context_parts.append(f"Website summary: {website_summary}")

        context_block = "\n".join(context_parts)

        return f"""
LEAD CONTEXT:
{context_block}

EMAIL SEQUENCE: Stage {sequence_number} of 3

TEMPLATE (use this as your guide — personalize the {{{{ personalized_opening }}}} and {{{{ subject }}}} placeholders):
{template}

Write the personalized email now. Output JSON only: {{"subject": "...", "body": "..."}}
The body should NOT include a greeting line (e.g. "Hi {first_name},") — that is added automatically.
The body should NOT include a sign-off — that is added automatically.
""".strip()

    # ─────────────────────────────────────────────────────────────────────────
    # LLM call
    # ─────────────────────────────────────────────────────────────────────────

    def _call_llm(self, user_prompt: str, system_prompt: str) -> dict:
        try:
            response = self.client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=600,
                response_format={"type": "json_object"},
            )
            raw = response.choices[0].message.content.strip()
            return json.loads(raw)
        except json.JSONDecodeError as e:
            self.logger.error(f"LLM JSON parse error: {e}")
            return {"subject": "Quick question", "body": "Would love to connect."}
        except Exception as e:
            self.logger.error(f"LLM call failed: {e}")
            return {"subject": "Quick question", "body": "Would love to connect."}

    # ─────────────────────────────────────────────────────────────────────────
    # Optional: lightweight website summarization for personalization
    # ─────────────────────────────────────────────────────────────────────────

    def _light_scrape(self, url: str) -> str:
        """
        Fetch the homepage and extract a short text summary for personalization.
        Returns empty string on any failure — personalization is optional.
        """
        try:
            import requests
            from bs4 import BeautifulSoup

            if not url.startswith("http"):
                url = "https://" + url

            headers = {"User-Agent": "Mozilla/5.0 (compatible; EOABot/1.0)"}
            resp = requests.get(url, headers=headers, timeout=10, verify=False)
            if resp.status_code != 200:
                return ""

            soup = BeautifulSoup(resp.text, "html.parser")

            # Extract meta description first (most informative)
            meta = soup.find("meta", attrs={"name": "description"}) or soup.find(
                "meta", attrs={"property": "og:description"}
            )
            if meta and meta.get("content"):
                return meta["content"][:300]

            # Fall back to first meaningful paragraph
            for p in soup.find_all("p"):
                text = p.get_text(strip=True)
                if len(text) > 60:
                    return text[:300]

            return ""
        except Exception:
            return ""

    # ─────────────────────────────────────────────────────────────────────────

    def _build_sign_off(self, sender_email: str) -> str:
        return "Cheers,\nThe EOA Team"
