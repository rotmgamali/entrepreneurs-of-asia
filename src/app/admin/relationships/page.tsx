export const dynamic = "force-dynamic";

import { supabaseAdmin, type Partner } from "@/lib/supabase";
import Link from "next/link";

const TYPE_LABELS: Record<string, string> = {
  sponsor: "Sponsor",
  venue: "Venue",
  speaker: "Speaker",
  collaborator: "Collaborator",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-400/10",
  warm: "text-yellow-400 bg-yellow-400/10",
  cold: "text-blue-400 bg-blue-400/10",
  inactive: "text-gray-500 bg-gray-500/10",
};

function daysUntilRenewal(renewalDate: string | null): number | null {
  if (!renewalDate) return null;
  const diff = new Date(renewalDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default async function RelationshipsPage() {
  const { data: partners, error } = await supabaseAdmin
    .from("partners")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return (
      <div className="p-8 text-red-400">
        Failed to load partners: {error.message}
      </div>
    );
  }

  const byType = (type: string) =>
    (partners ?? []).filter((p: Partner) => p.type === type);

  const renewalAlerts = (partners ?? []).filter((p: Partner) => {
    const days = daysUntilRenewal(p.renewal_date);
    return days !== null && days <= 30 && days >= 0;
  });

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Relationship Tracker</h1>
          <p className="text-gray-400 mt-1">Sponsors, venues, speakers &amp; collaborators</p>
        </div>
        <Link
          href="/admin/relationships/new"
          className="bg-primary hover:bg-primary-hover text-black font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Add Partner
        </Link>
      </div>

      {renewalAlerts.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl">
          <p className="text-yellow-400 font-semibold mb-2">Renewal Alerts</p>
          <ul className="space-y-1">
            {renewalAlerts.map((p: Partner) => {
              const days = daysUntilRenewal(p.renewal_date)!;
              return (
                <li key={p.id} className="text-sm text-yellow-300">
                  <Link href={`/admin/relationships/${p.id}`} className="underline">
                    {p.name}
                  </Link>
                  {" — "}
                  {days === 0 ? "renews today" : `renews in ${days} day${days === 1 ? "" : "s"}`}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(["sponsor", "venue", "speaker", "collaborator"] as const).map((type) => {
          const group = byType(type);
          return (
            <div key={type} className="bg-surface border border-border rounded-xl p-5">
              <h2 className="text-lg font-semibold text-white mb-4">
                {TYPE_LABELS[type]}s
                <span className="ml-2 text-sm text-gray-500">({group.length})</span>
              </h2>
              {group.length === 0 ? (
                <p className="text-sm text-gray-600 italic">No {TYPE_LABELS[type].toLowerCase()}s yet.</p>
              ) : (
                <ul className="space-y-2">
                  {group.map((p: Partner) => (
                    <li key={p.id}>
                      <Link
                        href={`/admin/relationships/${p.id}`}
                        className="flex items-center justify-between hover:bg-surface-hover p-2 rounded-lg transition-colors"
                      >
                        <div>
                          <span className="text-white text-sm font-medium">{p.name}</span>
                          {p.company && (
                            <span className="text-gray-500 text-xs ml-2">{p.company}</span>
                          )}
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}
                        >
                          {p.status}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
