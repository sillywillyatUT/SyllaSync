import { redirect } from "next/navigation";

export default async function Dashboard() {
  // Dashboard removed - redirect to upload page
  return redirect("/upload");
}
