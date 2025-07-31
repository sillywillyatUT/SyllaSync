import { redirect } from "next/navigation";
import Navbar from "@/components/navbar";
import UploadClient from "@/components/upload-client";
import { createClient } from "../../supabase/server";

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in"); // Redirect to sign-in page if user is not authenticated
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
      <Navbar />
      <UploadClient />
    </div>
  );
}