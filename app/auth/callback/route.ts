import { createClient } from "../../../supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirect_to = requestUrl.searchParams.get("redirect_to");
  const error = requestUrl.searchParams.get("error");
  const error_description = requestUrl.searchParams.get("error_description");

  // Check for OAuth errors first
  if (error) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent(error_description || error)}`, requestUrl.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/sign-in?error=No authorization code", requestUrl.origin),
    );
  }

  const supabase = await createClient();

  try {
    // Exchange code for session (don't clear session first - this breaks PKCE!)
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(
        new URL(
          `/sign-in?error=${encodeURIComponent(exchangeError.message)}`,
          requestUrl.origin,
        ),
      );
    }

    if (!data.user || !data.session) {
      return NextResponse.redirect(
        new URL("/sign-in?error=Authentication failed", requestUrl.origin),
      );
    }

    // Extract tokens
    const providerToken = data.session.provider_token;
    const refreshToken = data.session.provider_refresh_token;

    if (!providerToken) {
      return NextResponse.redirect(
        new URL("/sign-in?error=Missing Google permissions", requestUrl.origin),
      );
    }

    try {
      // Check if user exists
      const { data: existingUser, error: selectError } = await supabase
        .from("users")
        .select("id, user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (selectError && selectError.code !== "PGRST116") {
        throw selectError;
      }

      if (!existingUser) {
        const userRecord = {
          user_id: data.user.id,
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
        };

        const { error: insertError } = await supabase.from("users").insert(userRecord);

        if (insertError) {
          throw insertError;
        }
      } else {
        const updateData = {
          google_access_token: providerToken,
          google_refresh_token: refreshToken,
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
        };

        const { error: updateError } = await supabase
          .from("users")
          .update(updateData)
          .eq("user_id", data.user.id);

        if (updateError) {
          throw updateError;
        }
      }
    } catch (dbError) {
      // Don't redirect to error page for DB errors, as auth succeeded
      // The user can still use the app, just tokens might not be stored
    }

    // Successful authentication - redirect to destination
    const redirectTo = redirect_to || "/upload";
    const redirectUrl = new URL(redirectTo, requestUrl.origin);

    // Create response and let Supabase handle session cookies automatically
    const response = NextResponse.redirect(redirectUrl);

    return response;
    
  } catch (authError) {
    return NextResponse.redirect(
      new URL(
        `/sign-in?error=${encodeURIComponent("Authentication failed")}`,
        requestUrl.origin,
      ),
    );
  }
}