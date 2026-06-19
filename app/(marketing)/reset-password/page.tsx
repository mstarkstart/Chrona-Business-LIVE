import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ArrowRight, BarChart3, CheckCircle2 } from "lucide-react";
import { InteractiveBackground } from "@/components/ui/InteractiveBackground";

async function doReset(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!password || password.length < 8) {
    redirect("/reset-password?error=Password+must+be+at+least+8+characters");
  }
  if (password !== confirm) {
    redirect("/reset-password?error=Passwords+do+not+match");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  // Automatically sign them out after password update to force fresh login
  await supabase.auth.signOut();
  redirect("/reset-password?success=1");
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-mesh relative flex items-center justify-center px-6 py-16 overflow-hidden">
      <InteractiveBackground />
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-grid mask-fade opacity-35" />

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="border-gradient rounded-3xl p-px shadow-2xl shadow-indigo-200/50">
          <div className="rounded-3xl bg-white/80 backdrop-blur-md px-8 py-10">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center tracking-tighter">Set New Password</h1>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              Please enter your new workspace password below.
            </p>

            {params.success ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 text-center space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <p className="font-bold">Password Reset Successful!</p>
                  <p className="text-xs text-emerald-600">Your password has been changed successfully. You can now log in with your new password.</p>
                </div>
                <Link
                  href="/login"
                  className="w-full h-12 rounded-xl bg-primary font-semibold text-white shadow-lg flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  Return to sign in
                </Link>
              </div>
            ) : (
              <form action={doReset} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    New Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full h-12 rounded-xl border border-border bg-muted/40 px-4 text-sm placeholder:text-muted-foreground/50 focus:border-indigo-500/50 focus:bg-white transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm_password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full h-12 rounded-xl border border-border bg-muted/40 px-4 text-sm placeholder:text-muted-foreground/50 focus:border-indigo-500/50 focus:bg-white transition-colors"
                  />
                </div>

                {params.error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-shake">
                    {params.error}
                  </div>
                )}

                <button
                  type="submit"
                  className="group w-full h-12 rounded-xl bg-primary font-semibold text-white shadow-lg glow-primary hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  Update Password
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
