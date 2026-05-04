import Link from "next/link";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <span>Chrona <span className="gradient-text">Business</span></span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="ml-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-md shadow-violet-500/25 hover:brightness-110 active:scale-[0.98] glow-sm"
            >
              Get started →
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content — offset for fixed header */}
      <main className="pt-16">{children}</main>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-10 mt-16">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600" />
            <span>Chrona Business v1</span>
          </div>
          <p>Built for modern workforces.</p>
        </div>
      </footer>
    </div>
  );
}
