import type { Metadata } from "next";
import DirectoryClient from "@/components/DirectoryClient";
import { NOMADS } from "./nomads";

export const metadata: Metadata = {
  title: "Nomad Directory | Chiang Mai Founders",
  description:
    "Browse our curated directory of founders, creators, and digital nomads based in Chiang Mai. Filter by skills and industry to find the right connections.",
  alternates: { canonical: "/directory" },
  openGraph: {
    title: "Nomad Directory | Chiang Mai Founders",
    description:
      "Find and connect with verified founders and digital nomads in Chiang Mai. Browse by skills and industry.",
    url: "https://entrepreneursofasia.com/directory",
    type: "website",
  },
};

export default function DirectoryPage() {
  return (
    <main className="flex-1 flex flex-col">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Header */}
        <div className="mb-12">
          <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-2">Community</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Nomad Directory</h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Meet the founders, creators, and operators in our community. Everyone listed here has attended at least one event and opted in to be discoverable.
          </p>
        </div>

        <DirectoryClient nomads={NOMADS} />
      </div>
    </main>
  );
}
