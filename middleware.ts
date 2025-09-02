import { updateSession } from "./supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;
  
  console.log(`[MIDDLEWARE] Processing request: ${pathname}`);
  console.log(`[MIDDLEWARE] Search params:`, Object.fromEntries(searchParams.entries()));
  console.log(`[MIDDLEWARE] Request URL:`, request.url);

  // Skip auth processing entirely for auth callback to prevent interference
  if (pathname.startsWith("/auth/callback")) {
    console.log(`[MIDDLEWARE] Skipping auth callback processing for: ${pathname}`);
    return NextResponse.next();
  }

  // Skip middleware processing for static assets and API routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') && !pathname.endsWith('/') // Skip files with extensions
  ) {
    console.log(`[MIDDLEWARE] Skipping static/API route: ${pathname}`);
    return NextResponse.next();
  }

  console.log(`[MIDDLEWARE] Processing auth session update for: ${pathname}`);

  try {
    // Handle authentication session update for other routes
    const response = await updateSession(request);
    console.log(`[MIDDLEWARE] Session update completed for: ${pathname}`);

    // Add protection for upload page - only allow authenticated users
    if (pathname === "/upload") {
      console.log(`[MIDDLEWARE] Checking auth for upload page`);
      
      try {
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() {
                const cookies = request.cookies.getAll().map(({ name, value }) => ({
                  name,
                  value,
                }));
                console.log(`[MIDDLEWARE] Retrieved cookies:`, cookies.map(c => c.name));
                return cookies;
              },
              setAll(cookiesToSet) {
                console.log(`[MIDDLEWARE] Setting cookies:`, cookiesToSet.map(c => c.name));
                cookiesToSet.forEach(({ name, value, options }) => {
                  request.cookies.set(name, value);
                  response.cookies.set(name, value, options);
                });
              },
            },
          },
        );

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        console.log(`[MIDDLEWARE] Auth check result - User:`, user ? `${user.email} (${user.id})` : 'null');
        console.log(`[MIDDLEWARE] Auth check result - Error:`, error?.message || 'none');

        if (error || !user) {
          console.log(`[MIDDLEWARE] Redirecting to sign-in from upload page`);
          console.log(`[MIDDLEWARE] Redirect reason:`, error ? `Error: ${error.message}` : 'No user found');
          return NextResponse.redirect(new URL("/sign-in", request.url));
        }

        console.log(`[MIDDLEWARE] Auth check passed for upload page`);
      } catch (authError) {
        console.error("[MIDDLEWARE] Auth check error:", authError);
        console.log(`[MIDDLEWARE] Redirecting to sign-in due to auth check error`);
        return NextResponse.redirect(new URL("/sign-in", request.url));
      }
    }

    // Check if we're on the sign-in page and user is already authenticated
    if (pathname === "/sign-in") {
      console.log(`[MIDDLEWARE] Checking if user is already authenticated on sign-in page`);
      
      try {
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() {
                return request.cookies.getAll().map(({ name, value }) => ({
                  name,
                  value,
                }));
              },
              setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                  response.cookies.set(name, value, options);
                });
              },
            },
          },
        );

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (user && !error) {
          console.log(`[MIDDLEWARE] User already authenticated on sign-in page, redirecting to upload`);
          console.log(`[MIDDLEWARE] Authenticated user:`, user.email);
          return NextResponse.redirect(new URL("/upload", request.url));
        }
      } catch (authError) {
        console.log(`[MIDDLEWARE] Auth check on sign-in page failed:`, authError);
        // Continue to sign-in page
      }
    }

    console.log(`[MIDDLEWARE] Completed processing for: ${pathname}`);
    return response;

  } catch (middlewareError) {
    console.error("[MIDDLEWARE] Middleware error:", middlewareError);
    console.log(`[MIDDLEWARE] Continuing with next() due to middleware error`);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};