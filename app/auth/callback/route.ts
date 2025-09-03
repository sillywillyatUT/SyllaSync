// in app/auth/callback/route.ts

import { createClient } from "../../../supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirect_to = requestUrl.searchParams.get("redirect_to");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user && data.session) {
      // ... (all your database logic for saving tokens remains the same) ...

      // --- START OF FIX ---

      // Use the reliable environment variable for the site's origin.
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (!siteUrl) {
        throw new Error("Missing NEXT_PUBLIC_SITE_URL environment variable");
      }
      
      const redirectTo = redirect_to || "/upload";
      // Construct the final redirect URL using the guaranteed production URL.
      const redirectUrl = new URL(redirectTo, siteUrl);

      // --- END OF FIX ---

      return NextResponse.redirect(redirectUrl);
    }
  }

  // Handle errors or no-code scenarios
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  const errorUrl = new URL("/sign-in?error=Authentication failed", siteUrl);
  return NextResponse.redirect(errorUrl);
}