import Link from "next/link";
import { BarChart3 } from "lucide-react";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border/80 bg-white/70 backdrop-blur-xl transition-all duration-300">
        <div className="flex items-center gap-1 h-16 px-6 max-w-6xl mx-auto w-full">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight py-1.5 mr-1 hover:opacity-90 transition-opacity">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
              <BarChart3 className="h-3.5 w-3.5 text-white" />
            </div>
            <span>Chrona <span className="gradient-text font-black">Business</span></span>
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white glow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Get started
              <span className="ml-1.5 inline-block">→</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-16">{children}</main>
    </div>
  );
}

