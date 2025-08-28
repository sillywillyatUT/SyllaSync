"use client";

import { Button } from "./ui/button";
import { createClient } from "../../supabase/client";
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";

export default function GoogleAuthButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    console.log(`[GOOGLE_AUTH] Component mounted, checking current user`);
    
    // Check if user is already logged in
    const getUser = async () => {
      try {
        const {
          data: { user },
          error
        } = await supabase.auth.getUser();
        
        console.log(`[GOOGLE_AUTH] Current user check:`, {
          user: user ? `${user.email} (${user.id})` : 'null',
          error: error?.message || 'none'
        });
        
        setUser(user);
      } catch (error) {
        console.error(`[GOOGLE_AUTH] Error checking current user:`, error);
        setUser(null);
      }
    };

    getUser();

    // Listen for auth changes
    console.log(`[GOOGLE_AUTH] Setting up auth state listener`);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[GOOGLE_AUTH] Auth state change:`, {
        event,
        user: session?.user ? `${session.user.email} (${session.user.id})` : 'null',
        sessionId: session?.access_token ? session.access_token.substring(0, 20) + '...' : 'none'
      });
      
      setUser(session?.user ?? null);

      if (event === "SIGNED_IN") {
        console.log(`[GOOGLE_AUTH] User signed in successfully:`, session?.user.email);
      } else if (event === "SIGNED_OUT") {
        console.log(`[GOOGLE_AUTH] User signed out`);
      } else if (event === "TOKEN_REFRESHED") {
        console.log(`[GOOGLE_AUTH] Token refreshed for user:`, session?.user.email);
      }
    });

    return () => {
      console.log(`[GOOGLE_AUTH] Cleaning up auth listener`);
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleGoogleSignIn = async () => {
    try {
      console.log(`[GOOGLE_AUTH] Starting Google sign-in process`);
      setIsLoading(true);

      // Check current session before signing out
      const { data: currentSession } = await supabase.auth.getSession();
      if (currentSession.session) {
        console.log(`[GOOGLE_AUTH] Current session exists, signing out first:`, currentSession.session.user.email);
        await supabase.auth.signOut();
      } else {
        console.log(`[GOOGLE_AUTH] No current session found`);
      }

      const redirectUrl = `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent("/upload")}`;
      console.log(`[GOOGLE_AUTH] Redirect URL:`, redirectUrl);

      const signInOptions = {
        provider: "google" as const,
        options: {
          scopes: [
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
          ].join(" "),
          queryParams: {
            access_type: "offline",
            prompt: "consent select_account",
            include_granted_scopes: "true",
          },
          redirectTo: redirectUrl,
        },
      };

      console.log(`[GOOGLE_AUTH] Sign-in options:`, {
        provider: signInOptions.provider,
        scopes: signInOptions.options.scopes,
        queryParams: signInOptions.options.queryParams,
        redirectTo: signInOptions.options.redirectTo
      });

      const { data, error } = await supabase.auth.signInWithOAuth(signInOptions);

      console.log(`[GOOGLE_AUTH] Sign-in response:`, {
        data: data ? 'present' : 'null',
        error: error?.message || 'none'
      });

      if (error) {
        console.error(`[GOOGLE_AUTH] Error signing in with Google:`, error);
        setIsLoading(false);
        return;
      }

      console.log(`[GOOGLE_AUTH] OAuth sign-in initiated successfully`);
      // Don't set loading to false here, let the redirect handle it
    } catch (error) {
      console.error(`[GOOGLE_AUTH] Unexpected error:`, error);
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log(`[GOOGLE_AUTH] Starting sign-out process`);
      setIsLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error(`[GOOGLE_AUTH] Error signing out:`, error);
      } else {
        console.log(`[GOOGLE_AUTH] Sign-out successful`);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error(`[GOOGLE_AUTH] Unexpected sign-out error:`, error);
      setIsLoading(false);
    }
  };

  // If user is already signed in, show sign out option
  if (user) {
    console.log(`[GOOGLE_AUTH] Rendering signed-in state for:`, user.email);
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-gray-600">Signed in as {user.email}</p>
        <Button
          onClick={handleSignOut}
          disabled={isLoading}
          variant="outline"
          className="border-gray-200 hover:bg-gray-50 hover:border-red-200 transition-all duration-200"
        >
          {isLoading ? "Signing out..." : "Sign Out"}
        </Button>
      </div>
    );
  }

  console.log(`[GOOGLE_AUTH] Rendering sign-in state`);
  return (
    <Button
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      variant="outline"
      className="border-gray-200 hover:bg-gray-50 hover:border-orange-200 transition-all duration-200"
    >
      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {isLoading ? "Signing in..." : "Continue with Google"}
    </Button>
  );
}