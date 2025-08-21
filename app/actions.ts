"use server";

import { encodedRedirect } from "../src/utils/utils";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";

// -------------------- SIGN UP --------------------
export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const fullName = formData.get("full_name")?.toString() || "";
  const supabase = await createClient();

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required"
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: undefined,
      data: { full_name: fullName, email },
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  }

  // Sign in immediately
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return encodedRedirect("error", "/sign-in", signInError.message);
  }

  return redirect("/upload");
};

// -------------------- SIGN IN --------------------
export const signInAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString() || "";
  const password = formData.get("password")?.toString() || "";
  const redirectTo = formData.get("redirect_to")?.toString() || "/dashboard";
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect(redirectTo);
};

// -------------------- FORGOT PASSWORD --------------------
export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = headers().get("origin");

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect("error", "/forgot-password", "Could not reset password");
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password."
  );
};

// -------------------- RESET PASSWORD --------------------
export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();
  const password = formData.get("password")?.toString() || "";
  const confirmPassword = formData.get("confirmPassword")?.toString() || "";

  if (!password || !confirmPassword) {
    return encodedRedirect("error", "/protected/reset-password", "Password and confirm password are required");
  }

  if (password !== confirmPassword) {
    return encodedRedirect("error", "/dashboard/reset-password", "Passwords do not match");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return encodedRedirect("error", "/dashboard/reset-password", "Password update failed");
  }

  return encodedRedirect("success", "/protected/reset-password", "Password updated");
};

// -------------------- SIGN OUT --------------------
export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};

// -------------------- GOOGLE OAUTH --------------------
export const signInWithGoogleAction = async (formData?: FormData) => {
  const supabase = await createClient();
  const origin = headers().get("origin");
  const redirectTo = formData?.get("redirect_to")?.toString() || "/upload";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
      scopes: "openid email profile",
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect(data.url);
};

// -------------------- CONTACT FORM --------------------
export const contactFormAction = async (formData: FormData) => {
  const name = formData.get("name")?.toString();
  const email = formData.get("email")?.toString();
  const subject = formData.get("subject")?.toString();
  const message = formData.get("message")?.toString();

  if (!name || !email || !subject || !message) {
    return { error: "All fields are required" };
  }

  // Example: log to console (replace with DB/email logic)
  console.log("Contact form submission:", {
    name, email, subject, message, timestamp: new Date().toISOString(),
  });

  return { success: "Message sent successfully! We'll get back to you soon." };
};
