// Auto Jodi: pairs creators of a similar size with matching or related niches,
// ideally in different cities, so one Instagram Collab reel reaches two audiences.
// Pure, so it can be tested.
import { NICHES } from "@/lib/catalog";

export type JodiCandidate = {
  id: string;
  name: string | null;
  handle: string;
  city: string | null;
  cityName: string | null;
  niches: string[];
  followers: number;
  connections: number;
  joined: string;
};

export type JodiPair = { a: JodiCandidate; b: JodiCandidate; shared: string[]; related: boolean; sameCity: boolean; differentCity: boolean };

/** Niches that go well together in one reel even when they aren't the same. */
const GROUPS = [
  ["fashion", "beauty", "lifestyle"],
  ["food", "travel", "lifestyle", "home_decor"],
  ["fitness", "health", "sports"],
  ["comedy", "movies", "dance", "music", "relationships"],
  ["tech", "gaming", "science", "education"],
  ["finance", "business", "motivation", "education"],
  ["parenting", "kids", "home_decor", "diy", "pets"],
  ["art", "photography", "diy", "travel"],
  ["spirituality", "motivation", "health"],
];

export function relatedNiche(x: string, y: string) {
  return x !== y && x !== "other" && GROUPS.some((g) => g.includes(x) && g.includes(y));
}

/** Up to 3x bigger or smaller counts as "a similar size". */
export const MAX_SIZE_RATIO = 3;

export const pairKey = (x: string, y: string) => (x < y ? `${x}:${y}` : `${y}:${x}`);

export type JodiRules = {
  /** People who got a Jodi recently (wait before the next one). */
  busy: Set<string>;
  /** pairKey of every pair already suggested, connected, pending or blocked. */
  avoid: Set<string>;
  maxPairs: number;
};

function fit(a: JodiCandidate, b: JodiCandidate) {
  const ratio = Math.max(a.followers, b.followers) / Math.max(1, Math.min(a.followers, b.followers));
  if (ratio > MAX_SIZE_RATIO) return null;
  const shared = a.niches.filter((n) => n !== "other" && b.niches.includes(n));
  const related = !shared.length && a.niches.some((x) => b.niches.some((y) => relatedNiche(x, y)));
  if (!shared.length && !related) return null;
  const sameCity = !!a.city && a.city === b.city;
  const differentCity = !!a.city && !!b.city && a.city !== b.city;
  // Shared niche beats related; a different city adds reach; closer size breaks ties.
  const score = (shared.length ? 2 : 1) + (differentCity ? 1 : 0) - Math.log(ratio) / Math.log(MAX_SIZE_RATIO);
  return { score, pair: { a, b, shared, related, sameCity, differentCity } };
}

/** Picks tonight's pairs: people with the fewest connections go first, each person at most once. */
export function pickJodiPairs(people: JodiCandidate[], rules: JodiRules): JodiPair[] {
  const pool = people
    .filter((p) => p.niches.length > 0 && p.followers > 0 && !rules.busy.has(p.id))
    .sort((x, y) => x.connections - y.connections || Date.parse(y.joined) - Date.parse(x.joined));
  const taken = new Set<string>();
  const pairs: JodiPair[] = [];
  for (const a of pool) {
    if (pairs.length >= rules.maxPairs) break;
    if (taken.has(a.id)) continue;
    let best: { score: number; pair: JodiPair } | null = null;
    for (const b of pool) {
      if (b.id === a.id || taken.has(b.id) || rules.avoid.has(pairKey(a.id, b.id))) continue;
      const f = fit(a, b);
      if (f && (!best || f.score > best.score)) best = f;
    }
    if (!best) continue;
    taken.add(a.id).add(best.pair.b.id);
    pairs.push(best.pair);
  }
  return pairs;
}

const label = (n: string) => NICHES.find(([k]) => k === n)?.[1].toLowerCase() ?? n;
const first = (name: string | null) => name?.trim().split(/\s+/)[0] || "there";
const join = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** The chat message `me` gets about `partner`. */
export function jodiMessage(pair: JodiPair, meId: string): string {
  const me = pair.a.id === meId ? pair.a : pair.b;
  const partner = me === pair.a ? pair.b : pair.a;
  const them = first(partner.name);
  const where = partner.cityName ? ` from ${partner.cityName}` : "";
  const niche = pair.shared.length
    ? `You're both into ${join(pair.shared.slice(0, 2).map(label))}`
    : `You do ${label(me.niches[0])} and ${them} does ${label(partner.niches.find((n) => me.niches.some((m) => relatedNiche(m, n))) ?? partner.niches[0])}, a great mix`;
  const city = pair.differentCity
    ? ", and your follower counts are close, but your audiences are in different cities."
    : pair.sameCity
      ? `, your follower counts are close, and you're both in ${partner.cityName ?? "the same city"}, so you can even shoot together.`
      : ", and your follower counts are close.";
  return `Hi ${first(me.name)}, Peerpop here 👋

Aapki collab Jodi mil gayi! Meet ${them}${where}. ${niche}${city}

Idea: one Instagram Collab reel together. Same reel shows on both profiles. Ek reel, do audience.

See ${them}'s profile and tap Connect: www.peerpop.in/${partner.handle}`;
}
