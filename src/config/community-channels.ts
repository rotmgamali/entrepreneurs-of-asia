export const COMMUNITY_CHANNELS = {
  facebook: {
    groupName: "Entrepreneurs of Asia – Chiang Mai",
    groupDescription:
      "A community for entrepreneurs, founders, and digital nomads in Chiang Mai. Weekly events, networking, and peer support.",
    category: "Networking / Entrepreneurs",
    location: "Chiang Mai, Thailand",
    privacy: "private" as const, // requires admin approval; change to "public" for open discovery
    rules: [
      "Be respectful and professional",
      "No spam or self-promotion without value — share opportunities, not just pitches",
      "Keep discussions relevant to entrepreneurship and Chiang Mai",
      "Event announcements from EOA only in the pinned events thread",
      "No unsolicited DMs to other members",
    ],
    membershipQuestions: [
      "What brings you to Chiang Mai and what is your business or project?",
      "How did you hear about Entrepreneurs of Asia?",
      "Are you open to joining our private WhatsApp community group?",
    ],
    welcomeMessage:
      "Welcome to Entrepreneurs of Asia – Chiang Mai! 🇹🇭\n\nWe host weekly founder events every Thursday at 6 PM. Check the Events tab for this week's venue (revealed to approved members only).\n\nIntroduce yourself below — tell us what you're working on!",
  },

  telegram: {
    channel: {
      handle: "@EOAChiangMai",
      name: "Entrepreneurs of Asia – CM",
      description:
        "Official announcements for Entrepreneurs of Asia Chiang Mai. Weekly events, founder spotlights, and community news.",
      type: "channel" as const,
    },
    group: {
      name: "EOA Chiang Mai Chat",
      description:
        "Discussion group for EOA Chiang Mai members. Introductions, questions, deals, and connections.",
      type: "group" as const,
      slowMode: 0, // seconds between messages (0 = off)
      restrictNewMembers: true, // read-only for first 24h
      newMemberRestrictHours: 24,
    },
    bot: {
      username: "@EOAChiangMaiBot",
      commands: [
        { command: "start", description: "Welcome message + community links" },
        { command: "events", description: "Upcoming EOA events" },
        { command: "join", description: "WhatsApp invite link" },
        { command: "about", description: "About Entrepreneurs of Asia" },
      ],
    },
    welcomeMessage:
      "Welcome to EOA Chiang Mai! 👋\n\nWe're a curated community of founders and digital nomads based in Chiang Mai.\n\n📅 Events: Every Thursday @ 6 PM\n🌐 Website: https://eoa.cm\n\nIntroduce yourself — tell us what you're building!",
    pinnedMessage:
      "📌 WELCOME TO EOA CHIANG MAI\n\nThis group is for verified members of Entrepreneurs of Asia.\n\n• Events every Thursday @ 6 PM\n• Venue revealed to approved attendees only\n• Full schedule: https://eoa.cm\n\nGroup rules: Be helpful, be real, no spam.",
  },

  crossPosting: {
    enabled: true,
    platforms: ["telegram_channel", "facebook_group"] as const,
    eventAnnouncement: {
      template:
        "📅 {eventTitle}\n📆 {eventDate} @ {eventTime}\n📍 {eventVenue}\n\n{eventDescription}\n\n🎟 RSVP: {rsvpUrl}",
      postTelegramFirst: true,
      delayBetweenPlatformsMs: 2000,
    },
  },

  moderation: {
    telegram: {
      antiSpam: {
        enabled: true,
        deleteLinksFromNewAccounts: true,
        newAccountAgeDays: 7,
        strikeLimit: 3,
        autoKickAfterStrikes: true,
      },
      autoDeleteJoinMessages: true,
    },
    facebook: {
      requireMemberApproval: true,
      keywordFilter: ["spam", "crypto scam", "investment opportunity", "DM me"],
    },
  },
} as const;
