import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { RESERVED_HANDLES } from "@/lib/profile/handle";
import { supabaseEnv } from "./env";

// Routes that need a signed-in user. Everything else is public.
const PROTECTED_PREFIXES = ["/home", "/onboarding", "/settings", "/network", "/notifications", "/messages", "/groups"];

export async function updateSession(request: NextRequest) {
  // Short profile links for Instagram bios: /riyasharma → /creators/riyasharma.
  const short = request.nextUrl.pathname.match(/^\/([a-z0-9_]{3,30})\/?$/i);
  if (short && !RESERVED_HANDLES.has(short[1].toLowerCase())) {
    return NextResponse.redirect(new URL(`/creators/${short[1].toLowerCase()}`, request.url));
  }

  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refreshes the auth token if it has expired. Do not remove.
  // getClaims checks the session token locally (and refreshes it when it has expired) instead of asking Supabase Auth every time.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ? data.claims : null;

  const path = request.nextUrl.pathname;
  if (!user && PROTECTED_PREFIXES.some((p) => path.startsWith(p))) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(loginUrl);
  }

  if (user && path === "/") {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return response;
}
