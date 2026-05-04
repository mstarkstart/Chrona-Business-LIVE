import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function loginAction(formData: FormData) {
  "use server";
  const email    = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next     = String(formData.get("next") ?? "/dashboard");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-16">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-3xl"
             style={{ background: "radial-gradient(ellipse, rgba(124,106,247,0.12) 0%, transparent 70%)" }} />
      </div>

      <div className="w-full max-w-md animate-fade-up">
        {/* Card */}
        <div className="border-gradient rounded-3xl p-px shadow-2xl shadow-black/40">
          <div className="rounded-3xl bg-card/90 backdrop-blur-xl px-8 py-10">

            {/* Logo mark */}
            <div className="flex justify-center mb-8">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              Sign in to your Chrona workspace
            </p>

            <form action={loginAction} className="mt-8 space-y-4">
              <input type="hidden" name="next" value={params.next ?? "/dashboard"} />

              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Email
                </label>
                <input
                  id="email" name="email" type="email" required autoComplete="email"
                  placeholder="you@company.com"
                  className="w-full h-11 rounded-xl border border-border bg-muted/40 px-4 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-violet-500/60"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <input
                  id="password" name="password" type="password" required autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full h-11 rounded-xl border border-border bg-muted/40 px-4 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-violet-500/60"
                />
              </div>

              {params.error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {params.error}
                </div>
              )}

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-primary font-semibold text-white shadow-lg shadow-violet-500/25 hover:brightness-110 active:scale-[0.98] glow-sm mt-2"
              >
                Sign in
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have a business?{" "}
              <Link href="/signup" className="font-medium text-violet-400 hover:text-violet-300">
                Create one free →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
