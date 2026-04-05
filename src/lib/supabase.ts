import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazy singletons — created on first access so the module is safe to import
// during build time when env vars may not be present.
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    _supabase = createClient(url, key);
  }
  return _supabase;
}

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    _supabaseAdmin = createClient(url, key);
  }
  return _supabaseAdmin;
}

// Public client – safe for browser use (respects RLS)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Service-role client – server-side only, bypasses RLS
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ── Types ────────────────────────────────────────────────────

export type ContactStatus = "pending" | "approved" | "rejected";
export type RsvpStatus = "rsvp" | "attended" | "no_show" | "cancelled";

export interface Contact {
  id: string;
  name: string;
  email: string;
  whatsapp?: string;
  bio?: string;
  business_niche?: string;
  website?: string;
  socials?: string;
  skills?: string[];
  status: ContactStatus;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  venue?: string;
  speakers?: string[];
  rsvp_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  contact_id: string;
  rsvp_status: RsvpStatus;
  created_at: string;
}

// ── Outbound leads / DM campaign tracking ────────────────────

export type LeadPlatform = "facebook" | "instagram" | "linkedin" | "twitter" | "whatsapp" | "other";
export type LeadOutreachStatus =
  | "identified" | "dm_sent" | "follow_up_1_sent" | "follow_up_2_sent"
  | "replied" | "positive" | "negative" | "rsvp_submitted" | "approved" | "attended" | "cold";
export type LeadCampaign = "attendee_recruitment" | "speaker_pipeline" | "sponsor_pipeline";

export interface Lead {
  id: string;
  name: string;
  platform: LeadPlatform;
  profile_url: string | null;
  business_niche: string | null;
  location: string | null;
  outreach_status: LeadOutreachStatus;
  dm_sent_at: string | null;
  follow_up_1_at: string | null;
  follow_up_2_at: string | null;
  last_reply_at: string | null;
  message_body: string | null;
  notes: string | null;
  source: string;
  campaign: LeadCampaign;
  event_id: string | null;
  contact_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── Nomad profile types ───────────────────────────────────────

export type EnrichmentStatus = "raw" | "partial" | "enriched" | "verified";
export type StayPattern = "permanent" | "long-term" | "seasonal" | "transient";
export type CommunityRole = "organizer" | "speaker" | "regular" | "occasional" | "lurker";
export type NomadOutreachStatus = "not_contacted" | "contacted" | "responded" | "member" | "inactive";

export interface NomadProfile {
  id: string;
  contact_id: string | null;
  slug: string | null;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  nationality: string | null;
  languages: string[];
  profession: string | null;
  skills: string[];
  company_name: string | null;
  company_url: string | null;
  current_projects: string | null;
  email_primary: string | null;
  email_secondary: string | null;
  phone_whatsapp: string | null;
  website: string | null;
  linkedin_url: string | null;
  twitter_x_handle: string | null;
  instagram_handle: string | null;
  facebook_profile_url: string | null;
  youtube_channel_url: string | null;
  tiktok_handle: string | null;
  github_url: string | null;
  coworking_spaces: string[];
  neighborhoods: string[];
  stay_pattern: StayPattern | null;
  cm_first_seen_date: string | null;
  cm_last_active_date: string | null;
  event_history: Array<{ event_id: string; event_name: string; date: string; role: string }>;
  facebook_groups: string[];
  community_role: CommunityRole | null;
  crm_contact_id: string | null;
  outreach_status: NomadOutreachStatus;
  relationship_strength: number;
  data_sources: Record<string, unknown>;
  enrichment_status: EnrichmentStatus;
  confidence_score: number;
  verified_at: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CmEventCategory = "networking" | "workshop" | "social" | "coworking" | "conference" | "other";
export type CmEventFrequency = "one-off" | "weekly" | "bi-weekly" | "monthly" | "quarterly" | "other";

export interface CmEvent {
  id: string;
  name: string;
  organizer_name: string | null;
  organizer_id: string | null;
  category: CmEventCategory | null;
  frequency: CmEventFrequency | null;
  venue: string | null;
  typical_size: number | null;
  cost_thb: number;
  facebook_url: string | null;
  meetup_url: string | null;
  eventbrite_url: string | null;
  luma_url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Relationship tracking types ───────────────────────────────

export type PartnerType = "sponsor" | "venue" | "speaker" | "collaborator";
export type PartnerStatus = "active" | "warm" | "cold" | "inactive";
export type TouchpointType = "email" | "call" | "meeting" | "event" | "message";
export type CommitmentStatus = "pending" | "delivered" | "overdue" | "cancelled";

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: PartnerStatus;
  notes: string | null;
  renewal_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Touchpoint {
  id: string;
  partner_id: string;
  type: TouchpointType;
  summary: string;
  occurred_at: string;
  created_by: string | null;
  created_at: string;
}

export interface Commitment {
  id: string;
  partner_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: CommitmentStatus;
  deliverable_url: string | null;
  created_at: string;
  updated_at: string;
}
