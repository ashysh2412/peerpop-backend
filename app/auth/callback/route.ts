import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/safe-next";
import { ensureProfile } from "@/lib/profile/ensure";
import { createClient } from "@/lib/supabase/server";

// Google sign-in and email magic links both land here with a one-time code.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Brand-new people get the quick profile screen once; they can skip it.
      const { created } = await ensureProfile(supabase, data.user);
      return NextResponse.redirect(`${origin}${created ? "/onboarding" : next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link`);
}
