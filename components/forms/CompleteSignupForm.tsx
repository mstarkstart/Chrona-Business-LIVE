"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Building2, User, Users, CheckCircle2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type CompleteSignupFormProps = {
  workspace: {
    name: string;
    business_type: string;
  };
  account: {
    first_name: string;
    last_name: string;
    personal_email: string;
  };
  employeeCount: number;
  finishAction: () => Promise<{ success: boolean; businessId?: string; error?: string }>;
};

export function CompleteSignupForm({
  workspace,
  account,
  employeeCount,
  finishAction,
}: CompleteSignupFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setShowConfetti(true);
    setError(null);

    // Give the celebration animation some time to play before redirect
    setTimeout(async () => {
      try {
        const res = await finishAction();
        if (res && !res.success) {
          setError(res.error ?? "Signup failed.");
          setSubmitting(false);
          setShowConfetti(false);
        } else if (res && res.success && res.businessId) {
          router.push(`/dashboard?business=${res.businessId}`);
        }
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? "An unexpected error occurred.");
        setSubmitting(false);
        setShowConfetti(false);
      }
    }, 1800);
  };

  // Generate random particles for CSS confetti
  const particles = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    x: Math.random() * 400 - 200,
    y: Math.random() * -300 - 50,
    color: ["#4f46e5", "#6366f1", "#f43f5e", "#10b981", "#eab308", "#0ea5e9"][
      Math.floor(Math.random() * 6)
    ],
    size: Math.random() * 10 + 6,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8 relative overflow-hidden"
    >
      {/* Celebration Confetti Layer */}
      <AnimatePresence>
        {showConfetti && (
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 100, scale: 0, opacity: 1 }}
                animate={{
                  x: p.x,
                  y: p.y,
                  scale: [0, 1, 1.2, 0.8],
                  rotate: Math.random() * 360,
                  opacity: [1, 1, 0.8, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.6, ease: "easeOut" }}
                className="absolute rounded-full"
                style={{
                  backgroundColor: p.color,
                  width: p.size,
                  height: p.size,
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4">
        {/* Business Summary */}
        <div className="bg-white/80 backdrop-blur-md border border-border rounded-2xl p-5 shadow-sm flex items-start gap-4 hover:border-indigo-100 transition-colors">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-primary shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Company details</span>
            <h3 className="text-base font-bold text-foreground">{workspace.name}</h3>
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded capitalize">
              {workspace.business_type.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Admin Account Summary */}
        <div className="bg-white/80 backdrop-blur-md border border-border rounded-2xl p-5 shadow-sm flex items-start gap-4 hover:border-indigo-100 transition-colors">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-primary shrink-0">
            <User className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Owner administrator</span>
            <h3 className="text-base font-bold text-foreground">
              {account.first_name} {account.last_name}
            </h3>
            <span className="text-xs text-muted-foreground block">{account.personal_email}</span>
          </div>
        </div>

        {/* Invited Employees Summary */}
        <div className="bg-white/80 backdrop-blur-md border border-border rounded-2xl p-5 shadow-sm flex items-start gap-4 hover:border-indigo-100 transition-colors">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-primary shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Workspace Members</span>
            <h3 className="text-base font-bold text-foreground">
              {employeeCount > 0 ? `${employeeCount} Pending Invitations` : "No other users added yet"}
            </h3>
            <span className="text-xs text-muted-foreground block">
              {employeeCount > 0 ? "Invitation links will be generated on setup complete" : "You can invite employees from the dashboard"}
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation & Submission Form */}
      <form onSubmit={handleSubmit} className="border-t border-border pt-6 flex flex-col items-stretch gap-4">
        {error && (
          <div className="bg-red-50 text-red-700 text-xs font-semibold p-4 rounded-xl border border-red-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}
        <Button
          type="submit"
          disabled={submitting}
          size="lg"
          className="w-full h-12 rounded-xl bg-primary text-white font-bold shadow-lg hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Setting Up Workspace...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 fill-white/20 animate-pulse" />
              Create my business
            </>
          )}
        </Button>
        <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" /> Secure workspace initialization
        </span>
      </form>
    </motion.div>
  );
}
