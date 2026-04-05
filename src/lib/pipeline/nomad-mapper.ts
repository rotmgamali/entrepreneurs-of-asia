/**
 * Maps raw research records (cm_nomads_v1.json schema) to NomadProfile shape
 * for upsert into the Supabase `nomad_profiles` table.
 */

import type { NomadProfile } from "@/lib/supabase";

interface RawNomad {
  id: string;
  name: string;
  nationality?: string | null;
  profession?: string | null;
  company?: string | null;
  website?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  email?: string | null;
  phone_whatsapp?: string | null;
  coworking_space?: string | null;
  event_history?: string[];
  first_seen_date?: string | null;
  last_active_date?: string | null;
  sources?: string[];
  notes?: string | null;
  data_quality?: "high" | "medium" | "low";
  cm_status?: "resident" | "frequent_visitor" | "visitor" | "alumni";
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .trim();
}

function normaliseLinkedIn(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return `https://www.linkedin.com/in/${raw.replace(/^@/, "")}`;
}

function normaliseTwitter(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw.startsWith("@") ? raw : `@${raw}`;
}

function normaliseInstagram(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw.startsWith("@") ? raw : `@${raw}`;
}

function cmStatusToStayPattern(
  status: RawNomad["cm_status"]
): NomadProfile["stay_pattern"] {
  switch (status) {
    case "resident":
      return "permanent";
    case "frequent_visitor":
      return "seasonal";
    case "visitor":
      return "transient";
    case "alumni":
      return "transient";
    default:
      return null;
  }
}

function eventHistoryToStructured(
  events: string[]
): NomadProfile["event_history"] {
  return events.map((e) => ({
    event_id: "",
    event_name: e,
    date: "",
    role: e.toLowerCase().includes("organizer")
      ? "organizer"
      : e.toLowerCase().includes("speaker")
        ? "speaker"
        : "attendee",
  }));
}

function confidenceFromQuality(
  quality: RawNomad["data_quality"]
): number {
  switch (quality) {
    case "high":
      return 0.85;
    case "medium":
      return 0.6;
    case "low":
      return 0.35;
    default:
      return 0.5;
  }
}

export function mapRawToNomadProfile(
  raw: RawNomad
): Omit<NomadProfile, "id" | "created_at" | "updated_at"> {
  const [firstName, ...rest] = raw.name.split(" ");
  const lastName = rest.join(" ") || null;

  return {
    contact_id: null,
    slug: slugify(raw.name),
    full_name: raw.name,
    first_name: firstName ?? null,
    last_name: lastName,
    nationality: raw.nationality ?? null,
    languages: [],
    profession: raw.profession ?? null,
    skills: raw.profession
      ? raw.profession
          .split(",")
          .map((s) => s.trim())
          .slice(0, 5)
      : [],
    company_name: raw.company ?? null,
    company_url: null,
    current_projects: null,
    email_primary: raw.email ?? null,
    email_secondary: null,
    phone_whatsapp: raw.phone_whatsapp ?? null,
    website: raw.website ?? null,
    linkedin_url: normaliseLinkedIn(raw.linkedin),
    twitter_x_handle: normaliseTwitter(raw.twitter),
    instagram_handle: normaliseInstagram(raw.instagram),
    facebook_profile_url: raw.facebook ?? null,
    youtube_channel_url: null,
    tiktok_handle: null,
    github_url: null,
    coworking_spaces: raw.coworking_space ? [raw.coworking_space] : [],
    neighborhoods: [],
    stay_pattern: cmStatusToStayPattern(raw.cm_status),
    cm_first_seen_date: raw.first_seen_date ?? null,
    cm_last_active_date: raw.last_active_date ?? null,
    event_history: eventHistoryToStructured(raw.event_history ?? []),
    facebook_groups: [],
    community_role: (() => {
      if (raw.event_history?.some((e) => e.toLowerCase().includes("organizer")))
        return "organizer";
      if (raw.event_history?.some((e) => e.toLowerCase().includes("speaker")))
        return "speaker";
      if (raw.event_history && raw.event_history.length > 0) return "regular";
      return null;
    })(),
    crm_contact_id: null,
    outreach_status: "not_contacted",
    relationship_strength: 0,
    data_sources: {
      sources: raw.sources ?? [],
      imported_from: "cm_nomads_v1.json",
      raw_id: raw.id,
    },
    enrichment_status: raw.data_quality === "high" ? "partial" : "raw",
    confidence_score: confidenceFromQuality(raw.data_quality),
    verified_at: null,
    tags: [raw.cm_status ?? "unknown", raw.data_quality ?? "unknown"].filter(
      Boolean
    ),
    notes: raw.notes ?? null,
  };
}
