"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border/50 backdrop-blur-xl bg-black/70">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="text-white font-semibold text-sm tracking-tight">
          Entrepreneurs of Asia
        </Link>

        <nav className="hidden sm:flex items-center gap-6">
          <a href="#rsvp" className="text-sm text-gray-400 hover:text-white transition-colors">
            Join
          </a>
          <a
            href="https://chat.whatsapp.com/YOUR_INVITE_LINK"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            WhatsApp
          </a>
          <a
            href="#rsvp"
            className="text-sm bg-primary hover:bg-primary-hover text-white font-medium px-4 py-2 rounded-full transition-colors"
          >
            Sign Up
          </a>
        </nav>

        <button
          className="sm:hidden text-gray-400 hover:text-white transition-colors"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="sm:hidden border-t border-border bg-black/95 px-5 py-4 space-y-3">
          <a href="#rsvp" onClick={() => setOpen(false)} className="block text-gray-300 text-sm py-1">
            Join
          </a>
          <a
            href="https://chat.whatsapp.com/YOUR_INVITE_LINK"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="block text-gray-300 text-sm py-1"
          >
            WhatsApp
          </a>
          <a
            href="#rsvp"
            onClick={() => setOpen(false)}
            className="block text-center bg-primary text-white font-medium px-4 py-2.5 rounded-full text-sm mt-2"
          >
            Sign Up
          </a>
        </div>
      )}
    </header>
  );
}
