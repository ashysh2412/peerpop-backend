import "server-only";
import { NICHES } from "@/lib/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { findChannel } from "@/lib/youtube/api";
import { parseChannelUrl } from "@/lib/youtube/channel-url";

/** The two things Auto Jodi needs: a niche and a follower count. */
export type JodiBasics = { niches: string[]; followers: number | null; youtube: string | null; instagram: string | null };

const NICHE_KEYS = new Set<string>(NICHES.map(([k]) => k));

/** Reads "12000", "12K", "1.2L" or "1.5M" as a number. */
export function parseFollowers(raw: string): number | null | "invalid" {
  const s = raw.trim().replace(/,/g, "").toLowerCase();
  if (!s) return null;
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(k|l|lakh|m)?$/);
  if (!m) return "invalid";
  const mult = m[2] === "k" ? 1e3 : m[2] === "l" || m[2] === "lakh" ? 1e5 : m[2] === "m" ? 1e6 : 1;
  const n = Math.round(Number(m[1]) * mult);
  return n > 0 && n <= 1e9 ? n : "invalid";
}

/** Checks the quick form. Needs at least one niche, and a follower count or a YouTube link. */
export function readBasics(form: FormData): { ok: true; data: JodiBasics } | { ok: false; message: string } {
  const niches = [...new Set(form.getAll("niches").map(String).filter((n) => NICHE_KEYS.has(n)))].slice(0, 3);
  if (!niches.length) return { ok: false, message: "Pick your niche." };
  const followers = parseFollowers(String(form.get("followers") ?? ""));
  if (followers === "invalid") return { ok: false, message: "Enter followers as a number, like 12000 or 12K." };
  const youtube = String(form.get("youtube") ?? "").trim() || null;
  const instagram =
    String(form.get("instagram") ?? "")
      .trim()
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/^@/, "")
      .replace(/\/.*$/, "") || null;
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) return { ok: false, message: "Enter your Instagram username, like @yourname." };
  if (followers === null && !youtube) return { ok: false, message: "Add your Instagram followers or your YouTube link." };
  return { ok: true, data: { niches, followers, youtube, instagram } };
}

/**
 * Saves a member's niche and follower count. A YouTube link fetches the subscriber count from
 * YouTube. Verified accounts are never touched. Returns an error message, or null when saved.
 */
export async function saveBasics(userId: string, b: JodiBasics): Promise<string | null> {
  const db = createAdminClient();
  const { error } = await db.from("creator_profiles").update({ niches: b.niches }).eq("user_id", userId);
  if (error) return "Couldn't save your niche. Please try again.";
  const { data: rows } = await db.from("platform_accounts").select("id, platform, source").eq("user_id", userId);
  const existing = new Map((rows ?? []).map((r) => [r.platform as string, r]));

  if (b.youtube) {
    const ref = parseChannelUrl(b.youtube);
    if (!ref) return "Paste your channel link, like youtube.com/@yourname.";
    const channel = await findChannel(ref).catch(() => null);
    if (!channel) return "We couldn't find that YouTube channel. Check the link.";
    const yt = existing.get("youtube");
    if (yt?.source !== "verified") {
      const fields = {
        url: `https://www.youtube.com/${channel.handle ?? `channel/${channel.id}`}`,
        handle: channel.handle,
        self_followers: channel.subscribers,
      };
      const { error: ytError } = yt
        ? await db.from("platform_accounts").update(fields).eq("id", yt.id)
        : await db.from("platform_accounts").insert({ user_id: userId, platform: "youtube", ...fields });
      if (ytError) return "Couldn't save your YouTube channel. Please try again.";
    }
  }

  if (b.followers !== null) {
    const ig = existing.get("instagram");
    if (ig?.source !== "verified") {
      const fields = {
        self_followers: b.followers,
        ...(b.instagram ? { handle: `@${b.instagram}`, url: `https://www.instagram.com/${b.instagram}/` } : {}),
      };
      const { error: igError } = ig
        ? await db.from("platform_accounts").update(fields).eq("id", ig.id)
        : await db.from("platform_accounts").insert({ user_id: userId, platform: "instagram", ...fields });
      if (igError) return "Couldn't save your followers. Please try again.";
    }
  }
  return null;
}
