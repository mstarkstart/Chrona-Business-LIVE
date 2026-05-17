import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ArrowRight, BarChart3 } from "lucide-react";

async function signOutAction() {
  "use server";
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

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

  // Check if user already has a valid session
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Check if they have active memberships
    const { data: memberships } = await supabase
      .from("business_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1);

    if (memberships && memberships.length > 0) {
      // Valid session + memberships → send them where they wanted to go
      redirect(params.next ?? "/dashboard");
    }

    // Session exists but no memberships (stale/wrong account) →
    // show a banner so they can sign out and use the right account
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-white px-8 py-10 shadow-xl text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <BarChart3 className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-xl font-bold">Wrong account?</h1>
          <p className="text-sm text-muted-foreground">
            You&apos;re signed in as <strong>{user.email}</strong> but that account has no active business.
            Sign out to log in with a different account.
          </p>
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-primary font-semibold text-white shadow-lg hover:scale-[1.01] active:scale-[0.99]"
            >
              Sign out &amp; switch account
            </button>
          </form>
          <Link href="/signup" className="block text-sm text-indigo-600 hover:underline">
            Or create a new business →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-mesh relative flex items-center justify-center px-6 py-16 overflow-hidden">
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full opacity-50 blur-3xl animate-blob"
             style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18), transparent 70%)" }} />
        <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full opacity-50 blur-3xl animate-blob"
             style={{ background: "radial-gradient(circle, rgba(244,63,94,0.10), transparent 70%)", animationDelay: "3s" }} />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 bg-grid mask-fade opacity-40" />

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="border-gradient rounded-3xl p-px shadow-2xl shadow-indigo-200/50">
          <div className="rounded-3xl bg-white px-8 py-10">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center tracking-tighter">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              Sign in to your Chrona workspace
            </p>

            <form action={loginAction} className="mt-8 space-y-4">
              <input type="hidden" name="next" value={params.next ?? "/dashboard"} />

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </label>
                <input
                  id="email" name="email" type="email" required autoComplete="email"
                  placeholder="you@company.com"
                  className="w-full h-12 rounded-xl border border-border bg-muted/40 px-4 text-sm placeholder:text-muted-foreground/50 focus:border-indigo-500/50 focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <input
                  id="password" name="password" type="password" required autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full h-12 rounded-xl border border-border bg-muted/40 px-4 text-sm placeholder:text-muted-foreground/50 focus:border-indigo-500/50 focus:bg-white transition-colors"
                />
              </div>

              {params.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {params.error}
                </div>
              )}

              <button
                type="submit"
                className="group w-full h-12 rounded-xl bg-primary font-semibold text-white shadow-lg glow-primary hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
              >
                Sign in
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have a business?{" "}
              <Link href="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Create one →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
