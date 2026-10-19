// Option lists shared by forms, filters and the database enums.

export const NICHES = [
  ["food", "Food"],
  ["fitness", "Fitness"],
  ["comedy", "Comedy"],
  ["tech", "Tech"],
  ["fashion", "Fashion"],
  ["beauty", "Beauty"],
  ["travel", "Travel"],
  ["education", "Education"],
  ["finance", "Finance"],
  ["gaming", "Gaming"],
  ["music", "Music"],
  ["lifestyle", "Lifestyle"],
  ["other", "Other"],
] as const;

export const SKILLS = [
  ["editor", "Editor"],
  ["anchor", "Anchor"],
  ["scriptwriter", "Scriptwriter"],
  ["videographer", "Videographer"],
  ["photographer", "Photographer"],
  ["voiceover", "Voiceover"],
] as const;

export const LANGUAGES = [
  ["marathi", "Marathi"],
  ["hindi", "Hindi"],
  ["english", "English"],
] as const;

export const CITIES = [["pune", "Pune"]] as const;

export type Niche = (typeof NICHES)[number][0];
export type Skill = (typeof SKILLS)[number][0];
export type Language = (typeof LANGUAGES)[number][0];

export function labelFor(list: readonly (readonly [string, string])[], value: string) {
  return list.find(([v]) => v === value)?.[1] ?? value;
}
