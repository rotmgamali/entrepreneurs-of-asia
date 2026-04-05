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
