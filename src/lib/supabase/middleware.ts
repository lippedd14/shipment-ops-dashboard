import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { checkUser } from "@/lib/supabase/auth";
import type { Database } from "@/lib/database.types";

/** Routes that require an authenticated user. */
const PROTECTED_PREFIXES = ["/dashboard"];

/** Routes that an authenticated user has no reason to see. */
const AUTH_PREFIXES = ["/login", "/signup"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Refreshes the auth session and redirects based on it.
 *
 * The response object must be the one carrying the refreshed cookies, so a
 * redirect has to copy them over rather than start from a blank response.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // checkUser() revalidates the token with Supabase. Do not swap it for
  // getSession(), which trusts the cookie without verifying it.
  const auth = await checkUser(supabase);

  const { pathname } = request.nextUrl;

  // Could not reach the auth server: leave the request alone rather than
  // signing the user out over a network blip. The page still resolves the user
  // itself, and RLS keeps the data protected either way.
  if (auth.status === "unavailable") {
    return supabaseResponse;
  }

  const user = auth.status === "authenticated" ? auth.user : null;

  if (!user && matches(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return redirectPreservingCookies(url, supabaseResponse);
  }

  if (user && matches(pathname, AUTH_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return redirectPreservingCookies(url, supabaseResponse);
  }

  return supabaseResponse;
}

function redirectPreservingCookies(url: URL, source: NextResponse) {
  const response = NextResponse.redirect(url);
  source.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie);
  });
  return response;
}
