# CM Founders — Outreach Campaign Templates

Three campaign files for integration with N8N and the existing email/CRM system.

## Files

| File | Campaign | Channels | Steps |
|------|----------|----------|-------|
| `speaker-campaign.json` | Speaker recruitment | LinkedIn DM, Email | 3 sequences (cold, warm, confirmation) |
| `sponsor-campaign.json` | Sponsor acquisition | Email, LinkedIn DM | 3 sequences + 3 package tiers |
| `venue-campaign.json` | Venue partnership | Email | 3 sequences (bar/restaurant, coworking, onboarding) |

## How to Use

### Personalization Variables
Each template uses `{{variable_name}}` placeholders. Map these to columns in your master SQL contacts database before sending:

- `{{first_name}}` — contact first name
- `{{business_niche}}` / `{{business_type}}` — from CRM field
- `{{company_name}}` / `{{venue_name}}` — organization
- `{{their_target_customer}}` — for sponsor targeting
- `{{mutual_connection}}` — optional, boosts reply rate significantly

### N8N Integration
1. Create a new N8N workflow for each sequence
2. Trigger: new contact tagged with `speaker-target`, `sponsor-target`, or `venue-target` in CRM
3. Use the JSON steps to configure email/DM nodes
4. Set day offsets as wait nodes between steps
5. Add a "replied" detection branch to stop sequence on response

### Dynamic Variables to Fill Before Each Send
- `[NEXT_THURSDAY_DATE]` — upcoming event date
- `[LAST_WEEK_ATTENDEE_COUNT]` — from event attendance log
- `[RSVP_COUNT]` — from RSVP form data
- `[VENUE_ADDRESS]` — revealed day-of to confirmed attendees
- `[PAYMENT_LINK]` — sponsor payment link
- `[DATE]` — specific event or start date

## Targeting Notes

**Speaker targets:** Filter nomad database for contacts with:
- Verified website + active social presence
- Business niche with teachable expertise
- Revenue tier: $10K+/month preferred
- In CM now or regularly (use location field)

**Sponsor targets:**
- Coworking spaces: all CM coworking spaces with event capacity
- SaaS tools: tools used by founders (Notion, Stripe, Shopify, etc.) — approach regional/APAC teams
- Services: legal, banking, insurance, health for expats

**Venue targets:**
- Nimman-area bars, restaurants, rooftop venues with capacity 40-60+
- Coworking spaces with after-hours event space
- Private clubs or members spaces
