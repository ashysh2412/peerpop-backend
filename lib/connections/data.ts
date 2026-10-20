import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Contacts, Profile } from "@/lib/profile/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type ConnectionRow = {
  id: string;
  from_user: string;
  to_user: string;
  message: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  responded_at: string | null;
};

/** How the signed-in user relates to another creator, from their side. */
export type ConnectionState =
  | { kind: "none" }
  | { kind: "sent"; id: string }
  | { kind: "received"; id: string; message: string | null }
  | { kind: "connected"; id: string }
  | { kind: "declined"; id: string; canRetry: boolean };

const COLUMNS = "id, from_user, to_user, message, status, created_at, responded_at";
const RETRY_DAYS = 30;

export function stateFor(me: string, row: ConnectionRow | null, now = Date.now()): ConnectionState {
  if (!row) return { kind: "none" };
  if (row.status === "accepted") return { kind: "connected", id: row.id };
  if (row.status === "pending") {
    return row.from_user === me ? { kind: "sent", id: row.id } : { kind: "received", id: row.id, message: row.message };
  }
  // Declined: the person who declined can still reach out; the sender waits 30 days.
  if (row.to_user === me) return { kind: "none" };
  const declinedAt = row.responded_at ? Date.parse(row.responded_at) : now;
  return { kind: "declined", id: row.id, canRetry: now - declinedAt >= RETRY_DAYS * 86400000 };
}

export async function getConnection(supabase: Client, me: string, other: string) {
  const { data } = await supabase
    .from("connections")
    .select(COLUMNS)
    .or(`and(from_user.eq.${me},to_user.eq.${other}),and(from_user.eq.${other},to_user.eq.${me})`)
    .maybeSingle();
  return (data as ConnectionRow | null) ?? null;
}

export async function getContactFor(supabase: Client, other: string) {
  const { data } = await supabase.rpc("get_contact", { other });
  const row = (data as Contacts[] | null)?.[0];
  return row && (row.contact_email || row.contact_whatsapp || row.contact_note) ? row : null;
}

export async function getMutualCount(supabase: Client, other: string) {
  const { data } = await supabase.rpc("mutual_connections", { other });
  return (data as string[] | null)?.length ?? 0;
}

type CardProfile = Pick<Profile, "user_id" | "handle" | "display_name" | "photo_path" | "city_slug" | "niches">;

/** All of the signed-in user's connections and requests, with the other person's profile. */
export async function getNetwork(supabase: Client, me: string) {
  const { data } = await supabase
    .from("connections")
    .select(COLUMNS)
    .or(`from_user.eq.${me},to_user.eq.${me}`)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as ConnectionRow[];
  const otherIds = [...new Set(rows.map((r) => (r.from_user === me ? r.to_user : r.from_user)))];
  const { data: profiles } = otherIds.length
    ? await supabase
        .from("creator_profiles")
        .select("user_id, handle, display_name, photo_path, city_slug, niches")
        .in("user_id", otherIds)
    : { data: [] };
  const byId = new Map(((profiles ?? []) as CardProfile[]).map((p) => [p.user_id, p]));
  // Profiles that are hidden or blocked don't come back, so those rows drop out.
  const withProfile = rows.flatMap((r) => {
    const profile = byId.get(r.from_user === me ? r.to_user : r.from_user);
    return profile ? [{ ...r, profile }] : [];
  });
  return {
    connections: withProfile.filter((r) => r.status === "accepted"),
    received: withProfile.filter((r) => r.status === "pending" && r.to_user === me),
    sent: withProfile.filter((r) => r.status === "pending" && r.from_user === me),
  };
}

export async function countReceived(supabase: Client, me: string) {
  const { count } = await supabase
    .from("connections")
    .select("id", { count: "exact", head: true })
    .eq("to_user", me)
    .eq("status", "pending");
  return count ?? 0;
}
