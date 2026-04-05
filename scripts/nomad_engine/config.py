"""
Chiang Mai nomad discovery configuration.
Defines search queries, venue categories, nomad profession keywords,
and known CM community groups.
"""
from dataclasses import dataclass, field
from typing import List, Set

# ── Search config ─────────────────────────────────────────────────────────────

@dataclass
class NomadSearchConfig:
    """Config for one discovery pass."""
    # Apify Maps search terms
    map_search_terms: List[str]
    # Subpage paths to crawl on venue websites
    subpage_paths: List[str]
    # Person title keywords relevant to this pass
    title_keywords: List[str]


# Discovery passes — each targets a different type of CM nomad venue/source
DISCOVERY_PASSES = {
    "coworking": NomadSearchConfig(
        map_search_terms=[
            "coworking space Chiang Mai",
            "coworking Chiang Mai",
            "shared workspace Chiang Mai",
            "business lounge Chiang Mai",
        ],
        subpage_paths=["/about", "/contact", "/team", "/community", "/members", "/meet-us", "/events"],
        title_keywords=["founder", "owner", "manager", "community", "director", "ceo"],
    ),
    "nomad_cafe": NomadSearchConfig(
        map_search_terms=[
            "nomad cafe Chiang Mai",
            "laptop friendly cafe Chiang Mai",
            "digital nomad Chiang Mai cafe",
            "wifi cafe Nimman Chiang Mai",
        ],
        subpage_paths=["/about", "/contact", "/team"],
        title_keywords=["founder", "owner", "operator", "manager"],
    ),
    "tech_community": NomadSearchConfig(
        map_search_terms=[
            "startup Chiang Mai",
            "tech hub Chiang Mai",
            "incubator Chiang Mai",
            "accelerator Chiang Mai",
        ],
        subpage_paths=["/about", "/team", "/contact", "/members", "/portfolio"],
        title_keywords=["founder", "ceo", "cto", "partner", "investor", "director", "manager"],
    ),
    "expat_community": NomadSearchConfig(
        map_search_terms=[
            "expat club Chiang Mai",
            "expat network Chiang Mai",
            "international club Chiang Mai",
            "networking event Chiang Mai",
        ],
        subpage_paths=["/about", "/contact", "/team", "/committee"],
        title_keywords=["president", "chairman", "director", "coordinator", "founder", "organizer"],
    ),
}


# ── Nomad profession keywords ─────────────────────────────────────────────────

NOMAD_PROFESSIONS: Set[str] = {
    # Tech
    "developer", "engineer", "programmer", "coder", "devops", "sre", "architect",
    "frontend", "backend", "fullstack", "mobile", "ios", "android", "react", "python",
    # Design
    "designer", "ux", "ui", "graphic", "product designer", "brand",
    # Marketing
    "marketer", "seo", "growth", "content", "copywriter", "ads", "ppc", "email marketing",
    # Business
    "founder", "co-founder", "entrepreneur", "ceo", "cto", "cmo", "coo",
    "consultant", "advisor", "fractional",
    # Creative
    "photographer", "videographer", "creator", "writer", "blogger", "podcaster",
    "youtuber", "influencer",
    # Finance
    "trader", "investor", "analyst", "crypto",
    # Agency / Freelance
    "freelancer", "agency", "coach", "trainer", "recruiter",
    # E-commerce
    "ecommerce", "dropshipper", "amazon fba", "shopify",
}

# CM-specific nomad Facebook groups to cross-reference
CM_NOMAD_GROUPS: Set[str] = {
    "Entrepreneurs of Asia",
    "Digital Nomads Chiang Mai",
    "Chiang Mai Digital Nomads",
    "Nomads in Chiang Mai",
    "Expats in Chiang Mai",
    "Chiang Mai Expats",
    "Chiang Mai Entrepreneurs",
    "Nimman Nomads",
    "Chiang Mai Startups",
    "CM Tech",
}

# Known CM coworking spaces (for cross-matching coworking_spaces field)
CM_COWORKING_SPACES: List[str] = [
    "CAMP",
    "Punspace",
    "Yellow",
    "Mango",
    "ATOM",
    "Hub53",
    "Nook",
    "AIS D-IDEAL",
    "RISTR8TO",
    "Warmup Cafe",
    "Graph Cafe",
    "Wake Up Muang Mai",
    "Think Park",
    "One Nimman",
    "Maya Mall",
]

# Email prefixes to skip (not individual nomads)
GENERIC_EMAIL_PREFIXES: Set[str] = {
    "info", "admin", "office", "contact", "hello", "help", "support",
    "reception", "secretary", "webmaster", "noreply", "no-reply",
    "mail", "general", "inquiries", "inquiry", "booking", "reservations",
    "team", "press", "media", "newsletter", "hr", "jobs", "careers",
}
