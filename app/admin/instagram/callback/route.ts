import { cookies } from "next/headers";
import { isConfirmedAdmin } from "@/lib/admin/access";
import { exchangeCode, igAppConfig } from "@/lib/instagram/api";
import { saveAccount } from "@/lib/instagram/queue";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Instagram sends the admin back here after they allow (or cancel) posting.
export async function GET(request: Request) {
  if (!(await isConfirmedAdmin(await createClient()))) return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const back = (note: string) => Response.redirect(`${url.origin}/admin/instagram?note=${note}`, 303);
  const jar = await cookies();
  const expected = jar.get("ig_state")?.value;
  jar.delete({ name: "ig_state", path: "/admin/instagram" });
  const code = url.searchParams.get("code");
  const app = igAppConfig();
  if (!app || !code || !expected || url.searchParams.get("state") !== expected) return back("connect-failed");
  try {
    const account = await exchangeCode(code, `${url.origin}/admin/instagram/callback`, app);
    await saveAccount(createAdminClient(), account, Date.now());
    return back("connected");
  } catch (err) {
    console.error("instagram connect", err instanceof Error ? err.message : err);
    return back("connect-failed");
  }
}
