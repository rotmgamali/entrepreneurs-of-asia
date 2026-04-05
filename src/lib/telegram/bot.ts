import { COMMUNITY_CHANNELS } from "@/config/community-channels";

const TELEGRAM_API = "https://api.telegram.org";

function botUrl(token: string, method: string) {
  return `${TELEGRAM_API}/bot${token}/${method}`;
}

async function call(
  token: string,
  method: string,
  body: Record<string, unknown>
) {
  const res = await fetch(botUrl(token, method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram ${method} failed: ${data.description}`);
  }
  return data.result;
}

export async function sendMessage(
  token: string,
  chatId: string | number,
  text: string,
  options: Record<string, unknown> = {}
) {
  return call(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...options,
  });
}

export async function pinMessage(
  token: string,
  chatId: string | number,
  messageId: number
) {
  return call(token, "pinChatMessage", {
    chat_id: chatId,
    message_id: messageId,
    disable_notification: true,
  });
}

export async function restrictNewMember(
  token: string,
  chatId: string | number,
  userId: number,
  untilDate: number
) {
  return call(token, "restrictChatMember", {
    chat_id: chatId,
    user_id: userId,
    permissions: {
      can_send_messages: false,
      can_send_media_messages: false,
      can_send_polls: false,
      can_send_other_messages: false,
      can_add_web_page_previews: false,
      can_change_info: false,
      can_invite_users: false,
      can_pin_messages: false,
    },
    until_date: untilDate,
  });
}

export async function unrestrictMember(
  token: string,
  chatId: string | number,
  userId: number
) {
  return call(token, "restrictChatMember", {
    chat_id: chatId,
    user_id: userId,
    permissions: {
      can_send_messages: true,
      can_send_media_messages: true,
      can_send_polls: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true,
      can_change_info: false,
      can_invite_users: true,
      can_pin_messages: false,
    },
  });
}

export async function deleteMessage(
  token: string,
  chatId: string | number,
  messageId: number
) {
  return call(token, "deleteMessage", {
    chat_id: chatId,
    message_id: messageId,
  });
}

export async function banMember(
  token: string,
  chatId: string | number,
  userId: number
) {
  return call(token, "banChatMember", { chat_id: chatId, user_id: userId });
}

export function formatEventAnnouncement(event: {
  title: string;
  date: string;
  time: string;
  venue: string;
  description: string;
  rsvpUrl: string;
}): string {
  return COMMUNITY_CHANNELS.crossPosting.eventAnnouncement.template
    .replace("{eventTitle}", event.title)
    .replace("{eventDate}", event.date)
    .replace("{eventTime}", event.time)
    .replace("{eventVenue}", event.venue)
    .replace("{eventDescription}", event.description)
    .replace("{rsvpUrl}", event.rsvpUrl);
}

export async function announceEvent(
  token: string,
  channelId: string,
  event: Parameters<typeof formatEventAnnouncement>[0]
) {
  const text = formatEventAnnouncement(event);
  return sendMessage(token, channelId, text);
}

export async function sendWelcomeDm(token: string, userId: number) {
  return sendMessage(
    token,
    userId,
    COMMUNITY_CHANNELS.telegram.welcomeMessage
  );
}

export async function handleNewMember(
  token: string,
  groupId: string,
  userId: number
) {
  if (!COMMUNITY_CHANNELS.telegram.group.restrictNewMembers) return;

  const hours = COMMUNITY_CHANNELS.telegram.group.newMemberRestrictHours;
  const untilDate = Math.floor(Date.now() / 1000) + hours * 3600;

  await restrictNewMember(token, groupId, userId, untilDate);

  await sendWelcomeDm(token, userId).catch(() => {
    // User may have blocked DMs — not a hard failure
  });
}
