import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/safe-next";
import { ensureProfile } from "@/lib/profile/ensure";
import { createClient } from "@/lib/supabase/server";

// Google's own sign-in button signs people in on the page; this sets up their profile and sends them on.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?error=link`);
  const { created } = await ensureProfile(supabase, user);
  return NextResponse.redirect(`${origin}${created ? "/home?welcome=1" : next}`);
}
