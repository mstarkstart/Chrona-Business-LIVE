import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "rounded-[16px] p-5 bg-[rgba(255,255,255,0.45)] backdrop-blur-[16px] border border-white/50 shadow-[0_2px_16px_rgba(100,140,180,0.12),inset_0_1px_0_rgba(255,255,255,0.80)] hover:bg-[rgba(255,255,255,0.62)] hover:border-white/72 hover:shadow-[0_6px_28px_rgba(80,120,160,0.18),inset_0_1px_0_rgba(255,255,255,0.90)] hover:-translate-y-[2px] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
      className
    )}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn(
      "text-[#40566E] uppercase tracking-[0.09em] text-[10px] font-medium mb-1",
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
      <div className="flex items-center justify-between text-[12px]">
        {label && (
          <span className="text-[#344B63] font-semibold">{label}</span>
        )}
        <span className="font-bold shrink-0 text-[#1E2D3D]">
          {pct}%
        </span>
      </div>
      {/* Bar track */}
      <div className="h-[6px] w-full rounded-[4px] bg-[rgba(180,210,235,0.45)] border border-[rgba(180,210,235,0.30)] overflow-hidden relative">
        {/* Fill */}
        <div
          className="h-full rounded-[4px] relative overflow-hidden"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, rgba(74,144,212,0.75), rgba(120,180,235,0.88))`,
            backgroundSize: '200% auto',
            animation: 'progress-fill 800ms cubic-bezier(0.34,1.20,0.64,1) forwards, shimmer-pass 3s linear 1s infinite'
          }}
        />
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
            stroke="rgba(180,210,235,0.50)" strokeWidth={7}
            fill="none"
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke="#4A90D4" strokeWidth={7}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)",
              animation: "ring-draw-glow 700ms ease 900ms 1 forwards"
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[22px] font-bold text-[#1E2D3D]">{percent}%</span>
        </div>
      </div>
      <span className="text-[#40566E] text-[12px] font-medium text-center">{label}</span>
    </div>
  );
}
