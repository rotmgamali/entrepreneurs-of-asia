"""
Website crawler for nomad contact extraction.
Ported from Ivybound lead_engine/website_crawler.py.
Adapted: broader title keywords for nomad-relevant roles.
"""
import re
import logging
from typing import List, Dict
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("nomad_engine.crawler")

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')

JUNK_EMAIL_DOMAINS = {
    "wixpress.com", "sentry.io", "example.com", "squarespace.com",
    "wordpress.com", "cloudflare.com", "googleapis.com", "google.com",
    "facebook.com", "twitter.com", "instagram.com", "linkedin.com",
    "w3.org", "schema.org", "jquery.com", "gravatar.com",
    "emailprotected", "yourdomain.com", "domain.com",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}

# Nomad-relevant title keywords (broader than Ivybound B2B titles)
TITLE_KEYWORDS = [
    "founder", "co-founder", "ceo", "cto", "cmo", "coo",
    "owner", "director", "manager", "president", "partner",
    "developer", "designer", "engineer", "marketer", "consultant",
    "freelancer", "coach", "creator", "organizer", "coordinator",
    "head of", "lead", "senior",
]


def extract_contacts(website_url: str, subpage_paths: List[str]) -> Dict:
    """
    Visit a venue website and extract staff/member contacts.
    Returns {"emails": [...], "contacts": [{"name", "title", "email"}]}
    """
    if not website_url:
        return {"emails": [], "contacts": []}

    if not website_url.startswith("http"):
        website_url = "https://" + website_url

    if "google.com" in website_url.lower() or "goo.gl" in website_url.lower():
        return {"emails": [], "contacts": []}

    session = requests.Session()
    session.headers.update(HEADERS)

    all_emails: set = set()
    all_contacts: list = []

    homepage_html = _fetch_page(session, website_url)
    if homepage_html:
        all_emails.update(_extract_emails(homepage_html))
        all_contacts.extend(_extract_staff(homepage_html))

    pages_visited = 0
    for subpath in subpage_paths:
        if pages_visited >= 3:
            break
        subpage_url = urljoin(website_url.rstrip("/") + "/", subpath.lstrip("/"))
        if subpage_url == website_url:
            continue
        html = _fetch_page(session, subpage_url)
        if html:
            all_emails.update(_extract_emails(html))
            all_contacts.extend(_extract_staff(html))
            pages_visited += 1

    if all_emails and all_contacts:
        domain = _get_domain_from_emails(all_emails)
        if domain:
            all_contacts = _infer_emails(all_contacts, all_emails, domain)

    clean_emails = _filter_emails(all_emails)

    seen: set = set()
    unique_contacts = []
    for c in all_contacts:
        key = (c.get("email", "").lower(), c.get("name", "").lower())
        if key not in seen:
            seen.add(key)
            unique_contacts.append(c)

    return {"emails": list(clean_emails), "contacts": unique_contacts}


def _fetch_page(session: requests.Session, url: str) -> str:
    try:
        resp = session.get(url, timeout=10, verify=False, allow_redirects=True)
        if resp.status_code == 200 and "text/html" in resp.headers.get("content-type", ""):
            return resp.text
    except Exception as e:
        logger.debug(f"Failed to fetch {url}: {e}")
    return ""


def _extract_emails(html: str) -> set:
    soup = BeautifulSoup(html, "html.parser")
    emails: set = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("mailto:"):
            email = href.replace("mailto:", "").split("?")[0].strip().lower()
            if EMAIL_REGEX.match(email):
                emails.add(email)
    text = soup.get_text(separator=" ")
    for email in EMAIL_REGEX.findall(text):
        emails.add(email.lower())
    return emails


def _extract_staff(html: str) -> List[Dict]:
    """Extract staff/member names and titles from HTML."""
    contacts = []
    soup = BeautifulSoup(html, "html.parser")

    # Pattern 1: Staff/team listing containers
    staff_containers = soup.find_all(
        ["div", "li", "article", "section"],
        class_=re.compile(r"staff|team|member|person|employee|founder|author|about", re.I)
    )
    for container in staff_containers[:20]:
        name, title = _parse_name_title(container)
        if name:
            email = ""
            for a in container.find_all("a", href=True):
                if a["href"].startswith("mailto:"):
                    email = a["href"].replace("mailto:", "").split("?")[0].strip().lower()
                    break
            contacts.append({"name": name, "title": title, "email": email})

    # Pattern 2: Schema.org Person markup
    for person in soup.find_all(attrs={"itemtype": re.compile(r"schema.org/Person", re.I)}):
        name_el = person.find(attrs={"itemprop": "name"})
        title_el = person.find(attrs={"itemprop": "jobTitle"})
        email_el = person.find(attrs={"itemprop": "email"})
        if name_el:
            contacts.append({
                "name": name_el.get_text(strip=True),
                "title": title_el.get_text(strip=True) if title_el else "",
                "email": email_el.get_text(strip=True).lower() if email_el else "",
            })

    # Pattern 3: Freeform "Name, Title" lines with nomad-relevant titles
    text = soup.get_text(separator="\n")
    for line in text.split("\n"):
        line = line.strip()
        if not line or len(line) > 120 or len(line) < 5:
            continue
        line_lower = line.lower()
        if any(kw in line_lower for kw in TITLE_KEYWORDS):
            match = re.match(r'^([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s+(.+)$', line)
            if match:
                contacts.append({
                    "name": match.group(1).strip(),
                    "title": match.group(2).strip(),
                    "email": "",
                })

    return contacts


def _parse_name_title(container) -> tuple:
    name = ""
    title = ""
    for tag in ["h2", "h3", "h4", "strong", "b"]:
        el = container.find(tag)
        if el:
            text = el.get_text(strip=True)
            if 2 < len(text) < 60 and not any(c.isdigit() for c in text):
                name = text
                break
    title_el = container.find(class_=re.compile(r"title|role|position|designation|job", re.I))
    if title_el:
        title = title_el.get_text(strip=True)
    elif not title:
        for tag in ["p", "span", "div"]:
            el = container.find(tag)
            if el and el.get_text(strip=True) != name:
                candidate = el.get_text(strip=True)
                if len(candidate) < 80:
                    title = candidate
                    break
    return name, title


def _filter_emails(emails: set) -> set:
    clean = set()
    for email in emails:
        if len(email) < 5 or len(email) > 60:
            continue
        domain = email.split("@")[1] if "@" in email else ""
        if domain in JUNK_EMAIL_DOMAINS:
            continue
        if email.endswith((".png", ".jpg", ".css", ".js", ".svg", ".gif")):
            continue
        clean.add(email)
    return clean


def _get_domain_from_emails(emails: set) -> str:
    domains: dict = {}
    for email in emails:
        if "@" in email:
            d = email.split("@")[1]
            if d not in JUNK_EMAIL_DOMAINS:
                domains[d] = domains.get(d, 0) + 1
    return max(domains, key=domains.get) if domains else ""


def _infer_emails(contacts: List[Dict], known_emails: set, domain: str) -> List[Dict]:
    known_by_domain = [e for e in known_emails if e.endswith(f"@{domain}")]
    if not known_by_domain:
        return contacts
    for contact in contacts:
        if contact.get("email"):
            continue
        name = contact.get("name", "")
        parts = name.split()
        if len(parts) < 2:
            continue
        first = parts[0].lower()
        last = parts[-1].lower()
        candidates = [
            f"{first}.{last}@{domain}",
            f"{first[0]}{last}@{domain}",
            f"{first}@{domain}",
        ]
        for candidate in candidates:
            if candidate in known_emails:
                contact["email"] = candidate
                break
        else:
            contact["email"] = candidates[0]
            contact["email_inferred"] = True
    return contacts
