# EOA DM Campaign — Launch Runbook
**Campaign:** Event Attendee Recruitment
**Goal:** 10+ confirmed RSVPs/week from DM channel within 2 weeks
**Daily target:** 20–30 DMs/day across all platforms
**Tracking file:** `outreach/dm-campaign-queue.csv`

---

## Daily Execution (30–45 min/day)

### Step 1 — Open the queue (5 min)
Open `outreach/dm-campaign-queue.csv`. Sort by `priority` (1 = resident, 2 = frequent visitor, 3 = visitor).
Work top to bottom. Skip anyone already marked `dm_sent` or beyond.

### Step 2 — Send DMs by platform (25–35 min)

#### LinkedIn (priority platform — best quality leads)
1. Open their `profile_url`
2. Click "Connect" — paste `message_step1` as the connection note (300 char limit)
3. Once connected (usually same day or next day), send `message_step2_after_connect`
4. Mark `outreach_status` → `dm_sent`, fill in `dm_sent_at` date
5. **Daily cap:** 15–20 LinkedIn connections/day (avoid spam flags)

#### Facebook
1. Open their `profile_url`
2. Click "Message"
3. Paste `message_step1` — personalize `[shared group name]` if you know which CM group they're from
4. Mark `outreach_status` → `dm_sent`, fill in `dm_sent_at` date
5. **Daily cap:** 10–15 FB DMs/day (avoid restriction)

#### Instagram (supplement only)
- Use for contacts who are active on IG but not LinkedIn/FB
- Post a comment on a recent post first, then DM 24h later — higher acceptance rate
- **Daily cap:** 5–10 DMs/day

---

## Follow-up Schedule

The N8N workflow (`automations/n8n/dm-campaign-followup.json`) handles FB/IG follow-ups automatically.
**LinkedIn requires manual follow-up** (LinkedIn blocks API DMs).

| Day | Action |
|-----|--------|
| Day 0 | Initial DM sent → mark `dm_sent` |
| Day 3 | Follow-up 1: "Just following up — room was great last Thursday" |
| Day 7 | Follow-up 2: "Last nudge — grab a spot or stay in touch" |
| Day 10 | Mark `cold` if no reply |

**Follow-up message (Day 3):**
> Hey [First Name] — just following up on the event invite. We had a great room last Thursday.
>
> If you're in CM and want in, grab a spot here: [RSVP_URL]
>
> Or I can just add you to the WhatsApp group directly.

**Follow-up message (Day 7):**
> Hey [First Name] — last nudge on this! If the timing works, we'd love to have you at CM Founders on Thursday.
>
> Grab a spot: [RSVP_URL]
>
> If not, no worries — happy to stay in touch regardless.

---

## Handling Replies

| Reply type | Action |
|-----------|--------|
| "Yes, interested" | Mark `positive` → send RSVP link + WhatsApp invite |
| "What is it exactly?" | Send 2-sentence description + RSVP link |
| "Not in CM right now" | Mark `negative` → note their return date if they share it |
| "Not interested" | Mark `negative` |
| No reply after Day 7 | Mark `cold` |

---

## Expanding Beyond the Research Database

Once you've worked through the 28 contacts in `dm-campaign-queue.csv`, source new leads from:

1. **Facebook Groups** (target 10–15/day):
   - "Digital Nomads Chiang Mai" — search recent active members
   - "Chiang Mai Expats" — filter for business owners
   - "Entrepreneurs in Thailand"

2. **LinkedIn search** (target 10–15/day):
   - Search: "Chiang Mai" + title contains "founder OR CEO OR consultant"
   - Filter: 2nd connections, active in last 30 days

3. **Instagram hashtags** (target 5–10/day):
   - `#chiangmainomad` `#chiangmaifounder` `#nomadthailand`
   - Look for recent posts (last 7 days) with CM geotags

For each new lead, add a row to `dm-campaign-queue.csv` before messaging.

---

## Variables to Swap Before Sending

| Placeholder | Replace with |
|-------------|-------------|
| `[RSVP_URL]` | Your live RSVP form URL |
| `[shared group name]` | The specific FB group where you found them |
| `[COUNT]` | Last week's attendee count |

---

## Weekly Reporting

Every Friday, pull stats from the CSV:
- Total DMs sent (count `dm_sent` + beyond)
- Reply rate (count `replied` + `positive` / total sent)
- RSVP conversions (count `rsvp_submitted` + `approved`)
- Platform breakdown

Target: 15–25% reply rate, 5–10% RSVP conversion from DMs.
