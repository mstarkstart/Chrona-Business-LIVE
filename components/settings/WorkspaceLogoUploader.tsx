"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Camera, Loader2, Building2 } from "lucide-react";

export function WorkspaceLogoUploader({
  workspaceId,
  initialUrl,
  onUploadComplete,
}: {
  workspaceId: string;
  initialUrl: string | null;
  onUploadComplete: (url: string) => Promise<void>;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initialUrl);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `workspace_${workspaceId}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setLogoUrl(data.publicUrl);
      await onUploadComplete(data.publicUrl);
    } catch (err) {
      console.error("Logo upload failed:", err);
      alert("Upload failed. Make sure the avatars storage bucket exists in Supabase.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group h-20 w-20 rounded-2xl border-2 border-indigo-100 overflow-hidden bg-muted flex items-center justify-center shadow-sm">
        {logoUrl ? (
          <img src={logoUrl} alt="Workspace logo" className="h-full w-full object-cover" />
        ) : (
          <Building2 className="h-9 w-9 text-muted-foreground/50" />
        )}
        <label
          htmlFor="logo-upload"
          className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-semibold"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Camera className="h-5 w-5 mb-1" />
              Upload
            </>
          )}
        </label>
        <input
          type="file"
          id="logo-upload"
          accept="image/*"
          disabled={uploading}
          onChange={handleUpload}
          className="hidden"
        />
      </div>
      <span className="text-xs text-muted-foreground font-medium">Workspace logo</span>
    </div>
  );
}
