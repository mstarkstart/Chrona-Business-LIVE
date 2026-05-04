import Link from "next/link";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            Chrona <span className="text-indigo-600">Business</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/login" className="text-muted-foreground hover:text-foreground">Log in</Link>
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground hover:bg-indigo-500"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
