import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ArrowRight } from "lucide-react";
import { InteractiveBackground } from "@/components/ui/InteractiveBackground";
import { LoginSubmitButton } from "@/components/forms/LoginSubmitButton";

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
    // Check active memberships
    const { data: activeMemberships } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1);

    if (activeMemberships && activeMemberships.length > 0) {
      redirect(params.next ?? "/dashboard");
    }

    // Check if they have suspended memberships (account suspended by admin)
    const { data: suspendedMemberships } = await supabase
      .from("workspace_members")
      .select("id, workspaces(name)")
      .eq("user_id", user.id)
      .eq("status", "suspended")
      .limit(1);

    if (suspendedMemberships && suspendedMemberships.length > 0) {
      const ws = (suspendedMemberships[0] as any).workspaces;
      return (
        <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white px-8 py-10 shadow-xl text-center space-y-4">
            <div className="flex justify-center">
              <img src="/chrona-logo.png" alt="Chrona Logo" className="h-14 w-14 object-contain" />
            </div>
            <h1 className="text-xl font-bold text-red-700">Account Suspended</h1>
            <p className="text-sm text-muted-foreground">
              Your account{ws?.name ? ` in <strong>${ws.name}</strong>` : ""} has been suspended by a workspace administrator.
              Please contact your employer to restore access.
            </p>
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700 font-medium">
              Signed in as: {user.email}
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-red-600 font-semibold text-white shadow-lg hover:scale-[1.01] active:scale-[0.99]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      );
    }

    // No memberships at all (stale session / wrong account)
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-white px-8 py-10 shadow-xl text-center space-y-4">
          <div className="flex justify-center">
            <img src="/chrona-logo.png" alt="Chrona Logo" className="h-14 w-14 object-contain" />
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
    <div className="min-h-[calc(100vh-4rem)] bg-mesh relative flex items-center justify-center px-6 py-16 overflow-hidden">
      <InteractiveBackground />

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-grid mask-fade opacity-35" />

      <div className="relative w-full max-w-md animate-fade-up">

        <div className="border-gradient rounded-3xl p-px shadow-2xl shadow-indigo-200/50">
          <div className="rounded-3xl bg-white/80 backdrop-blur-md px-8 py-10">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img src="/chrona-logo.png" alt="Chrona Logo" className="h-14 w-14 object-contain" />
            </div>

            <h1 className="text-3xl font-bold text-center tracking-tighter">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground text-center">
              Sign in to your Chrona workspace
            </p>

            {/* Social logins (disabled placeholders) */}
            <div className="mt-6 space-y-3">
              <button
                type="button"
                disabled
                className="w-full h-11 rounded-xl border border-border bg-white/50 px-4 text-sm font-medium text-muted-foreground cursor-not-allowed flex items-center justify-between opacity-70"
              >
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.85 2.99C6.16 7.04 8.86 5.04 12 5.04z" />
                    <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.62z" />
                    <path fill="#FBBC05" d="M5.24 14.81c-.24-.72-.38-1.5-.38-2.31s.14-1.59.38-2.31L1.39 7.56C.5 9.36 0 11.62 0 14s.5 4.64 1.39 6.44l3.85-2.99z" />
                    <path fill="#34A853" d="M12 23c3.24 0 5.97-1.09 7.96-2.96l-3.73-2.89c-1.03.69-2.35 1.11-4.23 1.11-3.14 0-5.84-2-6.76-4.96L1.39 16.29C3.37 20.33 7.35 23 12 23z" />
                  </svg>
                  <span>Google</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Soon</span>
              </button>
              <button
                type="button"
                disabled
                className="w-full h-11 rounded-xl border border-border bg-white/50 px-4 text-sm font-medium text-muted-foreground cursor-not-allowed flex items-center justify-between opacity-70"
              >
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 23 23">
                    <path fill="#F25022" d="M0 0h11v11H0z" />
                    <path fill="#7FBA00" d="M12 0h11v11H12z" />
                    <path fill="#00A4EF" d="M0 12h11v11H0z" />
                    <path fill="#FFB900" d="M12 12h11v11H12z" />
                  </svg>
                  <span>Microsoft</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Soon</span>
              </button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white/90 px-3 text-muted-foreground font-medium">Or continue with email</span>
              </div>
            </div>

            <form action={loginAction} className="space-y-4">
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

              {/* Remember Me and Forgot Password */}
              <div className="flex items-center justify-between text-sm py-1">
                <label className="flex items-center gap-2 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-input rounded-full peer peer-focus:ring-2 peer-focus:ring-ring peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary relative"></div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Remember me</span>
                </label>
                <Link href="/forgot-password" className="text-xs font-medium text-indigo-600 hover:underline">
                  Forgot password?
                </Link>
              </div>

              {params.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-shake">
                  {params.error}
                </div>
              )}

              <LoginSubmitButton />
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
