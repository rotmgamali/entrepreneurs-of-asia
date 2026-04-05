// Post-event follow-up sequences — one per attendee segment.
// These are the canonical definitions: N8N workflows are built to match.
// Each step's `delayDays` is relative to the event end date (D+0 = same day).

export type SequenceSegment = "new_attendee" | "returning_attendee" | "speaker" | "sponsor";

export type StepAction =
  | "email"
  | "whatsapp_message"
  | "telegram_message"
  | "linkedin_dm"
  | "internal_task";

export interface SequenceStep {
  delayDays: number;
  action: StepAction;
  templateKey: string; // identifies the message template in N8N
  subject?: string;    // for email steps
  notes?: string;      // human context for N8N workflow builder
}

export interface FollowUpSequence {
  segment: SequenceSegment;
  label: string;
  description: string;
  steps: SequenceStep[];
}

export const FOLLOWUP_SEQUENCES: Record<SequenceSegment, FollowUpSequence> = {
  new_attendee: {
    segment: "new_attendee",
    label: "New Attendee",
    description: "First-time attendees — onboard them into the community fully.",
    steps: [
      {
        delayDays: 0,
        action: "email",
        templateKey: "new_attendee_thankyou",
        subject: "Great meeting you at EOA last night 👋",
        notes: "Include WhatsApp + Telegram invite links. Reference their business niche from RSVP form.",
      },
      {
        delayDays: 1,
        action: "email",
        templateKey: "new_attendee_feedback_survey",
        subject: "Quick question about last night",
        notes: "3-question survey: event rating, favourite part, would they bring a friend?",
      },
      {
        delayDays: 2,
        action: "email",
        templateKey: "new_attendee_resource_pack",
        subject: "Resources from Thursday's event",
        notes: "Speaker slides, recommended tools, any links mentioned on stage.",
      },
      {
        delayDays: 5,
        action: "email",
        templateKey: "new_attendee_next_event_invite",
        subject: "You're on the early-access list for next week",
        notes: "RSVP link for next event. Mention that capacity is limited.",
      },
    ],
  },

  returning_attendee: {
    segment: "returning_attendee",
    label: "Returning Attendee",
    description: "Members who have attended before — keep them warm and drive referrals.",
    steps: [
      {
        delayDays: 0,
        action: "email",
        templateKey: "returning_attendee_thankyou",
        subject: "Always good to see you at EOA",
        notes: "Personalise with their attendance count (e.g. 'your 4th event with us').",
      },
      {
        delayDays: 1,
        action: "email",
        templateKey: "returning_attendee_feedback_survey",
        subject: "What did you think of last night?",
        notes: "Shorter survey than new-attendee version — 2 questions max.",
      },
      {
        delayDays: 3,
        action: "email",
        templateKey: "returning_attendee_next_event",
        subject: "Next Thursday — bring someone",
        notes: "Next event invite + referral nudge (personalised invite link if available).",
      },
      {
        delayDays: 7,
        action: "email",
        templateKey: "returning_attendee_digest_optin",
        subject: "Want the monthly EOA digest?",
        notes: "Offer monthly digest — curated insights from the community.",
      },
    ],
  },

  speaker: {
    segment: "speaker",
    label: "Speaker",
    description: "Speakers get content support and a path to repeat speaking.",
    steps: [
      {
        delayDays: 0,
        action: "email",
        templateKey: "speaker_thankyou",
        subject: "Your talk was brilliant — here's the recording",
        notes: "Include raw video link + highlight clip (from Lincoln pipeline). CC their email from partner record.",
      },
      {
        delayDays: 1,
        action: "email",
        templateKey: "speaker_linkedin_repurpose",
        subject: "Pre-written LinkedIn post for you to post",
        notes: "AI-generated LinkedIn post draft based on their talk topic. Ask them to post and tag EOA.",
      },
      {
        delayDays: 3,
        action: "email",
        templateKey: "speaker_testimonial_request",
        subject: "Would you leave us a quick testimonial?",
        notes: "Link to Testimonial.to or Google form. Offer to share it on EOA channels.",
      },
      {
        delayDays: 14,
        action: "internal_task",
        templateKey: "speaker_next_opportunity",
        notes: "Create task in RelationshipMgr inbox: reach out to discuss next speaking slot or referral.",
      },
    ],
  },

  sponsor: {
    segment: "sponsor",
    label: "Sponsor / Partner",
    description: "Sponsors get ROI data fast; renewal conversation is pre-scheduled.",
    steps: [
      {
        delayDays: 0,
        action: "email",
        templateKey: "sponsor_thankyou_metrics",
        subject: "Thank you — here are last night's numbers",
        notes: "Live metrics: RSVP count, actual attendance, % new vs returning, social reach if available.",
      },
      {
        delayDays: 1,
        action: "email",
        templateKey: "sponsor_recap_pdf",
        subject: "Full event recap for your records",
        notes: "PDF recap: event photos, speaker bios, audience breakdown, content deliverables completed.",
      },
      {
        delayDays: 3,
        action: "email",
        templateKey: "sponsor_deliverables_check",
        subject: "Checking in on your content deliverables",
        notes: "Confirm all agreed deliverables (logo placement, social posts, shoutouts) were fulfilled. Ask for any feedback.",
      },
      {
        delayDays: 30,
        action: "internal_task",
        templateKey: "sponsor_renewal_conversation",
        notes: "Create task in RelationshipMgr inbox: initiate renewal / next-event sponsorship conversation.",
      },
    ],
  },
};

// Helper: returns the N8N webhook env var name for a given segment
export function getWebhookEnvKey(segment: SequenceSegment): string {
  const map: Record<SequenceSegment, string> = {
    new_attendee: "N8N_FOLLOWUP_NEW_ATTENDEE_URL",
    returning_attendee: "N8N_FOLLOWUP_RETURNING_ATTENDEE_URL",
    speaker: "N8N_FOLLOWUP_SPEAKER_URL",
    sponsor: "N8N_FOLLOWUP_SPONSOR_URL",
  };
  return map[segment];
}
