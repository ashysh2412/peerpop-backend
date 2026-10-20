import { CITIES, LANGUAGES, NICHES, SKILLS, type Language, type Niche, type Skill } from "@/lib/catalog";

export type CollabInput = {
  title: string;
  description: string;
  city_slug: string | null;
  niches: Niche[];
  roles_needed: Skill[];
  languages: Language[];
  shoot_date: string | null;
};

type Result = { ok: true; data: CollabInput } | { ok: false; errors: Record<string, string> };

function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function pick<T extends string>(form: FormData, key: string, allowed: readonly (readonly [T, string])[]) {
  const values = new Set(allowed.map(([v]) => v));
  return [...new Set(form.getAll(key).filter((v): v is T => typeof v === "string" && values.has(v as T)))];
}

/** `today` is YYYY-MM-DD, so a shoot date can't be in the past. */
export function validateCollab(form: FormData, today: string): Result {
  const errors: Record<string, string> = {};
  const title = str(form, "title");
  const description = str(form, "description");
  const city = str(form, "city_slug");
  const shoot = str(form, "shoot_date");

  if (title.length < 5) errors.title = "Give it a title of at least 5 characters.";
  else if (title.length > 120) errors.title = "Keep the title under 120 characters.";
  if (!description) errors.description = "Describe the collab.";
  else if (description.length > 1500) errors.description = "Keep it under 1,500 characters.";
  if (city && !CITIES.some(([c]) => c === city)) errors.city_slug = "Pick a city from the list.";
  const roles = pick(form, "roles_needed", SKILLS);
  if (roles.length === 0) errors.roles_needed = "Pick at least one role you need.";
  if (shoot && (!/^\d{4}-\d{2}-\d{2}$/.test(shoot) || Number.isNaN(Date.parse(shoot)))) {
    errors.shoot_date = "Pick a valid date.";
  } else if (shoot && shoot < today) errors.shoot_date = "Pick today or a later date.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      title,
      description,
      city_slug: city || null,
      niches: pick(form, "niches", NICHES),
      roles_needed: roles,
      languages: pick(form, "languages", LANGUAGES),
      shoot_date: shoot || null,
    },
  };
}
