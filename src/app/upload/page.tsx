import Navbar from "@/components/navbar";
import UploadClient from "@/components/upload-client";

export default async function UploadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
      <Navbar />
      <UploadClient />
    </div>
  );
}
