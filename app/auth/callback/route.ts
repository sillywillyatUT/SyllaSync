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
      const providerToken = data.session.provider_token;
      const refreshToken = data.session.refresh_token;

      // Check if user exists in users table
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("id", data.user.id)
        .single();

      if (!existingUser) {
        // Create user in users table
        await supabase.from("users").insert({
          id: data.user.id,
          name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "",
          full_name: data.user.user_metadata?.full_name || "",
          email: data.user.email || "",
          user_id: data.user.id,
          token_identifier: data.user.id,
          google_access_token: providerToken,
          google_refresh_token: refreshToken,
          created_at: new Date().toISOString(),
        });
      } else {
        // Update tokens if user exists
        await supabase.from("users").update({
          google_access_token: providerToken,
          google_refresh_token: refreshToken,
        }).eq("id", data.user.id);
      }
    }
  }

  const redirectTo = redirect_to || "/upload";
  const redirectUrl = new URL(redirectTo, requestUrl.origin);
  redirectUrl.search = ""; // prevent query loops
  return NextResponse.redirect(redirectUrl);
}
