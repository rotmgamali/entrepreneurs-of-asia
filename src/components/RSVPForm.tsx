"use client";

import { useState } from "react";
import { Send, Users, Globe, Briefcase } from "lucide-react";

export default function RSVPForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsapp: "",
    businessNiche: "",
    website: "",
    socials: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setStatus("success");
    } else {
      setStatus("error");
    }
  };

  if (status === "error") {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h3 className="text-2xl font-bold mb-2 text-white">Something went wrong</h3>
        <p className="text-gray-400 mb-6">We couldn't submit your application. Please try again.</p>
        <button
          onClick={() => setStatus("idle")}
          className="text-primary hover:text-primary-hover transition-colors text-sm font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 text-primary mb-4">
          <Send className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold mb-2 text-white">You're on the list!</h3>
        <p className="text-gray-400 mb-6">
          Check your email and WhatsApp for the exact location and exclusive community invites.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="text-primary hover:text-primary-hover transition-colors text-sm font-medium"
        >
          Submit another response
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6 backdrop-blur-md">
      <div>
        <h3 className="text-xl font-semibold text-white mb-1">Apply to Join the Next Event</h3>
        <p className="text-sm text-gray-400">Our weekly events are highly curated. Provide your details below.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Full Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
              <Users className="w-4 h-4" />
            </div>
            <input
              required
              type="text"
              className="w-full bg-black/40 border border-border rounded-lg py-2.5 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-white placeholder-gray-500"
              placeholder="Satoshi Nakamoto"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Email Address</label>
          <input
            required
            type="email"
            className="w-full bg-black/40 border border-border rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-white placeholder-gray-500"
            placeholder="founder@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">WhatsApp / Telegram Number</label>
        <input
          required
          type="text"
          className="w-full bg-black/40 border border-border rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-white placeholder-gray-500"
          placeholder="+1 234 567 8900"
          value={formData.whatsapp}
          onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-300">What is your business / niche?</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 pt-3 flex items-start pointer-events-none text-gray-500">
            <Briefcase className="w-4 h-4" />
          </div>
          <textarea
            required
            rows={3}
            className="w-full bg-black/40 border border-border rounded-lg py-2.5 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-white placeholder-gray-500"
            placeholder="e.g. SaaS Founder, E-commerce, Agency Owner..."
            value={formData.businessNiche}
            onChange={(e) => setFormData({ ...formData, businessNiche: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Main Website</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
              <Globe className="w-4 h-4" />
            </div>
            <input
              type="url"
              className="w-full bg-black/40 border border-border rounded-lg py-2.5 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-white placeholder-gray-500"
              placeholder="https://yourcompany.com"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Socials (X, LinkedIn, IG)</label>
          <input
            type="text"
            className="w-full bg-black/40 border border-border rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-white placeholder-gray-500"
            placeholder="@username"
            value={formData.socials}
            onChange={(e) => setFormData({ ...formData, socials: e.target.value })}
          />
        </div>
      </div>

      <button
        disabled={status === "loading"}
        type="submit"
        className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "loading" ? "Submitting..." : "Apply & Secure Your Spot"}
      </button>
      
      <p className="text-xs text-center text-gray-500 mt-4">
        By applying, you agree to receive event details via email and WhatsApp.
      </p>
    </form>
  );
}
