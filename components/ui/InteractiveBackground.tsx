"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function InteractiveBackground() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  useEffect(() => {
    // Detect if screen is touch-enabled to disable tracking coordinates
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Center the 600px gradient orb on the cursor
      mouseX.set(e.clientX - 300);
      mouseY.set(e.clientY - 300);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Interactive Cursor-following Blob (Visible and Vibrant) */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full filter blur-[100px] opacity-60 hidden md:block"
        style={{
          x: springX,
          y: springY,
          background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, rgba(168,85,247,0.18) 40%, rgba(236,72,153,0.08) 70%, transparent 100%)",
        }}
      />

      {/* Floating Animated Mesh blobs (ambient background depth) */}
      <div className="absolute inset-0 opacity-40 filter blur-[120px]">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full animate-blob bg-indigo-500/15"
          style={{ animationDuration: "18s" }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full animate-blob bg-purple-500/15 [animation-delay:4s]"
          style={{ animationDuration: "22s" }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full animate-blob bg-pink-500/10 [animation-delay:8s]"
          style={{ animationDuration: "26s" }}
        />
      </div>

      {/* Premium Animated Lines */}
      <div className="absolute inset-0 overflow-hidden opacity-[0.25] mix-blend-overlay">
        <svg className="absolute w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0" />
              <stop offset="25%" stopColor="#6366F1" stopOpacity="1" />
              <stop offset="75%" stopColor="#A855F7" stopOpacity="1" />
              <stop offset="100%" stopColor="#EC4899" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          <motion.path
            d="M0,30 Q25,10 50,30 T100,30"
            fill="none"
            stroke="url(#line-gradient)"
            strokeWidth="0.2"
            initial={{ y: 0 }}
            animate={{ y: [0, -15, 0, 15, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            d="M0,50 Q30,70 60,50 T100,50"
            fill="none"
            stroke="url(#line-gradient)"
            strokeWidth="0.3"
            initial={{ y: 0 }}
            animate={{ y: [0, 20, 0, -20, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            d="M0,70 Q40,50 80,70 T100,70"
            fill="none"
            stroke="url(#line-gradient)"
            strokeWidth="0.15"
            initial={{ y: 0 }}
            animate={{ y: [0, -10, 0, 10, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            d="M0,40 Q20,60 50,40 T100,40"
            fill="none"
            stroke="url(#line-gradient)"
            strokeWidth="0.25"
            initial={{ y: 0 }}
            animate={{ y: [0, 12, 0, -12, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </svg>
      </div>
    </div>
  );
}
