"""
EOA Outreach Engine — Configuration
Adapted from Ivybound mailreef_automation/automation_config.py
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

ROOT_DIR = Path(__file__).resolve().parent.parent  # outreach/

# ─────────────────────────────────────────────────────────────────────────────
# Campaign Profiles
# ─────────────────────────────────────────────────────────────────────────────

# EOA archetype keyword map — used by EmailGenerator to select the right template folder
EOA_ARCHETYPES = {
    "founder": [
        "founder", "co-founder", "cofounder", "ceo", "chief executive",
        "entrepreneur", "owner", "director", "managing director",
    ],
    "agency_owner": [
        "agency", "studio", "marketing", "advertising", "creative director",
        "consulting", "services", "growth",
    ],
    "freelancer": [
        "freelancer", "freelance", "independent", "contractor",
        "consultant", "self-employed",
    ],
    "developer": [
        "developer", "engineer", "programmer", "cto", "chief technology",
        "tech lead", "software", "backend", "frontend", "full stack",
        "devops", "data scientist",
    ],
    "content_creator": [
        "creator", "influencer", "blogger", "podcaster", "writer",
        "youtuber", "videographer", "content", "author",
    ],
}

CAMPAIGN_PROFILES = {
    "EOA_EVENT_INVITE": {
        "campaign_type": "event_invite",
        "templates_dir": str(ROOT_DIR / "templates"),
        "log_file": str(ROOT_DIR / "logs" / "event_invite.log"),
        "input_sheet": "EOA Event Invite Outreach",
        "replies_sheet": "EOA Event Invite Replies",
        "archetypes": EOA_ARCHETYPES,
        "sequence_length": 3,
    },
    "EOA_SPEAKER_RECRUITMENT": {
        "campaign_type": "speaker_recruitment",
        "templates_dir": str(ROOT_DIR / "templates"),
        "log_file": str(ROOT_DIR / "logs" / "speaker_recruitment.log"),
        "input_sheet": "EOA Speaker Recruitment",
        "replies_sheet": "EOA Speaker Replies",
        "archetypes": EOA_ARCHETYPES,
        "sequence_length": 3,
    },
    "EOA_SPONSOR_PITCH": {
        "campaign_type": "sponsor_pitch",
        "templates_dir": str(ROOT_DIR / "templates"),
        "log_file": str(ROOT_DIR / "logs" / "sponsor_pitch.log"),
        "input_sheet": "EOA Sponsor Outreach",
        "replies_sheet": "EOA Sponsor Replies",
        "archetypes": {},  # sponsor pitches fall back to 'general'
        "sequence_length": 3,
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# Gmail accounts (inbox rotation)
# Add more accounts as {"email": ..., "password": ..., "display_name": ...,
# "daily_limit": 100} to scale sending volume.
# ─────────────────────────────────────────────────────────────────────────────

GMAIL_ACCOUNTS = [
    {
        "email": os.getenv("GMAIL_USER", ""),
        "password": os.getenv("GMAIL_APP_PASSWORD", ""),
        "display_name": os.getenv("EMAIL_FROM_NAME", "Entrepreneurs of Asia"),
        "daily_limit": int(os.getenv("GMAIL_DAILY_LIMIT", "100")),
    },
    # Uncomment and add more sending accounts here:
    # {
    #     "email": os.getenv("GMAIL_USER_2", ""),
    #     "password": os.getenv("GMAIL_APP_PASSWORD_2", ""),
    #     "display_name": "CM Founders",
    #     "daily_limit": 100,
    # },
]

# ─────────────────────────────────────────────────────────────────────────────
# Scheduling — Asia/Bangkok timezone (Chiang Mai)
# ─────────────────────────────────────────────────────────────────────────────

TIMEZONE = "Asia/Bangkok"

# Morning window, afternoon window, evening window
BUSINESS_DAY_WINDOWS = [
    {"start": 9,  "end": 11, "emails_per_inbox": 5},
    {"start": 14, "end": 16, "emails_per_inbox": 5},
    {"start": 19, "end": 21, "emails_per_inbox": 3},
]

WEEKEND_DAY_WINDOWS = [
    {"start": 10, "end": 12, "emails_per_inbox": 3},
]

INBOXES_PER_DAY_BUSINESS = 1
EMAILS_PER_INBOX_DAY_BUSINESS = 13   # ~40 sends/day
INBOXES_PER_DAY_WEEKEND = 1
EMAILS_PER_INBOX_DAY_WEEKEND = 6
MAX_DAILY_SENDS_PER_INBOX = 50

# Days between sequence stages per campaign type
FOLLOWUP_DELAYS = {
    "event_invite":        [0, 4, 8],
    "speaker_recruitment": [0, 3, 7],
    "sponsor_pitch":       [0, 5, 12],
}

# ─────────────────────────────────────────────────────────────────────────────
# OpenAI
# ─────────────────────────────────────────────────────────────────────────────

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# ─────────────────────────────────────────────────────────────────────────────
# EOA Event Context (injected into all templates)
# ─────────────────────────────────────────────────────────────────────────────

EVENT_NAME = "CM Founders"
EVENT_FULL_NAME = "Entrepreneurs of Asia — CM Founders"
EVENT_DAY = "Thursday"
EVENT_TIME = "6:30 PM"
EVENT_LOCATION = "Nimman, Chiang Mai"
EVENT_APPROX_CAPACITY = "40"
RSVP_URL = os.getenv("EOA_RSVP_URL", "https://eoa.community/rsvp")

# ─────────────────────────────────────────────────────────────────────────────
# CAN-SPAM Compliance
# ─────────────────────────────────────────────────────────────────────────────

PHYSICAL_ADDRESS = "Entrepreneurs of Asia, Nimman, Chiang Mai 50200, Thailand"
UNSUBSCRIBE_MAILTO = os.getenv("EOA_UNSUBSCRIBE_EMAIL", "unsubscribe@eoa.community")

# ─────────────────────────────────────────────────────────────────────────────
# Google Sheets
# ─────────────────────────────────────────────────────────────────────────────

SUPPRESSION_SHEET_NAME = "EOA Email Suppression"
