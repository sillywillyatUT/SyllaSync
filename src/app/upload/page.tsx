import { redirect } from "next/navigation";
import Navbar from "@/components/navbar";
import UploadClient from "@/components/upload-client";
import { createClient } from "../../../supabase/server"; // adjust path as needed

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-up"); // or "/login" depending on your auth flow
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
      <Navbar />
      <UploadClient />
    </div>
  );
}