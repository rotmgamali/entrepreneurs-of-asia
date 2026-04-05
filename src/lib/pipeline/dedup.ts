/**
 * Deduplication utilities for the Chiang Mai nomad database.
 *
 * Strategy (descending confidence):
 *  1. Exact email match                     → certain duplicate
 *  2. LinkedIn URL match                    → near-certain
 *  3. Twitter handle match                  → near-certain
 *  4. Instagram handle match                → near-certain
 *  5. Normalised full-name + nationality    → probable duplicate
 *  6. Fuzzy name similarity (≥ 0.85)        → possible duplicate, flag for review
 *
 * Usage:
 *   const result = findDuplicates(candidates, existingRecords);
 *   result.exact    → merge automatically
 *   result.probable → human review recommended
 *   result.new      → safe to insert
 */

export interface PartialNomad {
  id?: string;
  full_name: string;
  nationality?: string | null;
  email_primary?: string | null;
  linkedin_url?: string | null;
  twitter_x_handle?: string | null;
  instagram_handle?: string | null;
  facebook_profile_url?: string | null;
  website?: string | null;
  [key: string]: unknown;
}

export type DedupMatchKind =
  | "email"
  | "linkedin"
  | "twitter"
  | "instagram"
  | "name_nationality"
  | "fuzzy_name";

export interface DedupMatch {
  incoming: PartialNomad;
  existing: PartialNomad;
  kind: DedupMatchKind;
  confidence: number; // 0–1
}

export interface DedupResult {
  /** Matches so confident they should be auto-merged */
  exact: DedupMatch[];
  /** Matches that are probable but need human review */
  probable: DedupMatch[];
  /** Records with no match — safe to insert */
  new: PartialNomad[];
}

// ─── Normalisation helpers ────────────────────────────────────────────────────

function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseHandle(handle: string | null | undefined): string {
  if (!handle) return "";
  return handle.replace(/^@/, "").toLowerCase().trim();
}

function normaliseLinkedIn(url: string | null | undefined): string {
  if (!url) return "";
  // Extract the slug from https://www.linkedin.com/in/<slug>/...
  const m = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : url.toLowerCase().trim();
}

function normaliseEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

// ─── Levenshtein similarity ────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function nameSimilarity(a: string, b: string): number {
  const na = normaliseName(a);
  const nb = normaliseName(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

// ─── Core dedup logic ────────────────────────────────────────────────────────

/**
 * Compare a single incoming record against all existing records.
 * Returns the best match found (if any).
 */
export function findBestMatch(
  incoming: PartialNomad,
  existing: PartialNomad[]
): DedupMatch | null {
  let best: DedupMatch | null = null;

  const inEmail = normaliseEmail(incoming.email_primary);
  const inLinkedIn = normaliseLinkedIn(incoming.linkedin_url);
  const inTwitter = normaliseHandle(incoming.twitter_x_handle);
  const inInstagram = normaliseHandle(incoming.instagram_handle);

  for (const ex of existing) {
    // 1. Email match
    if (inEmail && inEmail === normaliseEmail(ex.email_primary)) {
      return { incoming, existing: ex, kind: "email", confidence: 1.0 };
    }

    // 2. LinkedIn match
    if (inLinkedIn && inLinkedIn === normaliseLinkedIn(ex.linkedin_url)) {
      return { incoming, existing: ex, kind: "linkedin", confidence: 0.98 };
    }

    // 3. Twitter match
    if (inTwitter && inTwitter === normaliseHandle(ex.twitter_x_handle)) {
      const candidate: DedupMatch = {
        incoming,
        existing: ex,
        kind: "twitter",
        confidence: 0.95,
      };
      if (!best || candidate.confidence > best.confidence) best = candidate;
    }

    // 4. Instagram match
    if (inInstagram && inInstagram === normaliseHandle(ex.instagram_handle)) {
      const candidate: DedupMatch = {
        incoming,
        existing: ex,
        kind: "instagram",
        confidence: 0.93,
      };
      if (!best || candidate.confidence > best.confidence) best = candidate;
    }

    // 5. Exact name + nationality
    if (
      normaliseName(incoming.full_name) === normaliseName(ex.full_name) &&
      incoming.nationality &&
      ex.nationality &&
      incoming.nationality.toLowerCase() === ex.nationality.toLowerCase()
    ) {
      const candidate: DedupMatch = {
        incoming,
        existing: ex,
        kind: "name_nationality",
        confidence: 0.9,
      };
      if (!best || candidate.confidence > best.confidence) best = candidate;
    }

    // 6. Fuzzy name similarity
    const sim = nameSimilarity(incoming.full_name, ex.full_name);
    if (sim >= 0.85) {
      const candidate: DedupMatch = {
        incoming,
        existing: ex,
        kind: "fuzzy_name",
        confidence: sim * 0.85, // scale down — name alone is weaker
      };
      if (!best || candidate.confidence > best.confidence) best = candidate;
    }
  }

  return best;
}

/**
 * Run deduplication across a batch of incoming records.
 */
export function findDuplicates(
  incoming: PartialNomad[],
  existing: PartialNomad[],
  options: {
    /** Confidence threshold above which we auto-merge (default: 0.90) */
    exactThreshold?: number;
    /** Confidence threshold above which we flag for review (default: 0.70) */
    reviewThreshold?: number;
  } = {}
): DedupResult {
  const { exactThreshold = 0.9, reviewThreshold = 0.7 } = options;

  const exact: DedupMatch[] = [];
  const probable: DedupMatch[] = [];
  const newRecords: PartialNomad[] = [];

  for (const record of incoming) {
    const match = findBestMatch(record, existing);
    if (!match) {
      newRecords.push(record);
    } else if (match.confidence >= exactThreshold) {
      exact.push(match);
    } else if (match.confidence >= reviewThreshold) {
      probable.push(match);
    } else {
      newRecords.push(record);
    }
  }

  return { exact, probable, new: newRecords };
}

// ─── Merge helper ─────────────────────────────────────────────────────────────

/**
 * Merge an incoming partial record onto an existing record.
 * Only fills blank fields by default (safe merge).
 * Pass `force: true` to overwrite existing non-null values.
 */
export function mergeNomadRecords(
  existing: PartialNomad,
  incoming: PartialNomad,
  force = false
): PartialNomad {
  const merged: PartialNomad = { ...existing };

  for (const [key, value] of Object.entries(incoming)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    const current = existing[key];
    const isBlank =
      current === null ||
      current === undefined ||
      current === "" ||
      (Array.isArray(current) && (current as unknown[]).length === 0);
    if (isBlank || force) {
      merged[key] = value;
    }
  }

  return merged;
}
