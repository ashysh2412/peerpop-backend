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

export type JodiOffer = { to: JodiCandidate; options: JodiPair[] };

/**
 * Picks tonight's Jodi lists: each member gets up to `perPerson` partner options to choose from.
 * People with the fewest connections go first. Anyone with a niche and a follower count can be
 * an option, even if they got their own list recently, but nobody is shown more than
 * `maxShown` times a night, and the same two people are never suggested to each other twice.
 */
export function pickJodiOffers(people: JodiCandidate[], rules: JodiRules & { perPerson: number; maxShown: number }): JodiOffer[] {
  const pool = people.filter((p) => p.niches.length > 0 && p.followers > 0);
  const queue = pool
    .filter((p) => !rules.busy.has(p.id))
    .sort((x, y) => x.connections - y.connections || Date.parse(y.joined) - Date.parse(x.joined));
  const shown = new Map<string, number>();
  const told = new Set<string>();
  const offers: JodiOffer[] = [];
  for (const me of queue) {
    if (offers.length >= rules.maxPairs) break;
    const options = pool
      .filter((b) => b.id !== me.id && !rules.avoid.has(pairKey(me.id, b.id)) && !told.has(pairKey(me.id, b.id)) && (shown.get(b.id) ?? 0) < rules.maxShown)
      .map((b) => fit(me, b))
      .filter((f) => f !== null)
      .sort((x, y) => y.score - x.score)
      .slice(0, rules.perPerson)
      .map((f) => f.pair);
    if (!options.length) continue;
    for (const o of options) {
      shown.set(o.b.id, (shown.get(o.b.id) ?? 0) + 1);
      told.add(pairKey(me.id, o.b.id));
    }
    offers.push({ to: me, options });
  }
  return offers;
}

/**
 * A new member's first Jodis. With a niche and a follower count they get proper matches.
 * Otherwise use what they have: their niche, else their city, else anyone, smallest creators first
 * (new members are mostly small), different cities first when matching by niche.
 */
export function pickStarterJodis(me: JodiCandidate, pool: JodiCandidate[], avoid: Set<string>, count: number): JodiOffer | null {
  const others = pool.filter((b) => b.id !== me.id && b.niches.length > 0 && b.followers > 0 && !avoid.has(pairKey(me.id, b.id)));
  if (me.niches.length && me.followers > 0) {
    const options = others
      .map((b) => fit(me, b))
      .filter((f) => f !== null)
      .sort((x, y) => y.score - x.score)
      .slice(0, count)
      .map((f) => f.pair);
    if (options.length) return { to: me, options };
  }
  const loose = (b: JodiCandidate): JodiPair => {
    const shared = me.niches.filter((n) => n !== "other" && b.niches.includes(n));
    const related = !shared.length && me.niches.some((x) => b.niches.some((y) => relatedNiche(x, y)));
    const sameCity = !!me.city && me.city === b.city;
    return { a: me, b, shared, related, sameCity, differentCity: !!me.city && !!b.city && !sameCity };
  };
  const rank = (x: JodiPair) => (x.shared.length ? 4 : x.related ? 2 : 0) + (me.niches.length && x.differentCity ? 1 : 0);
  const all = others.map(loose);
  const isClose = (x: JodiPair) => x.shared.length > 0 || x.related || (!me.niches.length && x.sameCity);
  // Closest matches first (niche, else city), then the smallest active creators to fill the list.
  const options = all
    .sort((x, y) => Number(isClose(y)) - Number(isClose(x)) || rank(y) - rank(x) || x.b.followers - y.b.followers)
    .slice(0, count);
  return options.length ? { to: me, options } : null;
}

const label = (n: string) => (NICHES.find(([k]) => k === n)?.[1].toLowerCase() ?? n).replace(" tv", " TV");
const first = (name: string | null) => name?.trim().split(/\s+/)[0] || "there";

function compactCount(n: number) {
  if (n >= 100_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

/** One line per option: name, city, niche or size, then the tappable profile link. */
function optionList(options: JodiPair[], size: boolean) {
  const many = options.length > 1;
  return options
    .map((o, i) => {
      const where = o.b.cityName ? `, ${o.b.cityName}` : "";
      const extra = size ? compactCount(o.b.followers) : label((o.shared[0] ?? o.b.niches[0]) as string);
      return `${many ? `${i + 1}. ` : ""}${first(o.b.name)}${where} · ${extra}\nwww.peerpop.in/${o.b.handle}`;
    })
    .join("\n\n");
}

/** Why this option fits, in a few words. */
function why(pair: JodiPair) {
  const them = pair.b;
  const niche = pair.shared.length
    ? pair.shared.slice(0, 2).map(label).join(" and ")
    : label(them.niches.find((n) => pair.a.niches.some((m) => relatedNiche(m, n))) ?? them.niches[0]);
  return `${niche}, ${compactCount(them.followers)} followers`;
}

/** The chat message a member gets with their Jodi options. */
export function jodiOfferMessage(offer: JodiOffer): string {
  const many = offer.options.length > 1;
  const list = offer.options
    .map((o, i) => {
      const where = o.b.cityName ? `, ${o.b.cityName}` : "";
      return `${many ? `${i + 1}. ` : ""}${first(o.b.name)}${where} (${why(o)})\nwww.peerpop.in/${o.b.handle}`;
    })
    .join("\n\n");
  return `Hi ${first(offer.to.name)}, Peerpop here 👋

${many ? `Aapke liye ${offer.options.length} collab Jodis!` : "Aapke liye ek collab Jodi!"} Similar follower count, matching niche:

${list}

${many ? "Jitne pasand aaye, sabke profile kholo aur Connect tap karo." : "Profile kholo aur Connect tap karo."} One Instagram Collab reel with each, and both audiences see it. Collabs on Peerpop are free.

More Jodis anytime on your Home page: www.peerpop.in/home

– Team Peerpop
Ek reel. Do audience.`;
}

/** The first Jodi message a new member gets right after the welcome. */
export function starterJodiMessage(offer: JodiOffer): string {
  const ready = offer.to.niches.length > 0 && offer.to.followers > 0;
  return `${first(offer.to.name)}, ${offer.options.length > 1 ? "aapki pehli Jodis" : "aapki pehli Jodi"} 👇

${optionList(offer.options, ready)}

Profile kholo, Connect karo.${ready ? "" : " Better Jodis ke liye niche aur followers add karo."}

– Team Peerpop
Ek reel. Do audience.`;
}

/** Auto Jodi can only match someone who has a niche and a follower count. */
export function isMatchable(p: Pick<JodiCandidate, "niches" | "followers">) {
  return p.niches.length > 0 && p.followers > 0;
}

/** For members without a niche or follower count: their Jodis stay locked until they add them. */
export function lockedJodiMessage(name: string | null, waiting: number): string {
  return `${first(name)}, ${waiting} creators your size are waiting 🔒

Add your niche + followers to unlock your Jodis: www.peerpop.in/jodi/unlock

– Team Peerpop
Ek reel. Do audience.`;
}
