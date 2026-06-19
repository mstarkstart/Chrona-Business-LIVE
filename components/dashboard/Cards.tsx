import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "rounded-2xl border border-border bg-card p-5 card-hover shadow-sm",
      className
    )}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn(
      "text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1",
      className
    )}>
      {children}
    </h3>
  );
}

export function ProgressBar({
  percent,
  label,
  color = "#7c6af7",
}: {
  percent: number;
  label?: string;
  color?: string;
}) {
  const pct = Math.min(100, Math.max(0, percent));

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between text-xs">
        {label && (
          <span className="text-muted-foreground font-semibold">{label}</span>
        )}
        <span className="font-bold shrink-0" style={{ color }}>
          {pct}%
        </span>
      </div>
      {/* Bar track */}
      <div className="h-2 w-full rounded-full bg-slate-100 border border-slate-200/50 overflow-hidden relative">
        {/* Fill */}
        <div
          className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
            boxShadow: `0 0 8px ${color}55`,
          }}
        >
          <div className="absolute inset-0 bar-shimmer opacity-40" />
        </div>
      </div>
    </div>
  );
}

export function Ring({
  label,
  percent,
  size = 96,
  color = "#7c6af7",
}: {
  label: string;
  percent: number;
  size?: number;
  color?: string;
}) {
  const r = size * 0.38;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke="#e2e8f0" strokeWidth={7}
            fill="none"
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={color} strokeWidth={7}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              filter: `drop-shadow(0 0 6px ${color}88)`,
              transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>{percent}%</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
}
