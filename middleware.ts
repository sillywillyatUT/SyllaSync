import React from "react";
import { updateSession } from "./supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "./supabase/server";

export async function middleware(request: NextRequest) {
  // Handle authentication session update
  const response = await updateSession(request);

  // Check if user is authenticated and visiting root path
  if (request.nextUrl.pathname === "/") {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Redirect authenticated users to upload page
        return NextResponse.redirect(new URL("/upload", request.url));
      }
    } catch (error) {
      // If there's an error checking auth, continue with normal flow
      console.error("Auth check error:", error);
    }
  }

  return response;
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
