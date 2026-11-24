import { CITIES, NICHES, labelFor } from "@/lib/catalog";
import type { Match } from "./data";

/**
 * The ready-made hello sent with "Say hi to your top 3 Jodi", in Hinglish like the rest of
 * Peerpop, built from why you were matched.
 */
export function jodiNote(myName: string, m: Pick<Match, "display_name" | "city_slug" | "why">) {
  const first = (s: string) => s.trim().split(/\s+/)[0] || s;
  const hi = `Hi ${first(m.display_name)}! I'm ${first(myName)}`;
  const niche = m.why.niches[0] ? labelFor(NICHES, m.why.niches[0]).toLowerCase() : null;
  const city = m.why.city && m.city_slug ? labelFor(CITIES, m.city_slug) : null;
  const about =
    niche && city
      ? `, a ${niche} creator from ${city} too.`
      : niche
        ? `, I also make ${niche} content.`
        : city
          ? `, also a creator in ${city}.`
          : m.why.size
            ? `, our audiences are a similar size.`
            : `, new on Peerpop.`;
  return `${hi}${about} Ek collab reel karein? Ek reel, do audience.`;
}
