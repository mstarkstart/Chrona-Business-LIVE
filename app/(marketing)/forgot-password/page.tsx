import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ArrowLeft, ArrowRight, BarChart3, Mail } from "lucide-react";
import { InteractiveBackground } from "@/components/ui/InteractiveBackground";

async function requestReset(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect("/forgot-password?error=Email+is+required");
  }

  const supabase = await createSupabaseServerClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  });

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/forgot-password?success=1");
}

export default async function ForgotPasswordPage({
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

            <h1 className="text-3xl font-bold text-center tracking-tighter">Reset Password</h1>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              We will send you a password reset link to your email address.
            </p>

            {params.success ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 text-center space-y-2">
                  <Mail className="h-8 w-8 text-emerald-600 mx-auto" />
                  <p className="font-bold">Reset email sent!</p>
                  <p className="text-xs text-emerald-600">Please check your inbox and follow the link to reset your password.</p>
                </div>
                <Link
                  href="/login"
                  className="w-full h-12 rounded-xl bg-primary font-semibold text-white shadow-lg flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  Return to sign in
                </Link>
              </div>
            ) : (
              <form action={requestReset} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@company.com"
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
                  Send Reset Link
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="text-center pt-2">
                  <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to sign in
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
