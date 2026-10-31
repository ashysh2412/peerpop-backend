/** Bell notifications that don't get their own email, so the daily summary covers them. */
export const DIGEST_KINDS = ["post_like", "post_comment", "collab_new", "new_member", "group_request", "group_accepted"] as const;

const LINES: Record<(typeof DIGEST_KINDS)[number] | "messages", [string, string]> = {
  messages: ["unread message", "unread messages"],
  post_like: ["new like on your posts", "new likes on your posts"],
  post_comment: ["new comment on your posts", "new comments on your posts"],
  collab_new: ["new collab call that may suit you", "new collab calls that may suit you"],
  new_member: ["new creator near you or in your niche", "new creators near you or in your niche"],
  group_request: ["request to join your group", "requests to join your groups"],
  group_accepted: ["group accepted you", "groups accepted you"],
};

/** "3 new likes on your posts" and so on, biggest first. Pure, so it can be tested. */
export function digestLines(counts: Partial<Record<keyof typeof LINES, number>>) {
  return (Object.entries(counts) as [keyof typeof LINES, number][])
    .filter(([kind, n]) => n > 0 && LINES[kind])
    .sort((a, b) => b[1] - a[1])
    .map(([kind, n]) => `${n} ${LINES[kind][n === 1 ? 0 : 1]}`);
}
