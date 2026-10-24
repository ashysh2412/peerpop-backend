import { caption, type IgIdea } from "./ideas";

/**
 * The weekly content batch, written each Monday from the standing instruction kept in
 * project memory. Each batch becomes drafts on /admin/instagram; nothing posts until approved.
 */
const LINE = "Find creators across India to collab with. Free, in 30 seconds.";

type BatchPost = { headline: string; subline: string; lines: string[] };

const BATCHES: Record<string, BatchPost[]> = {
  "2026-10-26": [
    {
      headline: "Showreel sitting in your gallery?",
      subline: "Upload it to Google Drive, pin it on Peerpop, get cast.",
      lines: [
        "Actors, your best scenes don't need a YouTube channel.",
        "Put your showreel on Google Drive, set it to \"Anyone with the link\" and pin it to your Peerpop profile. It plays right there for directors and creators looking for talent.",
        LINE,
      ],
    },
    {
      headline: "Editors, your work deserves an audience.",
      subline: "Pin your before-and-after edits and let creators find you.",
      lines: [
        "Great editing is invisible, so show the before and after.",
        "Pin up to 6 videos on your Peerpop profile, add \"Editor\" as your skill, and creators who need an editor will find you. Kaam bhi milega, collabs bhi.",
        LINE,
      ],
    },
    {
      headline: "Dance video ka plan hai? Crew kahan hai?",
      subline: "Find dancers, shooters and editors near you.",
      lines: [
        "One dancer is a video. Three dancers and a good shooter is a moment.",
        "Post a collab call on Peerpop with the song, the date and who you need. Dancers and videographers near you can say they're interested.",
        LINE,
      ],
    },
    {
      headline: "Food reel, but make it a duo.",
      subline: "One eats, one shoots. Both grow.",
      lines: [
        "Food creators who collab double their reach: your followers meet their followers over one great plate.",
        "Find food creators and shooters in your city on Peerpop, send a request with a short note, and plan your next food walk together.",
        LINE,
      ],
    },
    {
      headline: "Travelling solo? Shoot with company.",
      subline: "Meet travel creators going where you're going.",
      lines: [
        "The best travel reels have someone behind the camera who gets it.",
        "On Peerpop, search travel creators by city, check their videos, and team up for your next trip. Same trip, double the content.",
        LINE,
      ],
    },
    {
      headline: "Worried about strangers? So are we.",
      subline: "Private profile, Report and Block, built in.",
      lines: [
        "On Peerpop, only people you accept can message you.",
        "Make your profile private so only your connections see your work, and block or report anyone in one tap. Collab safely.",
        LINE,
      ],
    },
    {
      headline: "Don't just send a request. Say why.",
      subline: "A one-line note gets far more yeses than a plain hi.",
      lines: [
        "\"Hi\" gets ignored. \"Want to shoot a street food reel in Indore this Sunday?\" gets a yes.",
        "When you tap Connect on Peerpop, add a short note about the collab you have in mind. Be specific, be kind, and watch the yeses come in.",
        LINE,
      ],
    },
  ],
};

/** Every batch post, oldest batch first, ready to become drafts. */
export function batchIdeas(): IgIdea[] {
  return Object.entries(BATCHES)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([week, posts]) =>
      posts.map((p, i) => ({ idea_key: `batch:${week}:${i + 1}`, kind: "tip" as const, headline: p.headline, subline: p.subline, caption: caption(p.lines) })),
    );
}
