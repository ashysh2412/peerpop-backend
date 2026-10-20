import { CITIES, LANGUAGES, NICHES, SKILLS, type Language, type Niche, type Skill } from "@/lib/catalog";

export const PAGE_SIZE = 24;

export const FOLLOWER_BUCKETS = [
  ["lt10k", "Under 10K", null, 10_000],
  ["10k-50k", "10K–50K", 10_000, 50_000],
  ["50k-200k", "50K–200K", 50_000, 200_000],
  ["200k", "200K+", 200_000, null],
] as const;

export type SearchFilters = {
  city: string | null;
  niches: Niche[];
  skills: Skill[];
  langs: Language[];
  followers: (typeof FOLLOWER_BUCKETS)[number][0] | null;
  collab: boolean;
  verified: boolean;
  sort: "audience" | "views";
  page: number;
};

type Query = Record<string, string | string[] | undefined>;

/** Accepts both ?niche=a,b and ?niche=a&niche=b, keeping only known values. */
function list<T extends string>(raw: Query[string], allowed: readonly (readonly [T, string])[]): T[] {
  const values = (Array.isArray(raw) ? raw : raw ? [raw] : []).flatMap((v) => v.split(","));
  return allowed.map(([v]) => v).filter((v) => values.includes(v));
}

function one(raw: Query[string]) {
  return (Array.isArray(raw) ? raw[0] : raw) ?? null;
}

export function parseFilters(query: Query): SearchFilters {
  const city = one(query.city);
  const followers = one(query.followers);
  const page = Number(one(query.page));
  return {
    city: CITIES.some(([c]) => c === city) ? city : null,
    niches: list(query.niche, NICHES),
    skills: list(query.skill, SKILLS),
    langs: list(query.lang, LANGUAGES),
    followers: FOLLOWER_BUCKETS.find(([b]) => b === followers)?.[0] ?? null,
    collab: one(query.collab) === "1",
    verified: one(query.verified) === "1",
    sort: one(query.sort) === "views" ? "views" : "audience",
    page: Number.isInteger(page) && page > 1 ? Math.min(page, 1000) : 1,
  };
}

/** Arguments for the search_creators database function. */
export function toRpcArgs(f: SearchFilters) {
  const bucket = FOLLOWER_BUCKETS.find(([b]) => b === f.followers);
  return {
    p_city: f.city,
    p_niches: f.niches.length ? f.niches : null,
    p_skills: f.skills.length ? f.skills : null,
    p_langs: f.langs.length ? f.langs : null,
    p_min: bucket?.[2] ?? null,
    p_max: bucket?.[3] ?? null,
    p_collab: f.collab,
    p_verified_only: f.verified,
    p_sort: f.sort,
    p_limit: PAGE_SIZE,
    p_offset: (f.page - 1) * PAGE_SIZE,
  };
}

/** The shareable query string for a set of filters, e.g. for pagination links. */
export function toQueryString(f: SearchFilters, overrides: Partial<SearchFilters> = {}) {
  const v = { ...f, ...overrides };
  const q = new URLSearchParams();
  if (v.city) q.set("city", v.city);
  if (v.niches.length) q.set("niche", v.niches.join(","));
  if (v.skills.length) q.set("skill", v.skills.join(","));
  if (v.langs.length) q.set("lang", v.langs.join(","));
  if (v.followers) q.set("followers", v.followers);
  if (v.collab) q.set("collab", "1");
  if (v.verified) q.set("verified", "1");
  if (v.sort !== "audience") q.set("sort", v.sort);
  if (v.page > 1) q.set("page", String(v.page));
  const s = q.toString();
  return s ? `?${s}` : "";
}
