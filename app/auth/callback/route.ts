import { createClient } from "../../../supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirect_to = requestUrl.searchParams.get("redirect_to");
  const error = requestUrl.searchParams.get("error");
  const error_description = requestUrl.searchParams.get("error_description");

  console.log(`[AUTH_CALLBACK] Starting auth callback process`);
  console.log(`[AUTH_CALLBACK] URL:`, requestUrl.toString());
  console.log(`[AUTH_CALLBACK] Code present:`, !!code);
  console.log(`[AUTH_CALLBACK] Redirect to:`, redirect_to);
  console.log(`[AUTH_CALLBACK] Error:`, error);
  console.log(`[AUTH_CALLBACK] Error description:`, error_description);
  console.log(`[AUTH_CALLBACK] All URL params:`, Object.fromEntries(requestUrl.searchParams.entries()));

  // Check for OAuth errors first
  if (error) {
    console.error(`[AUTH_CALLBACK] OAuth error received:`, error, error_description);
    return NextResponse.redirect(
      new URL(`/sign-in?error=${encodeURIComponent(error_description || error)}`, requestUrl.origin),
    );
  }

  if (!code) {
    console.error(`[AUTH_CALLBACK] No authorization code received`);
    return NextResponse.redirect(
      new URL("/sign-in?error=No authorization code", requestUrl.origin),
    );
  }

  const supabase = await createClient();
  console.log(`[AUTH_CALLBACK] Supabase client created`);

  try {
    // Exchange code for session (don't clear session first - this breaks PKCE!)
    console.log(`[AUTH_CALLBACK] Exchanging code for session`);
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error(`[AUTH_CALLBACK] Exchange error:`, exchangeError);
      return NextResponse.redirect(
        new URL(
          `/sign-in?error=${encodeURIComponent(exchangeError.message)}`,
          requestUrl.origin,
        ),
      );
    }

    if (!data.user || !data.session) {
      console.error(`[AUTH_CALLBACK] No user or session data received`);
      console.log(`[AUTH_CALLBACK] Data received:`, {
        user: !!data.user,
        session: !!data.session
      });
      return NextResponse.redirect(
        new URL("/sign-in?error=Authentication failed", requestUrl.origin),
      );
    }

    console.log(`[AUTH_CALLBACK] Authentication successful`);
    console.log(`[AUTH_CALLBACK] User:`, data.user.email);
    console.log(`[AUTH_CALLBACK] Session ID:`, data.session.access_token.substring(0, 20) + '...');

    // Extract tokens
    const providerToken = data.session.provider_token;
    const refreshToken = data.session.provider_refresh_token;

    console.log(`[AUTH_CALLBACK] Provider token present:`, !!providerToken);
    console.log(`[AUTH_CALLBACK] Refresh token present:`, !!refreshToken);

    if (!providerToken) {
      console.error(`[AUTH_CALLBACK] No Google access token received`);
      return NextResponse.redirect(
        new URL("/sign-in?error=Missing Google permissions", requestUrl.origin),
      );
    }

    try {
      console.log(`[AUTH_CALLBACK] Starting database operations`);
      
      // Check if user exists
      const { data: existingUser, error: selectError } = await supabase
        .from("users")
        .select("id, user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      console.log(`[AUTH_CALLBACK] User lookup result:`, {
        existingUser: !!existingUser,
        selectError: selectError?.message || 'none'
      });

      if (selectError && selectError.code !== "PGRST116") {
        console.error(`[AUTH_CALLBACK] Database select error:`, selectError);
        throw selectError;
      }

      if (!existingUser) {
        console.log(`[AUTH_CALLBACK] Creating new user record`);
        
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

        console.log(`[AUTH_CALLBACK] User record to insert:`, {
          ...userRecord,
          google_access_token: providerToken ? 'present' : 'missing',
          google_refresh_token: refreshToken ? 'present' : 'missing'
        });

        const { error: insertError } = await supabase.from("users").insert(userRecord);

        if (insertError) {
          console.error(`[AUTH_CALLBACK] Database insert error:`, insertError);
          throw insertError;
        }

        console.log(`[AUTH_CALLBACK] New user record created successfully`);
      } else {
        console.log(`[AUTH_CALLBACK] Updating existing user record`);
        
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

        console.log(`[AUTH_CALLBACK] Update data:`, {
          ...updateData,
          google_access_token: providerToken ? 'present' : 'missing',
          google_refresh_token: refreshToken ? 'present' : 'missing'
        });

        const { error: updateError } = await supabase
          .from("users")
          .update(updateData)
          .eq("user_id", data.user.id);

        if (updateError) {
          console.error(`[AUTH_CALLBACK] Database update error:`, updateError);
          throw updateError;
        }

        console.log(`[AUTH_CALLBACK] User record updated successfully`);
      }

      console.log(`[AUTH_CALLBACK] Database operations completed successfully`);
    } catch (dbError) {
      console.error(`[AUTH_CALLBACK] Database error:`, dbError);
      // Don't redirect to error page for DB errors, as auth succeeded
      // The user can still use the app, just tokens might not be stored
    }

    // Successful authentication - redirect to destination
    const redirectTo = redirect_to || "/upload";
    const redirectUrl = new URL(redirectTo, requestUrl.origin);

    console.log(`[AUTH_CALLBACK] Redirecting to:`, redirectUrl.toString());

    // Create response and let Supabase handle session cookies automatically
    const response = NextResponse.redirect(redirectUrl);

    console.log(`[AUTH_CALLBACK] Auth callback completed successfully`);
    return response;
    
  } catch (authError) {
    console.error(`[AUTH_CALLBACK] Authentication error:`, authError);
    console.log(`[AUTH_CALLBACK] Auth error details:`, {
      name: authError instanceof Error ? authError.name : 'unknown',
      message: authError instanceof Error ? authError.message : 'unknown',
      stack: authError instanceof Error ? authError.stack : 'none'
    });
    
    return NextResponse.redirect(
      new URL(
        `/sign-in?error=${encodeURIComponent("Authentication failed")}`,
        requestUrl.origin,
      ),
    );
  }
}