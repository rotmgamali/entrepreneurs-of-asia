"""
Email verification without external APIs.
Ported from Ivybound lead_engine/email_verifier.py — no changes to core logic.
Tier 1: Regex syntax | Tier 2: DNS MX | Tier 3: Catch-all | Tier 4: Disposable
"""
import re
import random
import smtplib
import logging
from dataclasses import dataclass
from typing import Dict, Tuple

import dns.resolver
import dns.exception

logger = logging.getLogger("nomad_engine.verifier")

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

DISPOSABLE_DOMAINS = {
    "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
    "yopmail.com", "sharklasers.com", "dispostable.com", "mailnesia.com",
    "maildrop.cc", "discard.email", "trashmail.com", "trashmail.me",
    "temp-mail.org", "10minutemail.com", "emailondeck.com", "mailsac.com",
    "getnada.com", "fakeinbox.com", "spam4.me", "getairmail.com",
}


@dataclass
class VerificationResult:
    email: str
    status: str       # verified, invalid, catch_all, disposable, unknown
    mx_host: str
    is_catch_all: bool
    reason: str


class EmailVerifier:
    """DNS-based email verifier with per-domain caching."""

    def __init__(self):
        self._domain_cache: Dict[str, dict] = {}

    def verify(self, email: str) -> VerificationResult:
        email = email.strip().lower()

        if not EMAIL_REGEX.match(email):
            return VerificationResult(email, "invalid", "", False, "Syntax check failed")

        domain = email.split("@")[1]

        if domain in DISPOSABLE_DOMAINS:
            return VerificationResult(email, "disposable", "", False, f"Disposable: {domain}")

        if domain not in self._domain_cache:
            has_mx, mx_host = self._check_mx(domain)
            is_catch_all = self._detect_catch_all(mx_host, domain) if has_mx and mx_host else False
            self._domain_cache[domain] = {
                "has_mx": has_mx, "mx_host": mx_host, "is_catch_all": is_catch_all
            }

        cached = self._domain_cache[domain]

        if not cached["has_mx"]:
            return VerificationResult(email, "invalid", "", False, f"No MX/A for {domain}")

        if cached["is_catch_all"]:
            return VerificationResult(
                email, "catch_all", cached["mx_host"], True,
                f"{domain} is catch-all"
            )

        return VerificationResult(
            email, "verified", cached["mx_host"], False,
            f"MX verified: {cached['mx_host']}"
        )

    def _check_mx(self, domain: str) -> Tuple[bool, str]:
        try:
            records = dns.resolver.resolve(domain, 'MX')
            if records:
                return True, str(records[0].exchange).rstrip('.')
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN):
            try:
                dns.resolver.resolve(domain, 'A')
                return True, ""
            except Exception:
                return False, ""
        except Exception as e:
            logger.debug(f"DNS error for {domain}: {e}")
        return False, ""

    def _detect_catch_all(self, mx_host: str, domain: str) -> bool:
        if not mx_host:
            return False
        fake_email = f"xyztest{random.randint(10000, 99999)}@{domain}"
        try:
            server = smtplib.SMTP(timeout=5)
            server.connect(mx_host)
            server.helo("verify.local")
            server.mail("test@verify.local")
            code, _ = server.rcpt(fake_email)
            server.quit()
            return code == 250
        except Exception:
            return False

    def verify_batch(self, emails: list) -> list:
        return [self.verify(email) for email in emails]
