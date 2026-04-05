export type SubgroupKey =
  | "tech"
  | "marketing"
  | "ecommerce"
  | "media"
  | "agency"
  | "finance";

export interface WhatsAppSubgroup {
  key: SubgroupKey;
  name: string;
  description: string;
  inviteEnvVar: string;
  keywords: string[];
}

export const WHATSAPP_SUBGROUPS: WhatsAppSubgroup[] = [
  {
    key: "tech",
    name: "EOA CM – Tech & SaaS",
    description: "For software founders, developers, and SaaS operators",
    inviteEnvVar: "WA_GROUP_TECH_INVITE",
    keywords: [
      "saas",
      "software",
      "developer",
      "tech",
      "coding",
      "app",
      "startup",
      "api",
      "engineer",
      "devops",
      "ai",
      "ml",
    ],
  },
  {
    key: "marketing",
    name: "EOA CM – Marketing & Growth",
    description: "For marketers, growth hackers, SEO, and paid ads specialists",
    inviteEnvVar: "WA_GROUP_MARKETING_INVITE",
    keywords: [
      "marketing",
      "growth",
      "seo",
      "ads",
      "facebook ads",
      "google ads",
      "funnel",
      "copywriting",
      "branding",
      "pr",
      "influencer",
    ],
  },
  {
    key: "ecommerce",
    name: "EOA CM – E-commerce",
    description: "For product sellers, dropshippers, and DTC brand owners",
    inviteEnvVar: "WA_GROUP_ECOMMERCE_INVITE",
    keywords: [
      "ecommerce",
      "e-commerce",
      "shopify",
      "amazon",
      "dropship",
      "fba",
      "product",
      "dtc",
      "physical product",
      "wholesale",
      "retail",
    ],
  },
  {
    key: "media",
    name: "EOA CM – Media & Content",
    description: "For content creators, YouTubers, podcasters, and writers",
    inviteEnvVar: "WA_GROUP_MEDIA_INVITE",
    keywords: [
      "content",
      "youtube",
      "podcast",
      "creator",
      "newsletter",
      "writer",
      "blogger",
      "video",
      "media",
      "tiktok",
      "instagram",
    ],
  },
  {
    key: "agency",
    name: "EOA CM – Agency & Services",
    description: "For agency owners, consultants, and service providers",
    inviteEnvVar: "WA_GROUP_AGENCY_INVITE",
    keywords: [
      "agency",
      "freelance",
      "consulting",
      "service",
      "coach",
      "coaching",
      "done for you",
      "outsource",
    ],
  },
  {
    key: "finance",
    name: "EOA CM – Investors & Finance",
    description: "For investors, fintech founders, and finance professionals",
    inviteEnvVar: "WA_GROUP_FINANCE_INVITE",
    keywords: [
      "investor",
      "investing",
      "finance",
      "fund",
      "fintech",
      "crypto",
      "trading",
      "venture",
      "angel",
      "wealth",
    ],
  },
];

export function matchSubgroups(businessNiche: string): SubgroupKey[] {
  const normalized = businessNiche.toLowerCase();
  const matched: SubgroupKey[] = [];

  for (const group of WHATSAPP_SUBGROUPS) {
    if (group.keywords.some((kw) => normalized.includes(kw))) {
      matched.push(group.key);
    }
  }

  return matched;
}

export function getSubgroupInviteLinks(
  matchedKeys: SubgroupKey[],
  env: Record<string, string | undefined>
): Array<{ name: string; link: string }> {
  return matchedKeys
    .map((key) => {
      const group = WHATSAPP_SUBGROUPS.find((g) => g.key === key)!;
      const link = env[group.inviteEnvVar];
      if (!link) return null;
      return { name: group.name, link };
    })
    .filter((x): x is { name: string; link: string } => x !== null);
}

export const WA_TEMPLATES = {
  inviteCommunity: {
    name: "invite_community",
    language: "en",
    components: (recipientName: string, inviteLink: string) => ({
      type: "body",
      parameters: [
        { type: "text", text: recipientName },
        { type: "text", text: inviteLink },
      ],
    }),
  },
  inviteSubgroup: {
    name: "invite_subgroup",
    language: "en",
    components: (niche: string, groupName: string, inviteLink: string) => ({
      type: "body",
      parameters: [
        { type: "text", text: niche },
        { type: "text", text: groupName },
        { type: "text", text: inviteLink },
      ],
    }),
  },
  eventReminder24h: {
    name: "event_reminder_24h",
    language: "en",
    components: (
      recipientName: string,
      eventDate: string,
      venue: string
    ) => ({
      type: "body",
      parameters: [
        { type: "text", text: recipientName },
        { type: "text", text: eventDate },
        { type: "text", text: venue },
      ],
    }),
  },
  eventReminder2h: {
    name: "event_reminder_2h",
    language: "en",
    components: (fullVenueAddress: string) => ({
      type: "body",
      parameters: [{ type: "text", text: fullVenueAddress }],
    }),
  },
} as const;
