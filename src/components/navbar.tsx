import Link from "next/link";
import { createClient } from "../../supabase/server";
import { Button } from "./ui/button";
import { User, UserCircle } from "lucide-react";
import UserProfile from "./user-profile";

export default async function Navbar() {
  const supabase = createClient();

  const {
    data: { user },
  } = await (await supabase).auth.getUser();

  let userProfile = null;
  if (user) {
    const { data: profile } = await (await supabase)
      .from("users")
      .select("*")
      .eq("user_id", user.id)
      .single();
    userProfile = profile;
  }

  return (
    <nav className="w-full border-b border-gray-100 bg-white/80 backdrop-blur-md py-3 sticky top-0 z-50">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link
          href="/"
          prefetch
          className="text-xl font-bold text-orange-600 hover:text-orange-700 transition-colors"
        >
          SyllabusSync
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-8">
          <a
            href="#how-it-works"
            className="text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
          >
            How It Works
          </a>
          <a
            href="#features"
            className="text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
          >
            Features
          </a>
          <a
            href="#faq"
            className="text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
          >
            FAQ
          </a>
          <a
            href="#contact"
            className="text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
          >
            Contact
          </a>
        </div>

        <div className="flex gap-3 items-center">
          {user ? (
            <>
              <Link
                href="/upload"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                <Button variant="ghost" className="hover:bg-orange-50">
                  Upload
                </Button>
              </Link>
              <UserProfile user={user} userProfile={userProfile} />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors rounded-md hover:bg-gray-50"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
