"use client";
import { UserCircle, Upload, Settings } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { createClient } from "../../supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { User } from "@supabase/supabase-js";

interface UserProfileProps {
  user: User;
  userProfile: any;
}

export default function UserProfile({ user, userProfile }: UserProfileProps) {
  const supabase = createClient();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      router.refresh();
    } catch (error) {
      console.error("Error uploading avatar:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = (email: string) => {
    return email.split("@")[0].substring(0, 2).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={
                userProfile?.avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`
              }
              alt={user.email || "User avatar"}
            />
            <AvatarFallback className="bg-orange-500 text-white">
              {getInitials(user.email || "U")}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex flex-col space-y-2 p-4">
          <p className="text-lg font-semibold text-gray-900">
            {userProfile?.full_name || user.email?.split("@")[0] || "User"}
          </p>
          <p className="text-sm text-gray-600">{user.email}</p>
          <p className="text-xs text-gray-500">
            {userProfile?.syllabi_processed || 0} syllabi processed
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <label className="cursor-pointer flex items-center">
            <Upload className="mr-2 h-4 w-4" />
            <span>
              {isUploading ? "Uploading..." : "Change Profile Picture"}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await supabase.auth.signOut();
            router.refresh();
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
