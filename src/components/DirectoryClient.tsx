"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Globe, ExternalLink, AtSign, X } from "lucide-react";
import { type Nomad, INDUSTRIES } from "@/app/directory/nomads";

function NomadCard({ nomad }: { nomad: Nomad }) {
  return (
    <Link
      href={`/directory/${nomad.slug}`}
      className="bg-surface border border-border rounded-xl p-6 hover:bg-surface-hover transition-colors flex flex-col gap-4 group"
    >
      <div className="flex items-start gap-4">
        <div
          className={`${nomad.avatarColor} w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}
        >
          {nomad.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div className="min-w-0">
          <h3 className="text-white font-semibold group-hover:text-primary transition-colors leading-tight">
            {nomad.name}
          </h3>
          <p className="text-primary text-xs font-medium mt-0.5">{nomad.role}</p>
          <p className="text-gray-500 text-xs mt-0.5">{nomad.nationality}</p>
        </div>
      </div>

      <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">{nomad.bio}</p>

      <div className="flex flex-wrap gap-1.5">
        {nomad.skills.slice(0, 3).map((skill) => (
          <span
            key={skill}
            className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5"
          >
            {skill}
          </span>
        ))}
        {nomad.skills.length > 3 && (
          <span className="text-xs text-gray-500 px-1 py-0.5">+{nomad.skills.length - 3}</span>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1 border-t border-border">
        {nomad.website && (
          <Globe className="w-3.5 h-3.5 text-gray-500 hover:text-primary transition-colors flex-shrink-0" />
        )}
        {nomad.twitter && (
          <X className="w-3.5 h-3.5 text-gray-500 hover:text-primary transition-colors flex-shrink-0" />
        )}
        {nomad.linkedin && (
          <ExternalLink className="w-3.5 h-3.5 text-gray-500 hover:text-primary transition-colors flex-shrink-0" />
        )}
        {nomad.instagram && (
          <AtSign className="w-3.5 h-3.5 text-gray-500 hover:text-primary transition-colors flex-shrink-0" />
        )}
        <span className="ml-auto text-xs text-gray-600 group-hover:text-gray-400 transition-colors">
          View profile →
        </span>
      </div>
    </Link>
  );
}

export default function DirectoryClient({ nomads }: { nomads: Nomad[] }) {
  const [query, setQuery] = useState("");
  const [activeIndustry, setActiveIndustry] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = nomads;
    if (activeIndustry) {
      result = result.filter((n) => n.industry === activeIndustry);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.role.toLowerCase().includes(q) ||
          n.bio.toLowerCase().includes(q) ||
          n.skills.some((s) => s.toLowerCase().includes(q)) ||
          n.industry.toLowerCase().includes(q)
      );
    }
    return result;
  }, [nomads, query, activeIndustry]);

  return (
    <div className="space-y-8">
      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, skill, or industry…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg py-2.5 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-white placeholder-gray-500 text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Industry chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveIndustry(null)}
          className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${
            activeIndustry === null
              ? "bg-primary border-primary text-white"
              : "bg-surface border-border text-gray-400 hover:text-white hover:border-gray-500"
          }`}
        >
          All
        </button>
        {INDUSTRIES.map((industry) => (
          <button
            key={industry}
            onClick={() => setActiveIndustry(activeIndustry === industry ? null : industry)}
            className={`text-sm px-4 py-1.5 rounded-full border transition-colors ${
              activeIndustry === industry
                ? "bg-primary border-primary text-white"
                : "bg-surface border-border text-gray-400 hover:text-white hover:border-gray-500"
            }`}
          >
            {industry}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">
        {filtered.length === nomads.length
          ? `${nomads.length} members in the directory`
          : `${filtered.length} of ${nomads.length} members`}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((nomad) => (
            <NomadCard key={nomad.slug} nomad={nomad} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg font-medium text-gray-400 mb-2">No matches found</p>
          <p className="text-sm">Try a different search term or clear the industry filter.</p>
        </div>
      )}
    </div>
  );
}
