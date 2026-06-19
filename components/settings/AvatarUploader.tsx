"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Camera, Loader2, User } from "lucide-react";

export function AvatarUploader({
  userId,
  initialUrl,
  onUploadComplete,
}: {
  userId: string;
  initialUrl: string | null;
  onUploadComplete: (url: string) => Promise<void>;
}) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialUrl);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) {
        return;
      }
      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/avatar-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      setAvatarUrl(publicUrl);
      await onUploadComplete(publicUrl);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Error uploading avatar. Please ensure you have pasted the SQL migration to create the 'avatars' storage bucket in Supabase.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group h-24 w-24 rounded-full border-2 border-indigo-200 overflow-hidden bg-muted flex items-center justify-center shadow-inner">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <User className="h-12 w-12 text-muted-foreground" />
        )}
        <label
          htmlFor="avatar-upload"
          className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-semibold"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Camera className="h-5 w-5 mb-1" />
              Change
            </>
          )}
        </label>
        <input
          type="file"
          id="avatar-upload"
          accept="image/*"
          disabled={uploading}
          onChange={handleUpload}
          className="hidden"
        />
      </div>
      <span className="text-xs text-muted-foreground font-medium">Click to upload profile picture</span>
    </div>
  );
}
