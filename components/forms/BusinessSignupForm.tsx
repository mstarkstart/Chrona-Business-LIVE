"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Briefcase, Calendar, Info, Layers, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

type BusinessStep = {
  name: string;
  founding_date: string;
  business_type: "self_employed" | "partnership" | "corporation";
  industry: string;
  services: string;
  employee_count_estimate: number;
  team_count_estimate: number;
};

const INDUSTRIES = [
  { value: "Tech", label: "Technology", icon: "💻" },
  { value: "Healthcare", label: "Healthcare", icon: "🏥" },
  { value: "Restaurant", label: "Restaurant", icon: "🍽️" },
  { value: "Retail", label: "Retail", icon: "🛒" },
  { value: "Automotive", label: "Automotive", icon: "🚗" },
  { value: "Other", label: "Other Business", icon: "🏢" },
];

const BUSINESS_TYPES = [
  { value: "self_employed", label: "Self Employed", desc: "One-person operation" },
  { value: "partnership", label: "Partnership", desc: "Shared ownership business" },
  { value: "corporation", label: "Corporation", desc: "Separate legal entity" },
] as const;

export function BusinessSignupForm({
  defaultValues,
  saveAction,
}: {
  defaultValues: Partial<BusinessStep> | undefined;
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [industry, setIndustry] = useState(defaultValues?.industry ?? "Tech");
  const [bizType, setBizType] = useState<"self_employed" | "partnership" | "corporation">(
    defaultValues?.business_type ?? "self_employed"
  );
  const [employees, setEmployees] = useState(defaultValues?.employee_count_estimate ?? 5);
  const [teams, setTeams] = useState(defaultValues?.team_count_estimate ?? 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border-gradient rounded-3xl p-px shadow-2xl shadow-indigo-100/50"
    >
      <form action={saveAction} className="rounded-3xl bg-white/80 backdrop-blur-md px-8 py-10 space-y-6">
        {/* Hidden Fields for Custom UI widgets */}
        <input type="hidden" name="industry" value={industry} />
        <input type="hidden" name="business_type" value={bizType} />
        <input type="hidden" name="employee_count_estimate" value={employees} />
        <input type="hidden" name="team_count_estimate" value={teams} />

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Business Name
          </Label>
          <div className="relative">
            <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
            <Input
              id="name"
              name="name"
              required
              defaultValue={defaultValues?.name}
              placeholder="e.g. Acme Corporation"
              className="pl-11 h-12 rounded-xl border-border focus:bg-white"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="founding_date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Founding Date
          </Label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
            <Input
              id="founding_date"
              name="founding_date"
              type="date"
              defaultValue={defaultValues?.founding_date}
              className="pl-11 h-12 rounded-xl border-border focus:bg-white"
            />
          </div>
        </div>

        {/* Business Type Tiles */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Business Type
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {BUSINESS_TYPES.map((t) => {
              const active = bizType === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setBizType(t.value)}
                  className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    active
                      ? "border-primary bg-indigo-50/50 shadow-md ring-2 ring-primary/20"
                      : "border-border bg-white/50 hover:bg-white hover:border-indigo-200"
                  }`}
                >
                  <span className={`text-sm font-semibold capitalize ${active ? "text-primary" : "text-foreground"}`}>
                    {t.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground/80 mt-1 leading-tight">{t.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Industry Grid Tiles */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Industry
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {INDUSTRIES.map((ind) => {
              const active = industry === ind.value;
              return (
                <button
                  key={ind.value}
                  type="button"
                  onClick={() => setIndustry(ind.value)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    active
                      ? "border-primary bg-indigo-50/50 shadow-md ring-2 ring-primary/20 text-primary"
                      : "border-border bg-white/50 hover:bg-white hover:border-indigo-200 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-xl">{ind.icon}</span>
                  <span>{ind.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="services" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Services / Description
          </Label>
          <div className="relative">
            <Info className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground/60" />
            <textarea
              id="services"
              name="services"
              defaultValue={defaultValues?.services}
              rows={3}
              placeholder="Tell us briefly about what services you offer..."
              className="pl-11 w-full rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm focus:border-indigo-500/50 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Custom Sliders for employee and team estimate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground/80" /> Estimated Employees
              </Label>
              <span className="text-xs font-bold bg-indigo-50 text-primary px-2.5 py-1 rounded-full border border-indigo-100">
                {employees === 50 ? "50+" : employees}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              value={employees}
              onChange={(e) => setEmployees(parseInt(e.target.value))}
              className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/70 font-semibold">
              <span>1</span>
              <span>25</span>
              <span>50+</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-muted-foreground/80" /> Estimated Teams
              </Label>
              <span className="text-xs font-bold bg-indigo-50 text-primary px-2.5 py-1 rounded-full border border-indigo-100">
                {teams === 15 ? "15+" : teams}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={15}
              value={teams}
              onChange={(e) => setTeams(parseInt(e.target.value))}
              className="w-full accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/70 font-semibold">
              <span>1</span>
              <span>7</span>
              <span>15+</span>
            </div>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-between gap-3">
          <Button
            type="button"
            onClick={() => router.back()}
            variant="ghost"
            size="lg"
            className="h-12 px-5 rounded-xl text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <Button type="submit" size="lg" className="px-8 h-12 rounded-xl bg-primary text-white font-semibold shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center gap-1.5">
            Continue
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
