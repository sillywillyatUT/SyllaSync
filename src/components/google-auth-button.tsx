"use client";

import { Button } from "./ui/button";
import { createClient } from "../../supabase/client";
import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";

export default function GoogleAuthButton() {
  // FIX: Add a new loading state for the initial session check
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    console.log(`[GOOGLE_AUTH] Component mounted, checking current user`);
    
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        console.log(`[GOOGLE_AUTH] Current user check:`, {
          user: user ? `${user.email} (${user.id})` : 'null',
          error: error?.message || 'none'
        });
        
        setUser(user);
      } catch (error) {
        console.error(`[GOOGLE_AUTH] Error checking current user:`, error);
        setUser(null);
      } finally {
        // FIX: Set loading to false after the check is complete
        setIsSessionLoading(false);
      }
    };

    getUser();

    console.log(`[GOOGLE_AUTH] Setting up auth state listener`);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[GOOGLE_AUTH] Auth state change:`, {
        event,
        user: session?.user ? `${session.user.email} (${session.user.id})` : 'null',
      });
      
      setUser(session?.user ?? null);

      // FIX: Ensure session loading is false when auth state changes
      if (isSessionLoading) {
        setIsSessionLoading(false);
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

      console.log(`[GOOGLE_AUTH] Sign-in options:`, signInOptions);

      const { error } = await supabase.auth.signInWithOAuth(signInOptions);

      if (error) {
        console.error(`[GOOGLE_AUTH] Error signing in with Google:`, error);
        setIsLoading(false);
      }
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

  // FIX: Show a loading indicator while checking for the session
  if (isSessionLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
        <p className="text-sm text-gray-600">Loading session...</p>
      </div>
    );
  }

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
        {/* SVG paths... */}
      </svg>
      {isLoading ? "Redirecting..." : "Continue with Google"}
    </Button>
  );
}