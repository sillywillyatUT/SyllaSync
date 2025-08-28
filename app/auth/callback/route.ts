import { createClient } from "../../../supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirect_to = requestUrl.searchParams.get("redirect_to");

  if (!code) {
    console.error("No authorization code received");
    return NextResponse.redirect(
      new URL("/sign-in?error=No authorization code", requestUrl.origin),
    );
  }

  const supabase = await createClient();

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback error:", error);
      return NextResponse.redirect(
        new URL(
          `/sign-in?error=${encodeURIComponent(error.message)}`,
          requestUrl.origin,
        ),
      );
    }

    if (!data.user || !data.session) {
      console.error("No user or session data received");
      return NextResponse.redirect(
        new URL("/sign-in?error=Authentication failed", requestUrl.origin),
      );
    }

    // Extract tokens
    const providerToken = data.session.provider_token;
    const refreshToken = data.session.provider_refresh_token; // Note: provider_refresh_token, not refresh_token

    if (!providerToken) {
      console.error("No Google access token received");
      return NextResponse.redirect(
        new URL("/sign-in?error=Missing Google permissions", requestUrl.origin),
      );
    }

    try {
      // Check if user exists
      const { data: existingUser, error: selectError } = await supabase
        .from("users")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no user found

      if (selectError && selectError.code !== "PGRST116") {
        // PGRST116 is "no rows returned"
        throw selectError;
      }

      if (!existingUser) {
        // Create new user
        const { error: insertError } = await supabase.from("users").insert({
          user_id: data.user.id, // Remove duplicate id field
          name:
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            data.user.email?.split("@")[0] ||
            "",
          full_name:
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            "",
          email: data.user.email || "",
          token_identifier: data.user.id,
          avatar_url: data.user.user_metadata?.avatar_url,
          google_access_token: providerToken,
          google_refresh_token: refreshToken,
          created_at: new Date().toISOString(),
        });

        if (insertError) {
          throw insertError;
        }
      } else {
        // Update existing user with new tokens
        const { error: updateError } = await supabase
          .from("users")
          .update({
            google_access_token: providerToken,
            google_refresh_token: refreshToken,
            // Update other fields that might have changed
            name:
              data.user.user_metadata?.full_name ||
              data.user.user_metadata?.name ||
              data.user.email?.split("@")[0] ||
              "",
            full_name:
              data.user.user_metadata?.full_name ||
              data.user.user_metadata?.name ||
              "",
            avatar_url: data.user.user_metadata?.avatar_url,
          })
          .eq("user_id", data.user.id);

        if (updateError) {
          throw updateError;
        }
      }

      console.log("User data updated successfully");
    } catch (dbError) {
      console.error("Database error:", dbError);
      // Don't redirect to error page for DB errors, as auth succeeded
      // The user can still use the app, just tokens might not be stored
    }

    // Successful authentication
    const redirectTo = redirect_to || "/upload";
    const redirectUrl = new URL(redirectTo, requestUrl.origin);

    return NextResponse.redirect(redirectUrl);
  } catch (authError) {
    console.error("Authentication error:", authError);
    return NextResponse.redirect(
      new URL(
        `/sign-in?error=${encodeURIComponent("Authentication failed")}`,
        requestUrl.origin,
      ),
    );
  }
}
