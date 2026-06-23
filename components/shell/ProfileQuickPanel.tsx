"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { Settings, LogOut, UserCog, Camera, Loader2, MoonStar } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  userName: string;
  workspaceName: string;
  userRole: string;
  avatarUrl: string | null;
  onClose: () => void;
  onLogout: () => void;
  userId?: string;
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  guest: "Guest",
};

const ROLE_COLOR: Record<string, string> = {
  owner: "bg-amber-100 text-amber-700 border-amber-200",
  admin: "bg-sky-100 text-sky-700 border-sky-200",
  manager: "bg-emerald-100 text-emerald-700 border-emerald-200",
  member: "bg-slate-100 text-slate-600 border-slate-200",
  guest: "bg-purple-100 text-purple-700 border-purple-200",
};

export function ProfileQuickPanel({ userName, workspaceName, userRole, avatarUrl: initialAvatarUrl, onClose, onLogout, userId }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);

  // Outside click logic moved to parent component

  // Close on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!userId || !e.target.files?.length) return;
    try {
      setUploading(true);
      const file = e.target.files[0];
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      // Save to profile via API (fire-and-forget)
      await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: data.publicUrl }),
      }).catch(() => {});
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  const initials = userName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full left-2 right-2 mb-2 rounded-2xl border border-white/60 bg-[rgba(255,255,255,0.95)] backdrop-blur-[24px] shadow-[0_12px_40px_-8px_rgba(30,45,61,0.25)] overflow-hidden z-50 animate-fade-up"
      style={{ animationDuration: "0.18s" }}
    >
      {/* Avatar + name */}
      <div className="px-4 pt-5 pb-4 flex flex-col items-center gap-3 bg-gradient-to-b from-primary/10 to-transparent border-b border-border">
        {/* Clickable avatar with upload overlay */}
        <div className="relative group h-16 w-16 rounded-full overflow-hidden border-2 border-indigo-200 shadow-md">
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xl font-bold text-white">
              {initials}
            </div>
          )}
          <label
            htmlFor="quick-avatar-upload"
            className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-semibold"
          >
            {uploading
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <><Camera className="h-4 w-4 mb-0.5" />Photo</>}
          </label>
          <input type="file" id="quick-avatar-upload" accept="image/*" disabled={uploading} onChange={handleAvatarUpload} className="hidden" />
        </div>

        <div className="text-center">
          <p className="text-sm font-bold text-foreground">{userName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{workspaceName}</p>
          <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${ROLE_COLOR[userRole] ?? ROLE_COLOR.member}`}>
            {ROLE_LABEL[userRole] ?? userRole}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="py-1.5">
        <Link
          href="/settings/profile"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors cursor-pointer"
        >
          <UserCog className="h-4 w-4 text-muted-foreground" />
          Edit full profile
        </Link>
        <Link
          href="/settings"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors cursor-pointer"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
          Settings
        </Link>
        <div className="flex items-center justify-between px-4 py-1.5">
          <span className="flex items-center gap-3 text-sm text-foreground">
            <MoonStar className="h-4 w-4 text-muted-foreground" />
            Appearance
          </span>
          <ThemeToggle />
        </div>
        <div className="mx-3 my-1 border-t border-border" />
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
