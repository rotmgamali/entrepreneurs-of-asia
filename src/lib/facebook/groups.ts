const GRAPH_API = "https://graph.facebook.com/v19.0";

async function graphPost(
  accessToken: string,
  path: string,
  body: Record<string, unknown>
) {
  const res = await fetch(`${GRAPH_API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, access_token: accessToken }),
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`Facebook Graph API error: ${data.error.message}`);
  }
  return data;
}

async function graphGet(
  accessToken: string,
  path: string,
  params: Record<string, string> = {}
) {
  const query = new URLSearchParams({ ...params, access_token: accessToken });
  const res = await fetch(`${GRAPH_API}/${path}?${query}`);
  const data = await res.json();
  if (data.error) {
    throw new Error(`Facebook Graph API error: ${data.error.message}`);
  }
  return data;
}

export async function postToGroup(
  accessToken: string,
  groupId: string,
  message: string,
  link?: string
) {
  return graphPost(accessToken, `${groupId}/feed`, {
    message,
    ...(link ? { link } : {}),
  });
}

export async function getGroupMembers(
  accessToken: string,
  groupId: string,
  limit = 50
) {
  return graphGet(accessToken, `${groupId}/members`, {
    limit: String(limit),
    fields: "id,name,administrator",
  });
}

export async function getPendingMembers(
  accessToken: string,
  groupId: string
) {
  return graphGet(accessToken, `${groupId}/pending_members`, {
    fields: "id,name,questionnaire",
  });
}

export async function approveMember(
  accessToken: string,
  groupId: string,
  userId: string
) {
  return graphPost(accessToken, `${groupId}/members`, { member: userId });
}

export async function denyMember(
  accessToken: string,
  groupId: string,
  userId: string
) {
  return graphPost(accessToken, `${groupId}/pending_members`, {
    member: userId,
    deny: true,
  });
}

export function formatEventPost(event: {
  title: string;
  date: string;
  time: string;
  venue: string;
  description: string;
  rsvpUrl: string;
}): string {
  return [
    `📅 ${event.title}`,
    ``,
    `📆 ${event.date} at ${event.time}`,
    `📍 ${event.venue}`,
    ``,
    event.description,
    ``,
    `🎟 RSVP here: ${event.rsvpUrl}`,
    ``,
    `See you there! 🙌`,
  ].join("\n");
}

export async function announceEvent(
  accessToken: string,
  groupId: string,
  event: Parameters<typeof formatEventPost>[0]
) {
  const message = formatEventPost(event);
  return postToGroup(accessToken, groupId, message, event.rsvpUrl);
}

export async function postWelcomeForNewMember(
  accessToken: string,
  groupId: string,
  memberName: string
) {
  const message = `👋 Welcome to Entrepreneurs of Asia – Chiang Mai, ${memberName}!\n\nIntroduce yourself below — tell us what you're building and what brings you to CM. 🇹🇭`;
  return postToGroup(accessToken, groupId, message);
}
