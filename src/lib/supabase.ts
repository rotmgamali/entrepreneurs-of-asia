import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Public client – safe for browser use (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service-role client – server-side only, bypasses RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
