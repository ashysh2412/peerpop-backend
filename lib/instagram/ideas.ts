/** Ready-made Instagram posts for Peerpop's own account. Pure, so it can be tested. */

export type IgIdea = {
  idea_key: string;
  kind: "tip" | "collab" | "milestone";
  headline: string;
  subline: string | null;
  caption: string;
};

const TAGS = "#peerpop #indiancreators #contentcreator #creatorcommunity #collab #instagramcreators #creatorsofindia #reelsindia";
const CTA = "Join free: link in bio.";

function caption(lines: string[]) {
  return [...lines, "", CTA, "", TAGS].join("\n");
}

// Posts that always make sense, even before many people have joined.
const TIPS: { key: string; headline: string; subline: string; lines: string[] }[] = [
  {
    key: "find-partner",
    headline: "Find your next collab partner",
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
  {
    key: "hook-3s",
    headline: "Hook them in the first 3 seconds",
    subline: "Start with the best moment, not the intro.",
    lines: ["People decide in seconds whether to keep watching.", "Open with your best shot, then explain. Find an editor on Peerpop who can help."],
  },
  {
    key: "collab-reach",
    headline: "Collabs grow both audiences",
    subline: "Two creators, one reel, double the reach.",
    lines: [
      "A collab puts you in front of someone else's followers, and them in front of yours.",
      "Find a partner on Peerpop who makes something next to your niche.",
    ],
  },
  {
    key: "editor-find",
    headline: "Shoot more, edit less",
    subline: "Find an editor near you on Peerpop.",
    lines: ["Editing eating your whole weekend?", "Peerpop has editors across India open to collabs and paid work."],
  },
  {
    key: "city-spots",
    headline: "Your city has a shoot spot for every niche",
    subline: "Cafes, street food, rooftops and sunrises.",
    lines: ["Every Indian city is full of places that look great on camera.", "Team up with a local creator on Peerpop and plan your next shoot together."],
  },
  {
    key: "consistency",
    headline: "Post a little, every week",
    subline: "Consistency beats one viral reel.",
    lines: ["Small, regular posts build a real audience.", "Plan a month of content with a collab partner from Peerpop."],
  },
  {
    key: "anchor-host",
    headline: "Need a face for your reel?",
    subline: "Find anchors and hosts open to collab.",
    lines: ["Got the idea but not the face for it?", "Peerpop has anchors and hosts who love trying new formats."],
  },
  {
    key: "script",
    headline: "Great reels start with a script",
    subline: "Find a scriptwriter for your next idea.",
    lines: ["A tight script makes a 30-second reel feel effortless.", "Scriptwriters on Peerpop are looking for creators to work with."],
  },
  {
    key: "profile-photo",
    headline: "Add a real photo to your profile",
    subline: "Creators answer people they can see.",
    lines: ["People reply more to profiles with a clear photo.", "Add yours on Peerpop in a few seconds."],
  },
  {
    key: "open-to-collab",
    headline: "Turn on 'Open to collab'",
    subline: "Let other creators know you're up for it.",
    lines: ["One switch on your Peerpop profile tells everyone you're open to work together.", "More people will find you in search."],
  },
  {
    key: "small-creators",
    headline: "Small creators, big collabs",
    subline: "You don't need 100k followers to team up.",
    lines: ["Some of the best collabs are between creators just starting out.", "Peerpop is for every size of creator."],
  },
  {
    key: "brief",
    headline: "Write a clear collab brief",
    subline: "What, who, when and where. That's it.",
    lines: [
      "A good collab call answers four things: what you're making, who you need, when and where.",
      "Post yours on Peerpop and creators nearby will see it.",
    ],
  },
  {
    key: "say-hi",
    headline: "Message first. Someone has to.",
    subline: "Most great collabs start with a simple hi.",
    lines: ["Saw a creator you like on Peerpop?", "Send a friendly message. Most people are happy to hear from someone local."],
  },
  {
    key: "festive",
    headline: "Festive season is collab season",
    subline: "Plan your festive reels together.",
    lines: ["Festivals are the busiest time for content.", "Find creators on Peerpop and plan a festive series together."],
  },
  {
    key: "food-creators",
    headline: "Food creators of India, unite",
    subline: "Find shooters and editors for your food walks.",
    lines: ["India's food scene deserves great content.", "Find food creators, shooters and editors on Peerpop."],
  },
  {
    key: "dance",
    headline: "Dancers: find your crew",
    subline: "Choreographers, shooters and editors in one place.",
    lines: ["Planning a dance reel?", "Find dancers, choreographers and videographers on Peerpop."],
  },
  {
    key: "comedy",
    headline: "Funny ideas need a team",
    subline: "Writers, actors and editors for your sketches.",
    lines: ["A sketch needs a writer, actors and a sharp edit.", "Find your comedy crew on Peerpop."],
  },
  {
    key: "tech",
    headline: "Tech creators, team up",
    subline: "Reviews and explainers are better with two.",
    lines: ["Two tech creators, one honest comparison video.", "Find tech creators to collab with on Peerpop."],
  },
  {
    key: "fitness",
    headline: "Fitness creators, train together",
    subline: "Workout reels with a partner hit harder.",
    lines: ["Partner workouts make great content.", "Find fitness creators near you on Peerpop."],
  },
  {
    key: "fashion",
    headline: "Style shoots need a crew",
    subline: "Photographers, stylists and models on Peerpop.",
    lines: ["A fashion shoot is a team effort.", "Find photographers, stylists and models on Peerpop."],
  },
  {
    key: "travel",
    headline: "Travel reels with company",
    subline: "Find creators going where you're going.",
    lines: ["Planning a weekend trip?", "Find travel creators on Peerpop and shoot together."],
  },
  {
    key: "reply-fast",
    headline: "Reply to collab requests quickly",
    subline: "Fast replies lead to more collabs.",
    lines: ["Creators who reply within a day get more collabs done.", "Check the bell on Peerpop so you never miss one."],
  },
  {
    key: "free",
    headline: "Peerpop is free",
    subline: "Find, message and collab with creators. No fees.",
    lines: ["No subscription. No fees.", "Find creators, message them and plan collabs on Peerpop for free."],
  },
  {
    key: "share-link",
    headline: "Share your Peerpop link",
    subline: "Add it to your bio and let collabs come to you.",
    lines: ["Your Peerpop link shows your skills, work and that you're open to collab.", "Copy it from your profile and add it to your bio."],
  },
  {
    key: "first-collab",
    headline: "Your first collab is the hardest",
    subline: "After that, it gets easy.",
    lines: ["Never done a collab before?", "Start small with a creator nearby on Peerpop. One reel is enough."],
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
