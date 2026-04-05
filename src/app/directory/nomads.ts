export interface Nomad {
  slug: string;
  name: string;
  role: string;
  bio: string;
  skills: string[];
  industry: string;
  website?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  nationality: string;
  avatarColor: string; // Tailwind bg color for avatar fallback
}

export const NOMADS: Nomad[] = [
  {
    slug: "jake-thornton",
    name: "Jake Thornton",
    role: "SaaS Founder",
    bio: "Building B2B SaaS tools for remote teams. $1.2M ARR, fully bootstrapped. Living in Chiang Mai for 3 years.",
    skills: ["Growth", "SEO", "Product", "B2B Sales"],
    industry: "SaaS",
    website: "https://example.com",
    twitter: "jakethornton",
    linkedin: "jakethornton",
    nationality: "🇺🇸 American",
    avatarColor: "bg-emerald-600",
  },
  {
    slug: "priya-anand",
    name: "Priya Anand",
    role: "E-Commerce Operator",
    bio: "DTC brand operator focused on sustainable fashion. $3M/yr revenue via remote contractors and automated fulfillment.",
    skills: ["E-Commerce", "Supply Chain", "Paid Ads", "Branding"],
    industry: "E-Commerce",
    website: "https://example.com",
    linkedin: "priyanand",
    instagram: "priya.anand.brand",
    nationality: "🇸🇬 Singaporean",
    avatarColor: "bg-violet-600",
  },
  {
    slug: "marcus-lee",
    name: "Marcus Lee",
    role: "Agency CEO",
    bio: "Runs a fully remote content marketing agency from Nimman. Obsessed with AI automation — N8N, Claude, and Make are part of daily operations.",
    skills: ["Content Marketing", "AI Automation", "Agency Ops", "N8N"],
    industry: "Agency",
    website: "https://example.com",
    twitter: "marcuslee_cm",
    linkedin: "marcusleecm",
    nationality: "🇬🇧 British",
    avatarColor: "bg-blue-600",
  },
  {
    slug: "yuki-tanaka",
    name: "Yuki Tanaka",
    role: "Product Designer",
    bio: "UX/product designer who has shipped products used by millions. Advises early-stage startups on design systems and user research.",
    skills: ["UX Design", "Product Strategy", "Design Systems", "Figma"],
    industry: "Design",
    twitter: "yukitanaka_ux",
    linkedin: "yukitanaka",
    nationality: "🇯🇵 Japanese",
    avatarColor: "bg-pink-600",
  },
  {
    slug: "rafael-santos",
    name: "Rafael Santos",
    role: "Crypto Trader & Educator",
    bio: "Full-time crypto trader with a 40K+ newsletter audience. Teaches systematic trading frameworks to retail investors.",
    skills: ["Crypto", "Trading", "Education", "Newsletter"],
    industry: "Finance",
    twitter: "rafaelcrypto",
    website: "https://example.com",
    nationality: "🇧🇷 Brazilian",
    avatarColor: "bg-yellow-600",
  },
  {
    slug: "sophie-dubois",
    name: "Sophie Dubois",
    role: "Fractional CMO",
    bio: "Former VP Marketing at two unicorns. Now helps Series A–B startups build demand gen engines. Available for part-time engagements.",
    skills: ["Demand Gen", "Brand Strategy", "Team Building", "PLG"],
    industry: "Marketing",
    linkedin: "sophiedubois",
    twitter: "sophiedubois_mkt",
    nationality: "🇫🇷 French",
    avatarColor: "bg-rose-600",
  },
  {
    slug: "alex-chen",
    name: "Alex Chen",
    role: "Indie Developer",
    bio: "Builds and ships micro-SaaS products. Portfolio of 8 tools generating $35K MRR combined. Loves Chiang Mai street food and fast internet.",
    skills: ["React", "Next.js", "TypeScript", "Product"],
    industry: "SaaS",
    website: "https://example.com",
    twitter: "alexchen_indie",
    nationality: "🇨🇦 Canadian",
    avatarColor: "bg-cyan-600",
  },
  {
    slug: "nina-volkova",
    name: "Nina Volkova",
    role: "Growth Consultant",
    bio: "Specializes in growth loops for marketplace and community businesses. Former Head of Growth at a top-20 Product Hunt launch.",
    skills: ["Growth Hacking", "Community", "Marketplace", "Analytics"],
    industry: "Consulting",
    linkedin: "ninavolkova",
    twitter: "nina_growth",
    nationality: "🇩🇪 German",
    avatarColor: "bg-orange-600",
  },
];

export const INDUSTRIES = [...new Set(NOMADS.map((n) => n.industry))].sort();
