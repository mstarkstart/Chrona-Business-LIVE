import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Auth-protected app surface (route groups don't appear in URL paths).
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/tasks",
  "/calendar",
  "/organisation",
  "/approvals",
  "/settings",
  "/docs",
  "/inbox",
  "/projects",
  "/chat",
  "/timesheets",
  "/rewards",
];

const AUTH_PAGES = new Set(["/login"]);

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Skip auth checks when Supabase env is absent (early local dev).
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: do not insert logic between createServerClient and getUser.
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(p + "/")
  );
  const isAuthPage = AUTH_PAGES.has(path);

  if (!user && isProtected) {
    const dest = request.nextUrl.clone();
    dest.pathname = "/login";
    dest.searchParams.set("next", path);
    // Copy any refreshed session cookies so they aren't lost on redirect
    const redirectRes = NextResponse.redirect(dest);
    response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
    return redirectRes;
  }

  // Don't force-redirect authenticated users away from /login.
  // The login page itself handles "already logged in" cases — this lets
  // users switch accounts without getting stuck in a signup loop when
  // their stored session belongs to an account with no business memberships.

  return response;
}

export const config = {
  matcher: [
    // Run on every path except Next internals, static assets, and auth/callback
    // (which sets its own cookies and shouldn't be wrapped).
    "/((?!_next/static|_next/image|favicon\\.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
