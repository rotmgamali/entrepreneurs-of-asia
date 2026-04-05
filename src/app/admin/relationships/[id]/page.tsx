export const dynamic = "force-dynamic";

import { SHEET, findRowBy, getRows } from "@/lib/sheets";
import type { Partner, Touchpoint, Commitment } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";

const TOUCHPOINT_ICONS: Record<string, string> = {
  email: "✉",
  call: "📞",
  meeting: "🤝",
  event: "🎪",
  message: "💬",
};

const COMMITMENT_STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400",
  delivered: "text-emerald-400",
  overdue: "text-red-400",
  cancelled: "text-gray-500",
};

type Params = { params: Promise<{ id: string }> };

export default async function PartnerDetailPage({ params }: Params) {
  const { id } = await params;

  const [partnerRes, allTouchpoints, allCommitments] = await Promise.all([
    findRowBy(SHEET.partners, "id", id),
    getRows(SHEET.touchpoints),
    getRows(SHEET.commitments),
  ]);

  if (!partnerRes) notFound();

  const partner: Partner = {
    id: partnerRes.row.id,
    name: partnerRes.row.name,
    type: partnerRes.row.type as Partner["type"],
    company: partnerRes.row.company || null,
    email: partnerRes.row.email || null,
    phone: partnerRes.row.phone || null,
    status: partnerRes.row.status as Partner["status"],
    notes: partnerRes.row.notes || null,
    renewal_date: partnerRes.row.renewal_date || null,
    created_at: partnerRes.row.created_at,
    updated_at: partnerRes.row.updated_at,
  };

  const touchpoints: Touchpoint[] = allTouchpoints
    .filter(({ row }) => row.partner_id === id)
    .sort((a, b) => b.row.occurred_at.localeCompare(a.row.occurred_at))
    .map(({ row }) => ({
      id: row.id,
      partner_id: row.partner_id,
      type: row.type as Touchpoint["type"],
      summary: row.summary,
      occurred_at: row.occurred_at,
      created_by: row.created_by || null,
      created_at: row.created_at,
    }));

  const commitments: Commitment[] = allCommitments
    .filter(({ row }) => row.partner_id === id)
    .sort((a, b) => (a.row.due_date || "").localeCompare(b.row.due_date || ""))
    .map(({ row }) => ({
      id: row.id,
      partner_id: row.partner_id,
      title: row.title,
      description: row.description || null,
      due_date: row.due_date || null,
      status: row.status as Commitment["status"],
      deliverable_url: row.deliverable_url || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <Link
        href="/admin/relationships"
        className="text-gray-400 hover:text-white text-sm mb-6 inline-block"
      >
        ← Back to Relationships
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{partner.name}</h1>
            {partner.company && (
              <p className="text-gray-400 mt-1">{partner.company}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 capitalize bg-surface border border-border px-3 py-1 rounded-full">
              {partner.type}
            </span>
            <span className="text-sm capitalize px-3 py-1 rounded-full border border-border text-white">
              {partner.status}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          {partner.email && (
            <div>
              <span className="text-gray-500">Email</span>
              <p className="text-gray-200">{partner.email}</p>
            </div>
          )}
          {partner.phone && (
            <div>
              <span className="text-gray-500">Phone</span>
              <p className="text-gray-200">{partner.phone}</p>
            </div>
          )}
          {partner.renewal_date && (
            <div>
              <span className="text-gray-500">Renewal</span>
              <p className="text-gray-200">
                {new Date(partner.renewal_date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
        </div>

        {partner.notes && (
          <div className="mt-4 p-4 bg-surface border border-border rounded-xl">
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{partner.notes}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Touchpoints */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            Touchpoints
            <span className="ml-2 text-sm text-gray-500">({touchpoints.length})</span>
          </h2>
          {touchpoints.length === 0 ? (
            <p className="text-sm text-gray-600 italic">No touchpoints logged yet.</p>
          ) : (
            <ol className="relative border-l border-border space-y-4 pl-6">
              {touchpoints.map((tp) => (
                <li key={tp.id} className="relative">
                  <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-surface border border-border text-xs">
                    {TOUCHPOINT_ICONS[tp.type] ?? "·"}
                  </span>
                  <p className="text-sm text-white font-medium">{tp.summary}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(tp.occurred_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {tp.created_by && ` · ${tp.created_by}`}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Commitments */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            Commitments
            <span className="ml-2 text-sm text-gray-500">({commitments.length})</span>
          </h2>
          {commitments.length === 0 ? (
            <p className="text-sm text-gray-600 italic">No commitments tracked yet.</p>
          ) : (
            <ul className="space-y-3">
              {commitments.map((c) => (
                <li
                  key={c.id}
                  className="bg-surface border border-border rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-white font-medium">{c.title}</p>
                    <span className={`text-xs capitalize ${COMMITMENT_STATUS_COLORS[c.status]}`}>
                      {c.status}
                    </span>
                  </div>
                  {c.description && (
                    <p className="text-xs text-gray-400 mt-1">{c.description}</p>
                  )}
                  {c.due_date && (
                    <p className="text-xs text-gray-500 mt-1">
                      Due:{" "}
                      {new Date(c.due_date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  )}
                  {c.deliverable_url && (
                    <a
                      href={c.deliverable_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      View deliverable →
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
