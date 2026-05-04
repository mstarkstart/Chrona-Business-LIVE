import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-muted-foreground">{children}</h3>;
}

export function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  return (
    <div className="space-y-1.5">
      {label && <div className="flex justify-between text-xs text-muted-foreground"><span>{label}</span><span>{percent}%</span></div>}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-indigo-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function Ring({ label, percent }: { label: string; percent: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={88} height={88} viewBox="0 0 88 88">
        <circle cx={44} cy={44} r={r} stroke="currentColor" strokeWidth={6} className="text-muted" fill="none" />
        <circle
          cx={44} cy={44} r={r}
          stroke="currentColor" strokeWidth={6} className="text-indigo-500"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 44 44)"
        />
        <text x={44} y={48} textAnchor="middle" className="fill-foreground text-sm font-semibold">{percent}%</text>
      </svg>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
