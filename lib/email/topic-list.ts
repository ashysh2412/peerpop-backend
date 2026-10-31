/** The kinds of email a member can turn on or off. */
export type EmailTopic = "messages" | "network" | "collabs" | "digest";
export const EMAIL_TOPICS: EmailTopic[] = ["messages", "network", "collabs", "digest"];

/** How each kind of email is named on the settings and unsubscribe pages. */
export const TOPIC_LABELS = {
  messages: ["New messages", "When a connection messages you. At most one email per chat every few hours."],
  network: ["Connection requests", "When someone wants to connect, or accepts your request."],
  collabs: ["Collabs", "Interest in your collabs, being accepted, and new collab calls that need your skills."],
  digest: ["Daily summary", "One email a day about likes, comments, new creators and anything else you missed."],
} as const;
