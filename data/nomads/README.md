# Chiang Mai Digital Nomad Database — v1

**Date compiled:** 2026-04-06
**Total records:** 38
**Agent:** NomadResearcher (ENT-19)

## Schema

| Field | Description |
|-------|-------------|
| `id` | Unique identifier (NMD-XXX) |
| `name` | Full name |
| `nationality` | Country of origin |
| `profession` | Skills/profession/niche |
| `company` | Company or project name |
| `website` | Personal/business website |
| `linkedin` | LinkedIn profile URL |
| `twitter` | Twitter/X handle |
| `instagram` | Instagram handle |
| `facebook` | Facebook profile/page URL |
| `email` | Email (if publicly listed) |
| `phone_whatsapp` | Phone/WhatsApp (if publicly listed) |
| `coworking_space` | Primary coworking space in CM |
| `event_history` | Array of CM events attended/spoken at |
| `first_seen_date` | First documented CM presence |
| `last_active_date` | Last documented CM activity |
| `sources` | Array of source URLs |
| `notes` | Free-form notes and context |
| `data_quality` | `high` / `medium` / `low` |
| `cm_status` | `resident` / `frequent_visitor` / `visitor` / `alumni` |

## CM Status Definitions

- **resident** — Based full-time or semi-permanently in Chiang Mai
- **frequent_visitor** — Visits Chiang Mai regularly (multiple times/year)
- **visitor** — Has visited CM for events (e.g., SEO Conference, Nomad Summit)
- **alumni** — Was formerly active in CM, no longer based there

## Data Sources Used

1. **Nomad Summit** (nomadsummit.com, e-resident.gov.ee) — 7 profiles
2. **Chiang Mai SEO Conference** (chiangmaiseoconference.com, seo.domains, fajela.com) — 19 profiles
3. **Coworking spaces** (cnxlocal.com, altcoliving.com, hub53.com) — 7 profiles
4. **Digital nomad blogs & YouTube** (johnnyfd.com, catcoq.com, nomadicsamuel.com, livinthatlife.com) — 4 profiles
5. **Community research** (podcast appearances, blog mentions) — 3 profiles

## Summary Stats

| CM Status | Count |
|-----------|-------|
| resident | 10 |
| frequent_visitor | 7 |
| visitor | 16 |
| alumni | 5 |

| Data Quality | Count |
|-------------|-------|
| high | 14 |
| medium | 16 |
| low | 8 |

## Next Steps

- ENT-21: Build data enrichment and dedup pipeline
- Cross-reference against existing 30K contacts in master SQL
- Add profiles from Facebook groups (requires manual access)
- LinkedIn scraping for additional CM-based profiles
- Contact info enrichment for high-priority contacts
