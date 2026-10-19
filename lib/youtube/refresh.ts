import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { findChannel } from "./api";
import { recordStats, type Admin } from "./verify";

const UNITS_PER_ACCOUNT = 3;
const DEFAULT_BUDGET = 8000;
const CONCURRENCY = 5;
const BADGE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
export const MANUAL_REFRESH_MS = 6 * 60 * 60 * 1000;

type Account = { id: string; external_id: string; last_fetch_at: string | null };

/** Refreshes one verified channel. Drops the badge after 7 days without a successful fetch. */
export async function refreshAccount(admin: Admin, account: Account): Promise<boolean> {
  const channel = await findChannel({ by: "id", value: account.external_id }).catch(() => null);
  if (channel && (await recordStats(admin, account.id, channel))) return true;

  const lastOk = account.last_fetch_at ? Date.parse(account.last_fetch_at) : 0;
  const update: Record<string, unknown> = { last_fetch_error: channel ? "stats fetch failed" : "channel not found" };
  if (Date.now() - lastOk > BADGE_GRACE_MS) {
    update.source = "self_reported";
    update.ownership_verified_at = null;
  }
  await admin.from("platform_accounts").update(update).eq("id", account.id);
  return false;
}

/** The daily job: oldest-refreshed first, stopping before the quota budget runs out. */
export async function runDailyRefresh() {
  const admin = createAdminClient();
  const budget = Number(process.env.YOUTUBE_DAILY_UNIT_BUDGET) || DEFAULT_BUDGET;
  const today = new Date().toISOString().slice(0, 10);

  const { data: run } = await admin.from("job_runs").insert({ job: "refresh-youtube-stats" }).select("id").single();
  const { data: accounts, error } = await admin
    .from("platform_accounts")
    .select("id, external_id, last_fetch_at")
    .eq("platform", "youtube")
    .eq("source", "verified")
    .not("external_id", "is", null)
    .or(`last_fetch_at.is.null,last_fetch_at.lt.${today}`)
    .order("last_fetch_at", { ascending: true, nullsFirst: true })
    .limit(Math.floor(budget / UNITS_PER_ACCOUNT));
  if (error) throw error;

  let ok = 0;
  let failed = 0;
  const queue = [...((accounts ?? []) as Account[])];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        if (await refreshAccount(admin, next)) ok++;
        else failed++;
      }
    }),
  );

  const summary = { accounts_ok: ok, accounts_failed: failed, units_used: (ok + failed) * UNITS_PER_ACCOUNT };
  if (run) await admin.from("job_runs").update({ ...summary, finished_at: new Date().toISOString() }).eq("id", run.id);
  return summary;
}
