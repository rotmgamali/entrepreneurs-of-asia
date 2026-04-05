import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, X, ExternalLink, ArrowLeft } from "lucide-react";
import { NOMADS } from "../nomads";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return NOMADS.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const nomad = NOMADS.find((n) => n.slug === slug);
  if (!nomad) return {};

  return {
    title: `${nomad.name} – ${nomad.role} | Chiang Mai Founders`,
    description: nomad.bio,
    alternates: { canonical: `/directory/${nomad.slug}` },
    openGraph: {
      title: `${nomad.name} – ${nomad.role}`,
      description: nomad.bio,
      url: `https://entrepreneursofasia.com/directory/${nomad.slug}`,
      type: "profile",
    },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { slug } = await params;
  const nomad = NOMADS.find((n) => n.slug === slug);
  if (!nomad) notFound();

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: nomad.name,
    jobTitle: nomad.role,
    description: nomad.bio,
    knowsAbout: nomad.skills,
    ...(nomad.website && { url: nomad.website }),
    ...(nomad.twitter && { sameAs: [`https://twitter.com/${nomad.twitter}`] }),
    memberOf: {
      "@type": "Organization",
      name: "Chiang Mai Founders",
      url: "https://entrepreneursofasia.com",
    },
  };

  return (
    <main className="flex-1 flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <Link
          href="/directory"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Directory
        </Link>

        {/* Profile header */}
        <div className="flex items-start gap-6 mb-8">
          <div
            className={`${nomad.avatarColor} w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0`}
          >
            {nomad.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{nomad.name}</h1>
            <p className="text-primary font-medium mt-1">{nomad.role}</p>
            <p className="text-gray-500 text-sm mt-0.5">{nomad.nationality}</p>
          </div>
        </div>

        {/* Bio */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">About</h2>
          <p className="text-gray-300 leading-relaxed">{nomad.bio}</p>
        </div>

        {/* Skills */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Skills & Expertise</h2>
          <div className="flex flex-wrap gap-2">
            {nomad.skills.map((skill) => (
              <span
                key={skill}
                className="text-sm bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1"
              >
                {skill}
              </span>
            ))}
            <span className="text-sm bg-surface border border-border text-gray-400 rounded-full px-3 py-1">
              {nomad.industry}
            </span>
          </div>
        </div>

        {/* Links */}
        {(nomad.website || nomad.twitter || nomad.linkedin || nomad.instagram) && (
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Find Online</h2>
            <div className="space-y-3">
              {nomad.website && (
                <a
                  href={nomad.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors text-sm"
                >
                  <Globe className="w-4 h-4 text-primary flex-shrink-0" />
                  {nomad.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              {nomad.twitter && (
                <a
                  href={`https://twitter.com/${nomad.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors text-sm"
                >
                  <X className="w-4 h-4 text-primary flex-shrink-0" />@{nomad.twitter}
                </a>
              )}
              {nomad.linkedin && (
                <a
                  href={`https://linkedin.com/in/${nomad.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4 text-primary flex-shrink-0" />
                  linkedin.com/in/{nomad.linkedin}
                </a>
              )}
              {nomad.instagram && (
                <a
                  href={`https://instagram.com/${nomad.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4 text-primary flex-shrink-0" />@{nomad.instagram}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
