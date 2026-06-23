import Link from "next/link";
import { InteractiveBackground } from "@/components/ui/InteractiveBackground";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-mesh text-foreground relative overflow-hidden">
      {/* Universal Premium Background for all Auth & Marketing pages */}
      <InteractiveBackground />
      <div className="absolute inset-0 bg-grid mask-fade opacity-35 pointer-events-none" />

      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/40 bg-[rgba(255,255,255,0.65)] backdrop-blur-xl transition-all duration-300 shadow-[0_1px_3px_rgba(30,45,61,0.05)]">
        <div className="flex items-center gap-1 h-16 px-6 max-w-6xl mx-auto w-full">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight py-1.5 mr-1 hover:opacity-90 transition-opacity">
            <img src="/chrona-logo.png" alt="Chrona Logo" className="h-7 w-7 object-contain rounded-lg" />
            <span className="text-[#1E2D3D]">Chrona <span className="bg-gradient-to-br from-indigo-600 to-violet-600 bg-clip-text text-transparent font-black">Business</span></span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-[#344B63] hover:text-[#1E2D3D] hover:bg-white/60 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.45)] hover:-translate-y-0.5 active:scale-95 transition-all border border-white/30"
            >
              Get started
              <span className="ml-1.5 inline-block">→</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-16 relative z-10">{children}</main>
    </div>
  );
}

