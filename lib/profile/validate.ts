import { CITIES, LANGUAGES, NICHES, SKILLS } from "@/lib/catalog";
import type { Contacts, Profile } from "./types";

type Result<T> = { ok: true; data: T } | { ok: false; errors: Record<string, string> };

export type ProfileInput = Omit<Profile, "user_id" | "photo_path">;

const HANDLE_RE = /^[a-z0-9_]{3,30}$/;

function str(form: FormData, key: string) {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function pick<T extends string>(form: FormData, key: string, allowed: readonly (readonly [T, string])[]) {
  const values = new Set(allowed.map(([v]) => v));
  return [...new Set(form.getAll(key).filter((v): v is T => typeof v === "string" && values.has(v as T)))];
}

export function normalizeHandle(raw: string) {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

export function validateProfile(form: FormData, { nichesOptional = false } = {}): Result<ProfileInput> {
  const errors: Record<string, string> = {};
  const handle = normalizeHandle(str(form, "handle"));
  const display_name = str(form, "display_name");
  const bio = str(form, "bio");
  const city = str(form, "city_slug");

  if (!HANDLE_RE.test(handle)) {
    errors.handle = "Use 3 to 30 lowercase letters, numbers or underscores.";
  }
  if (!display_name) errors.display_name = "Enter your name.";
  else if (display_name.length > 80) errors.display_name = "Keep your name under 80 characters.";
  if (bio.length > 500) errors.bio = "Keep your bio under 500 characters.";
  if (city && !CITIES.some(([c]) => c === city)) errors.city_slug = "Pick a city from the list.";

  const niches = pick(form, "niches", NICHES);
  if (niches.length === 0 && !nichesOptional) errors.niches = "Pick at least one niche.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      handle,
      display_name,
      bio: bio || null,
      city_slug: city || null,
      niches,
      skills: pick(form, "skills", SKILLS),
      languages: pick(form, "languages", LANGUAGES),
      open_to_collab: form.get("open_to_collab") === "on",
      // Settings sends a hidden "off" plus "on" when ticked; onboarding sends neither.
      is_listed: form.has("is_listed") ? form.getAll("is_listed").includes("on") : true,
    },
  };
}

export type LinksInput = {
  youtube_url: string | null;
  instagram_handle: string | null;
  instagram_followers: number | null;
  instagram_avg_views: number | null;
};

const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

function parseCount(raw: string): number | null | "invalid" {
  if (!raw) return null;
  const cleaned = raw.replace(/[,\s]/g, "").toLowerCase();
  const m = cleaned.match(/^(\d+(?:\.\d+)?)([km])?$/);
  if (!m) return "invalid";
  const n = Math.round(parseFloat(m[1]) * (m[2] === "m" ? 1_000_000 : m[2] === "k" ? 1_000 : 1));
  return n <= 1_000_000_000 ? n : "invalid";
}

export function validateLinks(form: FormData): Result<LinksInput> {
  const errors: Record<string, string> = {};

  let youtube_url: string | null = str(form, "youtube_url") || null;
  if (youtube_url) {
    try {
      const u = new URL(youtube_url.startsWith("http") ? youtube_url : `https://${youtube_url}`);
      if (!YT_HOSTS.has(u.hostname) || u.pathname.length < 2) throw new Error();
      youtube_url = `https://www.youtube.com${u.pathname.replace(/\/$/, "")}`;
    } catch {
      errors.youtube_url = "Paste your channel link, like youtube.com/@yourname.";
    }
  }

  let instagram_handle: string | null = str(form, "instagram_handle") || null;
  if (instagram_handle) {
    instagram_handle = instagram_handle
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/^@/, "")
      .replace(/\/.*$/, "");
    if (!/^[A-Za-z0-9._]{1,30}$/.test(instagram_handle)) {
      errors.instagram_handle = "Enter your Instagram username, like @yourname.";
    }
  }

  const followers = parseCount(str(form, "instagram_followers"));
  const avgViews = parseCount(str(form, "instagram_avg_views"));
  if (followers === "invalid") errors.instagram_followers = "Enter a number, like 12000 or 12K.";
  if (avgViews === "invalid") errors.instagram_avg_views = "Enter a number, like 3500 or 3.5K.";
  if (instagram_handle && followers === null && !errors.instagram_followers) {
    errors.instagram_followers = "Enter your follower count.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      youtube_url,
      instagram_handle,
      instagram_followers: followers as number | null,
      instagram_avg_views: avgViews as number | null,
    },
  };
}

export function validateContacts(form: FormData): Result<Contacts> {
  const errors: Record<string, string> = {};
  const email = str(form, "contact_email");
  const whatsappRaw = str(form, "contact_whatsapp").replace(/[\s-]/g, "");
  const note = str(form, "contact_note");

  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.contact_email = "Enter a valid email.";

  let whatsapp = whatsappRaw;
  if (/^[6-9]\d{9}$/.test(whatsapp)) whatsapp = `+91${whatsapp}`; // Indian mobile without code
  if (whatsapp && !/^\+[1-9]\d{7,14}$/.test(whatsapp)) {
    errors.contact_whatsapp = "Enter a mobile number, like +91 98765 43210.";
  }
  if (note.length > 200) errors.contact_note = "Keep the note under 200 characters.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: { contact_email: email || null, contact_whatsapp: whatsapp || null, contact_note: note || null },
  };
}
