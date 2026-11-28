// Collab idea matching: when someone posts a collab idea, pick the creators who
// fit it best, using the same rules as Auto Jodi: a similar size (within 3x of
// the person who posted) and the same or a related niche. Pure, so it can be tested.
import { MAX_SIZE_RATIO, pairKey, relatedNiche, type JodiCandidate } from "@/lib/jodi/match";

export type IdeaMatch = { b: JodiCandidate; shared: string[]; related: boolean; sameCity: boolean };

/** How many creators each idea is matched to. */
export const IDEA_MATCHES = 5;

/**
 * The best creators for an idea. The idea's niches decide the match (the author's own
 * niches if the idea has none). If the author has a follower count, only creators within
 * 3x of it count; otherwise smaller creators come first. A shoot in a city prefers people there.
 */
export function pickIdeaMatches(
  author: JodiCandidate,
  idea: { niches: string[]; city: string | null },
  pool: JodiCandidate[],
  avoid: Set<string>,
  count = IDEA_MATCHES,
): IdeaMatch[] {
  const niches = (idea.niches.length ? idea.niches : author.niches).filter((n) => n !== "other");
  if (!niches.length) return [];
  const sized = author.followers > 0;
  return pool
    .filter((b) => b.id !== author.id && b.niches.length > 0 && b.followers > 0 && !avoid.has(pairKey(author.id, b.id)))
    .map((b) => {
      const ratio = sized ? Math.max(author.followers, b.followers) / Math.max(1, Math.min(author.followers, b.followers)) : 1;
      if (ratio > MAX_SIZE_RATIO) return null;
      const shared = niches.filter((n) => b.niches.includes(n));
      const related = !shared.length && niches.some((x) => b.niches.some((y) => relatedNiche(x, y)));
      if (!shared.length && !related) return null;
      const sameCity = !!idea.city && b.city === idea.city;
      // Shared niche beats related; the shoot's city helps; then closest size (or smallest, without a size).
      const closeness = sized ? -Math.log(ratio) / Math.log(MAX_SIZE_RATIO) : -Math.log10(b.followers) / 10;
      const score = (shared.length ? 2 : 1) + (sameCity ? 1 : 0) + closeness;
      return { score, match: { b, shared, related, sameCity } };
    })
    .filter((x) => x !== null)
    .sort((x, y) => y.score - x.score)
    .slice(0, count)
    .map((x) => x.match);
}

/** Idea chats a person can get in 7 days, so nobody is flooded. */
export const IDEA_CHATS_PER_WEEK = 2;

const first = (name: string | null) => name?.trim().split(/\s+/)[0] || "there";

/** The short chat a matched creator gets from the Peerpop account. */
export function ideaMatchMessage(to: { name: string | null }, idea: { id: string; title: string }, author: { name: string | null }): string {
  return `Hi ${first(to.name)} 👋 Aapke liye ek collab idea!

"${idea.title}" by ${first(author.name)}

Pasand aaye toh I'm in tap karo:
www.peerpop.in/collabs/${idea.id}`;
}
