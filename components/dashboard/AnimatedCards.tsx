"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

// Framer Motion counter — updates DOM directly, zero React re-renders per frame
export function AnimatedCount({
  value,
  className,
  style,
}: {
  value: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1], // expo ease-out: fast start, smooth finish
    });
    return () => controls.stop();
  }, [value, count]);

  return <motion.span className={className} style={style}>{rounded}</motion.span>;
}

export function getProgressColor(percent: number) {
  const hue = Math.max(0, Math.min(120, (percent / 100) * 120));
  return {
    base: `hsl(${hue}, 85%, 45%)`,
    gradientStart: `hsla(${hue}, 85%, 45%, 0.8)`,
    shadow: `hsla(${hue}, 85%, 45%, 0.25)`,
  };
}

// Ring arc animates via CSS transition (GPU-composited, zero JS per frame)
// One React state flip triggers the CSS transition — much lighter than rAF.
export function AnimatedRing({
  label,
  percent,
  size = 96,
  color,
}: {
  label: string;
  percent: number;
  size?: number;
  color?: string;
}) {
  const r = size * 0.38;
  const circumference = 2 * Math.PI * r;
  const targetOffset = circumference - (percent / 100) * circumference;
  const [offset, setOffset] = useState(circumference); // start empty
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const colors = color 
    ? { base: color, gradientStart: color, shadow: color }
    : getProgressColor(percent);

  useEffect(() => {
    // Brief delay so the element is painted at 0 before the transition fires
    timerRef.current = setTimeout(() => setOffset(targetOffset), 80);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [targetOffset]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ overflow: "visible" }}
        >
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke="currentColor"
            strokeWidth={8}
            fill="none"
            className="text-border"
          />
          {/* Animated fill — GPU composited via strokeDashoffset CSS transition */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={colors.base}
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              transition: "stroke-dashoffset 1.6s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold flex items-baseline gap-0" style={{ color: colors.base }}>
            <AnimatedCount value={percent} />
            <span className="text-sm">%</span>
          </span>
        </div>
      </div>
      {label && <span className="text-xs text-muted-foreground text-center">{label}</span>}
    </div>
  );
}

// Progress bar width animates via CSS transition — single state flip, no rAF
export function AnimatedProgressBar({
  percent,
  label,
  color,
}: {
  percent: number;
  label?: string;
  color?: string;
}) {
  const pct = Math.min(100, Math.max(0, percent));
  const [width, setWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const colors = color 
    ? { base: color, gradientStart: `${color}cc`, shadow: `${color}44` }
    : getProgressColor(pct);

  useEffect(() => {
    timerRef.current = setTimeout(() => setWidth(pct), 80);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [pct]);

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between text-sm">
        {label && <span className="text-muted-foreground font-semibold">{label}</span>}
        <span className="font-bold shrink-0 flex items-baseline gap-0" style={{ color: colors.base }}>
          <AnimatedCount value={pct} />
          <span>%</span>
        </span>
      </div>
      <div className="h-3.5 w-full rounded-full bg-muted border border-border/50 overflow-hidden relative">
        <div
          className="h-full rounded-full relative overflow-hidden"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${colors.gradientStart}, ${colors.base})`,
            boxShadow: `0 0 8px ${colors.shadow}`,
            transition: "width 1.6s cubic-bezier(0.16, 1, 0.3, 1)",
            willChange: "width",
          }}
        >
          <div className="absolute inset-0 bar-shimmer opacity-30" />
        </div>
      </div>
    </div>
  );
}
