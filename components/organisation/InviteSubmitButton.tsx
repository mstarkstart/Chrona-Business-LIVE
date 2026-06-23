"use client";

import { useFormStatus } from "react-dom";
import { UserPlus, Loader2 } from "lucide-react";

export function InviteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full text-xs font-semibold py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-md shadow-indigo-600/10 active:scale-[0.98]"
    >
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Sending Invite...</span>
        </>
      ) : (
        <>
          <UserPlus className="h-3.5 w-3.5" />
          <span>Send Invitation Link</span>
        </>
      )}
    </button>
  );
}
