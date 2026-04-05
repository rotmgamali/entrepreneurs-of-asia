"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PARTNER_TYPES = ["sponsor", "venue", "speaker", "collaborator"] as const;
const PARTNER_STATUSES = ["active", "warm", "cold", "inactive"] as const;

export default function NewPartnerPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    type: "sponsor" as (typeof PARTNER_TYPES)[number],
    company: "",
    email: "",
    phone: "",
    status: "active" as (typeof PARTNER_STATUSES)[number],
    notes: "",
    renewal_date: "",
  });

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      type: form.type,
      status: form.status,
    };
    if (form.company.trim()) body.company = form.company.trim();
    if (form.email.trim()) body.email = form.email.trim();
    if (form.phone.trim()) body.phone = form.phone.trim();
    if (form.notes.trim()) body.notes = form.notes.trim();
    if (form.renewal_date) body.renewal_date = form.renewal_date;

    const res = await fetch("/api/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/admin/relationships/${data.id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error ?? "Failed to create partner");
      setStatus("error");
    }
  };

  const inputClass =
    "w-full bg-black/40 border border-border rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-white placeholder-gray-500";

  const labelClass = "block text-sm font-medium text-gray-300 mb-1.5";

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      <Link
        href="/admin/relationships"
        className="text-gray-400 hover:text-white text-sm mb-6 inline-block"
      >
        ← Back to Relationships
      </Link>

      <h1 className="text-3xl font-bold text-white mb-8">Add Partner</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className={labelClass}>Name *</label>
            <input
              required
              type="text"
              className={inputClass}
              placeholder="e.g. CAMP Coffee, Jake Thornton"
              value={form.name}
              onChange={set("name")}
            />
          </div>

          <div>
            <label className={labelClass}>Type *</label>
            <select
              required
              className={inputClass}
              value={form.type}
              onChange={set("type")}
            >
              {PARTNER_TYPES.map((t) => (
                <option key={t} value={t} className="bg-black">
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select
              className={inputClass}
              value={form.status}
              onChange={set("status")}
            >
              {PARTNER_STATUSES.map((s) => (
                <option key={s} value={s} className="bg-black">
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Company</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Company or brand name"
              value={form.company}
              onChange={set("company")}
            />
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              className={inputClass}
              placeholder="contact@example.com"
              value={form.email}
              onChange={set("email")}
            />
          </div>

          <div>
            <label className={labelClass}>Phone / WhatsApp</label>
            <input
              type="text"
              className={inputClass}
              placeholder="+66 81 234 5678"
              value={form.phone}
              onChange={set("phone")}
            />
          </div>

          <div>
            <label className={labelClass}>Renewal Date</label>
            <input
              type="date"
              className={inputClass}
              value={form.renewal_date}
              onChange={set("renewal_date")}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Notes</label>
            <textarea
              rows={4}
              className={inputClass}
              placeholder="Any context, history, or reminders about this partner…"
              value={form.notes}
              onChange={set("notes")}
            />
          </div>
        </div>

        {status === "error" && (
          <p className="text-red-400 text-sm">{errorMsg}</p>
        )}

        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={status === "loading"}
            className="bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            {status === "loading" ? "Saving…" : "Create Partner"}
          </button>
          <Link
            href="/admin/relationships"
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
