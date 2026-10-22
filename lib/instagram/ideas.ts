/** Ready-made Instagram posts for Peerpop's own account. Pure, so it can be tested. */

export type IgIdea = {
  idea_key: string;
  kind: "tip" | "collab" | "milestone";
  headline: string;
  subline: string | null;
  caption: string;
};

const TAGS = "#peerpop #punecreators #contentcreator #creatorcommunity #collab #instagramcreators #punebloggers #reelsindia";
const CTA = "Join free: link in bio.";

function caption(lines: string[]) {
  return [...lines, "", CTA, "", TAGS].join("\n");
}

// Posts that always make sense, even before many people have joined.
const TIPS: { key: string; headline: string; subline: string; lines: string[] }[] = [
  {
    key: "find-partner",
    headline: "Find your next collab partner in Pune",
    subline: "Editors, shooters, dancers, foodies. All in one place.",
    lines: ["Looking for someone to shoot, edit or star in your next reel?", "Peerpop shows you creators near you who are open to collab."],
  },
  {
    key: "post-collab",
    headline: "Got an idea? Post a collab call.",
    subline: "Say what you're making and who you need. Creators nearby can join.",
    lines: ["Post a collab call on Peerpop in under a minute.", "Say what you're making, who you need and when. Creators near you get to see it."],
  },
  {
    key: "stop-dms",
    headline: "Stop cold-DMing strangers. Start collabing.",
    subline: "Everyone on Peerpop is here to make things together.",
    lines: ["Cold DMs get ignored.", "On Peerpop, everyone is already looking for people to create with."],
  },
  {
    key: "bio-link",
    headline: "Your Instagram bio needs this link",
    subline: "One Peerpop link shows your skills, reels and collabs.",
    lines: ["Get a short Peerpop link for your bio.", "It shows what you make, your best videos and that you're open to collab."],
  },
  {
    key: "youtube-verified",
    headline: "Real YouTube numbers. Verified.",
    subline: "Connect your channel and show stats people can trust.",
    lines: ["Connect your YouTube channel on Peerpop.", "Your subscriber and view counts update daily, so other creators see real numbers."],
  },
  {
    key: "groups",
    headline: "A group for every niche",
    subline: "Food, dance, comedy, tech. Post with people like you.",
    lines: ["Join a Peerpop group for your niche, or start your own.", "Share work, swap tips and find people for your next shoot."],
  },
  {
    key: "weekend-crew",
    headline: "Weekend shoot? Find a crew in minutes.",
    subline: "Search by skill, city and language.",
    lines: ["Need a camera person for Saturday? An editor by Monday?", "Search Peerpop by skill, city and language and message them right away."],
  },
  {
    key: "languages",
    headline: "Create in your language",
    subline: "Find creators who make in Marathi, Hindi, Tamil and more.",
    lines: ["Peerpop supports 15 Indian languages.", "Find creators who make content in the language your audience loves."],
  },
];

export function tipIdeas(): IgIdea[] {
  return TIPS.map((t) => ({ idea_key: `tip:${t.key}`, kind: "tip", headline: t.headline, subline: t.subline, caption: caption(t.lines) }));
}

export type OpenCollab = { id: string; title: string; roles: string[]; city: string | null };

export function collabIdea(c: OpenCollab): IgIdea {
  const needs = c.roles.length ? `Looking for: ${c.roles.join(", ")}` : "Open to all creators";
  const where = c.city ? ` in ${c.city}` : "";
  return {
    idea_key: `collab:${c.id}`,
    kind: "collab",
    headline: c.title.slice(0, 120),
    subline: `${needs}${where}`.slice(0, 200),
    caption: caption([`New collab call on Peerpop${where}: "${c.title}"`, `${needs}.`, "Want in? Find it on Peerpop and say hi."]),
  };
}

/** A "N creators joined this week" post, once the number is worth showing off. */
export function milestoneIdea(joinedThisWeek: number, weekKey: string): IgIdea | null {
  if (joinedThisWeek < 5) return null;
  return {
    idea_key: `milestone:${weekKey}`,
    kind: "milestone",
    headline: `${joinedThisWeek} new creators joined Peerpop this week`,
    subline: "Come say hi and find your next collab.",
    caption: caption([`${joinedThisWeek} creators joined Peerpop this week.`, "Your next collab partner might be one of them."]),
  };
}

/** ISO-style week label like 2026-W43, so each week gets at most one milestone post. */
export function weekKey(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
