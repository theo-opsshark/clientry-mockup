import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session (important for token rotation)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const authEnabled = process.env.AUTH_ENABLED === "true";
  const pathname = request.nextUrl.pathname;
  const isPortalRoute = pathname.startsWith("/portal");
  const isWelcomePage = pathname === "/welcome";

  if (authEnabled) {
    // Protect /portal/* and /welcome routes — redirect to login if not authenticated
    if ((isPortalRoute || isWelcomePage) && !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // If authenticated user hits login page, redirect to portal
    if (pathname === "/" && user) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal";
      return NextResponse.redirect(url);
    }

    // First-login gate: check if user has set their name
    if ((isPortalRoute || isWelcomePage) && user?.email) {
      const service = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: portalUser } = await service
        .from("portal_users")
        .select("first_name")
        .eq("email", user.email.toLowerCase())
        .single();

      // No name set → redirect to welcome (unless already there)
      if (portalUser && !portalUser.first_name && !isWelcomePage) {
        const url = request.nextUrl.clone();
        url.pathname = "/welcome";
        return NextResponse.redirect(url);
      }

      // Name is set but on welcome page → redirect to portal
      if (portalUser?.first_name && isWelcomePage) {
        const url = request.nextUrl.clone();
        url.pathname = "/portal";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all routes except static files and API routes
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
