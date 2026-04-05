/**
 * POST /api/pipeline/nomads/import
 *
 * Batch-imports nomad records into the Nomads sheet.
 * Deduplication is run first — exact matches are merged, probable matches are
 * flagged for review, new records are inserted.
 *
 * Auth: X-Admin-Secret header required.
 *
 * Body: { records: RawNomad[], force?: boolean, dryRun?: boolean }
 */

import { type NextRequest } from "next/server";
import { SHEET, getRows, appendRow, updateRow } from "@/lib/sheets";
import { findDuplicates, mergeNomadRecords } from "@/lib/pipeline/dedup";
import { mapRawToNomadProfile } from "@/lib/pipeline/nomad-mapper";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const records: unknown[] = body.records ?? [];
  const force: boolean = body.force ?? false;
  const dryRun: boolean = body.dryRun ?? false;

  if (!Array.isArray(records) || records.length === 0) {
    return Response.json({ error: "records array is required" }, { status: 400 });
  }

  const mapped = records.map((r) =>
    mapRawToNomadProfile(r as Parameters<typeof mapRawToNomadProfile>[0])
  );

  // Fetch existing profiles for dedup comparison
  const existingRows = await getRows(SHEET.nomads);
  const existing = existingRows.map(({ row }) => ({
    id: row.id,
    full_name: row.full_name,
    nationality: row.nationality,
    email_primary: row.email_primary,
    linkedin_url: row.linkedin_url,
    twitter_x_handle: row.twitter_x_handle,
    instagram_handle: row.instagram_handle,
  }));

  const dedupResult = findDuplicates(
    mapped as Parameters<typeof findDuplicates>[0],
    existing as Parameters<typeof findDuplicates>[1]
  );

  const results = {
    inserted: 0,
    merged: 0,
    flagged: dedupResult.probable.length,
    skipped: 0,
    errors: [] as string[],
    dryRun,
    flaggedItems: dedupResult.probable.map((m) => ({
      incoming: m.incoming.full_name,
      existingId: m.existing.id,
      existingName: m.existing.full_name,
      matchKind: m.kind,
      confidence: m.confidence,
    })),
  };

  if (dryRun) {
    return Response.json({
      ...results,
      newCount: dedupResult.new.length,
      exactCount: dedupResult.exact.length,
    });
  }

  // Insert new records
  for (const record of dedupResult.new) {
    try {
      const r = record as Record<string, unknown>;
      await appendRow(SHEET.nomads, {
        ...r,
        languages:        JSON.stringify(r.languages       ?? []),
        skills:           JSON.stringify(r.skills          ?? []),
        coworking_spaces: JSON.stringify(r.coworking_spaces ?? []),
        neighborhoods:    JSON.stringify(r.neighborhoods    ?? []),
        event_history:    JSON.stringify(r.event_history    ?? []),
        facebook_groups:  JSON.stringify(r.facebook_groups  ?? []),
        data_sources:     JSON.stringify(r.data_sources     ?? {}),
        tags:             JSON.stringify(r.tags             ?? []),
        relationship_strength: String(r.relationship_strength ?? 0),
        confidence_score: String(r.confidence_score ?? 0),
      });
      results.inserted++;
    } catch (err) {
      results.errors.push(`Insert failed for ${(record as { full_name?: string }).full_name}: ${String(err)}`);
    }
  }

  // Merge exact duplicates
  for (const match of dedupResult.exact) {
    try {
      const merged = mergeNomadRecords(match.existing, match.incoming, force);
      const existingRow = existingRows.find(({ row }) => row.id === match.existing.id);
      if (existingRow) {
        const m = merged as Record<string, unknown>;
        await updateRow(SHEET.nomads, existingRow.rowIndex, {
          ...m,
          languages:        JSON.stringify(m.languages       ?? []),
          skills:           JSON.stringify(m.skills          ?? []),
          coworking_spaces: JSON.stringify(m.coworking_spaces ?? []),
          neighborhoods:    JSON.stringify(m.neighborhoods    ?? []),
          event_history:    JSON.stringify(m.event_history    ?? []),
          facebook_groups:  JSON.stringify(m.facebook_groups  ?? []),
          data_sources:     JSON.stringify(m.data_sources     ?? {}),
          tags:             JSON.stringify(m.tags             ?? []),
          relationship_strength: String(m.relationship_strength ?? 0),
          confidence_score: String(m.confidence_score ?? 0),
        });
        results.merged++;
      }
    } catch (err) {
      results.errors.push(`Merge failed for ${match.incoming.full_name}: ${String(err)}`);
    }
  }

  return Response.json(results);
}
