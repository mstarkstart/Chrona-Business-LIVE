import Link from "next/link";
import { BarChart3 } from "lucide-react";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Floating navbar ── */}
      <header className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
        <div className="flex items-center gap-1 rounded-2xl border border-border bg-white/80 backdrop-blur-xl shadow-lg shadow-indigo-500/5 px-2 py-1.5 max-w-3xl w-full">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight px-3 py-1.5 mr-1">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
              <BarChart3 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="hidden sm:inline">Chrona <span className="gradient-text">Business</span></span>
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white glow-sm hover:scale-[1.03] active:scale-[0.97]"
            >
              Get started
              <span className="ml-1.5 inline-block">→</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-20">{children}</main>
    </div>
  );
}
