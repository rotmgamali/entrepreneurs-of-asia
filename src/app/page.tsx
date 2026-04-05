import RSVPForm from "../components/RSVPForm";
import { Calendar, MapPin, Users, ArrowRight, MessageCircle } from "lucide-react";

const eventSchema = {
  "@context": "https://schema.org",
  "@type": "EventSeries",
  name: "Entrepreneurs of Asia — Weekly Founder Meetup",
  description:
    "Free weekly networking event for founders, entrepreneurs, and digital nomads in Chiang Mai. Expert presentations followed by structured networking breakouts.",
  url: "https://entrepreneursofasia.com",
  location: {
    "@type": "Place",
    name: "Kantary Hills Hotel",
    address: {
      "@type": "PostalAddress",
      streetAddress: "44 Nimmanhaemin Rd Soi 12",
      addressLocality: "Chiang Mai",
      addressRegion: "Chiang Mai",
      addressCountry: "TH",
    },
  },
  organizer: {
    "@type": "Organization",
    name: "Entrepreneurs of Asia",
    url: "https://entrepreneursofasia.com",
  },
  eventSchedule: {
    "@type": "Schedule",
    repeatFrequency: "P1W",
    byDay: "https://schema.org/Thursday",
    startTime: "18:00",
  },
  isAccessibleForFree: true,
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Entrepreneurs of Asia",
  url: "https://entrepreneursofasia.com",
  description:
    "Free weekly networking events for founders, digital nomads, and entrepreneurs in Chiang Mai. Every Thursday at Kantary Hills Hotel, Nimman.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "44 Nimmanhaemin Rd Soi 12",
    addressLocality: "Chiang Mai",
    addressRegion: "Chiang Mai Province",
    addressCountry: "TH",
  },
  geo: { "@type": "GeoCoordinates", latitude: 18.7953, longitude: 98.9689 },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: "https://schema.org/Thursday",
    opens: "18:00",
    closes: "21:00",
  },
  priceRange: "Free",
  keywords:
    "entrepreneur events Chiang Mai, digital nomad meetups, founder networking, startup community Chiang Mai, Nimman networking",
};

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema).replace(/</g, "\\u003c") }}
      />

      {/* ── Hero — Chiang Mai skyline / Nimman vibes ── */}
      <section
        className="relative w-full min-h-[90vh] flex items-center justify-center"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1595872018818-97555653a011?w=1920&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black" />
        <div className="relative z-10 max-w-5xl px-5 sm:px-8 flex flex-col items-center text-center py-32">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-5 max-w-3xl leading-[1.1]">
            The Founder Meetup in Chiang Mai
          </h1>
          <p className="text-lg text-gray-300 max-w-xl mb-10">
            Every Thursday we bring together founders, creators, and digital nomads for expert talks and real connections. Free to attend, always.
          </p>
          <a
            href="#rsvp"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold px-8 py-3.5 rounded-full transition-colors text-sm"
          >
            Join This Thursday <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ── Event Details ── */}
      <section className="w-full max-w-5xl px-5 sm:px-8 -mt-16 relative z-20 pb-20">
        <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-2xl p-8 sm:p-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="text-primary w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Every Thursday</p>
                <p className="text-sm text-gray-400">6:00 PM — 8:30 PM</p>
                <p className="text-sm text-gray-400">Talks start at 6:30 PM</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="text-primary w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-semibold mb-1">Kantary Hills Hotel</p>
                <p className="text-sm text-gray-400">44 Nimmanhaemin Rd, Soi 12</p>
                <p className="text-sm text-gray-400">Chiang Mai, Thailand</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="text-primary w-5 h-5" />
              </div>
              <div>
                <p className="text-white font-semibold mb-1">100% Free</p>
                <p className="text-sm text-gray-400">30-50 founders per event</p>
                <p className="text-sm text-gray-400">No tickets, no fees</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What Happens — Coworking / people working ── */}
      <section
        className="relative w-full py-24"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1920&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 bg-black/80" />
        <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8">
          <h2 className="text-2xl font-bold text-white mb-10 text-center">What Happens</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
              <div className="text-3xl font-bold text-primary mb-3">01</div>
              <h3 className="text-white font-semibold mb-2">Expert Talks</h3>
              <p className="text-sm text-gray-300">Two 20-minute presentations from founders building real businesses in Chiang Mai. Actionable advice, not fluff.</p>
            </div>
            <div className="text-center p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
              <div className="text-3xl font-bold text-primary mb-3">02</div>
              <h3 className="text-white font-semibold mb-2">Networking Breakouts</h3>
              <p className="text-sm text-gray-300">After talks, we split into small groups by industry. Meet the right people, not just anyone.</p>
            </div>
            <div className="text-center p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
              <div className="text-3xl font-bold text-primary mb-3">03</div>
              <h3 className="text-white font-semibold mb-2">Community Access</h3>
              <p className="text-sm text-gray-300">Get added to our private WhatsApp and Facebook groups. Stay connected between events.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Topics — Clean dark section ── */}
      <section className="w-full py-20">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Topics We Cover</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "Local SEO",
              "Content Creation",
              "Personal Branding",
              "E-Commerce",
              "SaaS & Tech",
              "Freelancing",
              "AI & Automation",
              "Growth & Marketing",
            ].map((topic) => (
              <span
                key={topic}
                className="px-5 py-2.5 rounded-full border border-border text-sm text-gray-300 hover:border-primary/50 hover:text-white transition-colors"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── RSVP — Chiang Mai night / café scene ── */}
      <section
        className="relative w-full py-24"
        id="rsvp"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1528181304800-259b08848526?w=1920&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 bg-black/85" />
        <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white">
                Join us this Thursday
              </h2>
              <p className="text-gray-300 text-lg leading-relaxed">
                Sign up and we&apos;ll add you to the community. You&apos;ll get the exact venue details, weekly event updates, and access to our WhatsApp and Facebook groups.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3 text-gray-200">
                  <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>Every Thursday, 6:00 PM — Kantary Hills Hotel, Nimman Soi 12</span>
                </div>
                <div className="flex items-center gap-3 text-gray-200">
                  <Users className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>30-50 founders, creators, and digital nomads</span>
                </div>
                <div className="flex items-center gap-3 text-gray-200">
                  <MessageCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span>Private WhatsApp group + Facebook community</span>
                </div>
              </div>

              {/* Community Links */}
              <div className="flex flex-wrap gap-3 pt-4">
                <a
                  href="https://chat.whatsapp.com/YOUR_INVITE_LINK"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/25 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp Group
                </a>
                <a
                  href="https://facebook.com/groups/YOUR_GROUP"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#1877F2]/15 border border-[#1877F2]/30 text-[#1877F2] hover:bg-[#1877F2]/25 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook Group
                </a>
              </div>
            </div>

            {/* RSVP Form */}
            <div>
              <RSVPForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full border-t border-border py-10">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Entrepreneurs of Asia
          </p>
          <div className="flex items-center gap-5">
            <a href="https://chat.whatsapp.com/YOUR_INVITE_LINK" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#25D366] transition-colors" aria-label="WhatsApp">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
            <a href="https://facebook.com/groups/YOUR_GROUP" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#1877F2] transition-colors" aria-label="Facebook">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://instagram.com/entrepreneursofasia" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#E4405F] transition-colors" aria-label="Instagram">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
