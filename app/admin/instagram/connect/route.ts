import { cookies } from "next/headers";
import { isConfirmedAdmin } from "@/lib/admin/access";
import { authorizeUrl, igAppConfig } from "@/lib/instagram/api";
import { createClient } from "@/lib/supabase/server";

// Sends the admin to Instagram to allow Peerpop to post to its account.
export async function GET(request: Request) {
  if (!(await isConfirmedAdmin(await createClient()))) return new Response("Not found", { status: 404 });
  const app = igAppConfig();
  const origin = new URL(request.url).origin;
  if (!app) return Response.redirect(`${origin}/admin/instagram?note=no-app`, 303);
  const state = crypto.randomUUID();
  (await cookies()).set("ig_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/admin/instagram", maxAge: 600 });
  return Response.redirect(authorizeUrl(app.appId, `${origin}/admin/instagram/callback`, state), 303);
}
