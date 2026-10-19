import type { Language, Niche, Skill } from "@/lib/catalog";

export type Profile = {
  user_id: string;
  handle: string;
  display_name: string;
  photo_path: string | null;
  bio: string | null;
  city_slug: string | null;
  niches: Niche[];
  skills: Skill[];
  languages: Language[];
  open_to_collab: boolean;
  is_listed: boolean;
};

export type PlatformAccount = {
  id: string;
  user_id: string;
  platform: "youtube" | "instagram";
  handle: string | null;
  url: string | null;
  source: "verified" | "self_reported";
  self_followers: number | null;
  self_avg_views: number | null;
  self_updated_at: string | null;
};

export type ProfileVideo = {
  id: string;
  platform: "youtube" | "instagram";
  url: string;
  external_id: string;
  title: string | null;
  thumbnail_url: string | null;
  position: number;
};

export type Contacts = {
  contact_email: string | null;
  contact_whatsapp: string | null;
  contact_note: string | null;
};

// Shape returned by every form action: field errors, or a success message.
export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
};
