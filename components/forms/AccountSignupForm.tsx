"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { User, Phone, Mail, Lock, Plus, Trash2, ShieldCheck, HelpCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Partner = { email: string; share_percentage: number };

type AccountStep = {
  first_name: string;
  last_name: string;
  preferred_name: string;
  date_of_birth: string;
  gender: string;
  pronouns: string;
  personal_email: string;
  personal_phone: string;
  password: string;
  position: string;
  department_name: string;
  team_name: string;
  date_joined: string;
  company_email: string;
  work_phone: string;
  is_owner: boolean;
  partners: Partner[];
};

const GENDER_OPTIONS = [
  "Male",
  "Female",
  "Non-binary",
  "Prefer not to say",
  "Custom",
];

const PRONOUN_OPTIONS = ["he/him", "she/her", "they/them", "custom"];

export function AccountSignupForm({
  defaultValues,
  isPartnership,
  businessName,
  saveAction,
}: {
  defaultValues: Partial<AccountStep> | undefined;
  isPartnership: boolean;
  businessName: string;
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [gender, setGender] = useState(defaultValues?.gender ?? "");
  const [customGender, setCustomGender] = useState(
    !GENDER_OPTIONS.includes(defaultValues?.gender ?? "") && defaultValues?.gender ? defaultValues.gender : ""
  );
  
  const [pronouns, setPronouns] = useState(
    PRONOUN_OPTIONS.includes(defaultValues?.pronouns ?? "") ? (defaultValues?.pronouns ?? "he/him") : "custom"
  );
  const [customPronouns, setCustomPronouns] = useState(
    !PRONOUN_OPTIONS.includes(defaultValues?.pronouns ?? "") && defaultValues?.pronouns ? defaultValues.pronouns : ""
  );

  const [password, setPassword] = useState("");
  const [pwdStrength, setPwdStrength] = useState({ score: 0, text: "Too short", color: "bg-muted" });

  const [partners, setPartners] = useState<Partner[]>(
    defaultValues?.partners && defaultValues.partners.length > 0
      ? defaultValues.partners
      : [{ email: "", share_percentage: 0 }]
  );

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setPwdStrength({ score: 0, text: "Too short", color: "bg-muted" });
      return;
    }
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    let text = "Weak";
    let color = "bg-red-500";

    if (password.length < 8) {
      text = "Too short";
      color = "bg-red-400";
    } else if (score <= 2) {
      text = "Weak";
      color = "bg-orange-500";
    } else if (score === 3) {
      text = "Fair";
      color = "bg-yellow-500";
    } else if (score === 4) {
      text = "Good";
      color = "bg-emerald-400";
    } else if (score >= 5) {
      text = "Strong";
      color = "bg-emerald-600";
    }

    setPwdStrength({ score, text, color });
  }, [password]);

  const addPartner = () => {
    setPartners([...partners, { email: "", share_percentage: 0 }]);
  };

  const removePartner = (index: number) => {
    setPartners(partners.filter((_, i) => i !== index));
  };

  const updatePartner = (index: number, field: keyof Partner, value: string | number) => {
    const next = [...partners];
    if (field === "share_percentage") {
      next[index].share_percentage = Number(value);
    } else {
      next[index].email = String(value);
    }
    setPartners(next);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border-gradient rounded-3xl p-px shadow-2xl shadow-indigo-200/40"
    >
      <form action={saveAction} className="rounded-3xl bg-white/80 backdrop-blur-md px-8 py-10 space-y-8">
        <input type="hidden" name="gender" value={gender === "Custom" ? customGender : gender} />
        <input type="hidden" name="pronouns" value={pronouns === "custom" ? customPronouns : pronouns} />

        {/* SECTION 1: Personal Info */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground border-b border-border pb-2 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Personal Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="first_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                First name
              </Label>
              <Input
                id="first_name"
                name="first_name"
                required
                defaultValue={defaultValues?.first_name}
                placeholder="John"
                className="h-11 rounded-xl focus:bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Last name
              </Label>
              <Input
                id="last_name"
                name="last_name"
                required
                defaultValue={defaultValues?.last_name}
                placeholder="Doe"
                className="h-11 rounded-xl focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="preferred_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Preferred name
              </Label>
              <Input
                id="preferred_name"
                name="preferred_name"
                defaultValue={defaultValues?.preferred_name}
                placeholder="Johnny"
                className="h-11 rounded-xl focus:bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date_of_birth" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Date of Birth
              </Label>
              <Input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                defaultValue={defaultValues?.date_of_birth}
                className="h-11 rounded-xl focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Gender Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Gender
              </Label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-border bg-card px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-indigo-500/50"
              >
                <option value="" disabled>Select gender...</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              {gender === "Custom" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="pt-2"
                >
                  <Input
                    placeholder="Enter custom gender..."
                    value={customGender}
                    onChange={(e) => setCustomGender(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </motion.div>
              )}
            </div>

            {/* Pronouns Pill Toggles */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pronouns
              </Label>
              <div className="flex flex-wrap gap-2">
                {PRONOUN_OPTIONS.map((p) => {
                  const active = pronouns === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPronouns(p)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border capitalize transition-all cursor-pointer ${
                        active
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "border-border bg-white hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {p === "custom" ? "Other" : p}
                    </button>
                  );
                })}
              </div>
              {pronouns === "custom" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="pt-2"
                >
                  <Input
                    placeholder="e.g. ze/zir"
                    value={customPronouns}
                    onChange={(e) => setCustomPronouns(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </motion.div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="personal_email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Personal Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
              <Input
                id="personal_email"
                name="personal_email"
                type="email"
                required
                defaultValue={defaultValues?.personal_email}
                placeholder="you@example.com"
                className="pl-11 h-12 rounded-xl focus:bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="personal_phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Personal Phone
            </Label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
              <Input
                id="personal_phone"
                name="personal_phone"
                defaultValue={defaultValues?.personal_phone}
                placeholder="+1 (555) 000-0000"
                className="pl-11 h-12 rounded-xl focus:bg-white"
              />
            </div>
          </div>

          {/* Password with Strength Indicator */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Account Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-11 h-12 rounded-xl focus:bg-white"
              />
            </div>
            {/* Password strength bar */}
            {password && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1.5"
              >
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Strength</span>
                  <span className={pwdStrength.score >= 3 ? "text-emerald-600" : "text-orange-500"}>
                    {pwdStrength.text}
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-full flex-1 transition-colors ${
                        level <= pwdStrength.score ? pwdStrength.color : "bg-muted-foreground/10"
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* SECTION 2: Role details */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground border-b border-border pb-2 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Role at {businessName}
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="position" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Position / Job Title
            </Label>
            <Input
              id="position"
              name="position"
              defaultValue={defaultValues?.position ?? "Founder"}
              placeholder="e.g. Chief Executive Officer"
              className="h-11 rounded-xl focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="department_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Department (optional)
              </Label>
              <Input
                id="department_name"
                name="department_name"
                defaultValue={defaultValues?.department_name}
                placeholder="e.g. Executive"
                className="h-11 rounded-xl focus:bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="team_name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Team (optional)
              </Label>
              <Input
                id="team_name"
                name="team_name"
                defaultValue={defaultValues?.team_name}
                placeholder="e.g. Leadership"
                className="h-11 rounded-xl focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="date_joined" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Date Joined
              </Label>
              <Input
                id="date_joined"
                name="date_joined"
                type="date"
                defaultValue={defaultValues?.date_joined ?? new Date().toISOString().slice(0, 10)}
                className="h-11 rounded-xl focus:bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company_email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Company Email (optional)
              </Label>
              <Input
                id="company_email"
                name="company_email"
                type="email"
                defaultValue={defaultValues?.company_email}
                placeholder="you@company.com"
                className="h-11 rounded-xl focus:bg-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="work_phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Work Phone (optional)
              </Label>
            <Input
              id="work_phone"
              name="work_phone"
              defaultValue={defaultValues?.work_phone}
              placeholder="+1 (555) 000-0000"
              className="h-11 rounded-xl focus:bg-white"
            />
          </div>

          <label className="flex items-center gap-3 text-sm select-none cursor-pointer group py-1">
            <input
              type="checkbox"
              name="is_owner"
              defaultChecked={defaultValues?.is_owner ?? true}
              className="h-5 w-5 rounded-lg border-border text-primary focus:ring-primary/20 accent-primary"
            />
            <span className="font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
              I am the owner of this business
            </span>
          </label>
        </div>

        {/* SECTION 3: Partners Add/Remove Pattern */}
        {isPartnership && (
          <div className="space-y-4 bg-indigo-50/25 border border-indigo-100 rounded-2xl p-5">
            <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
              <div className="space-y-0.5">
                <h2 className="text-md font-bold text-foreground flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" /> Add Partners
                </h2>
                <p className="text-[11px] text-muted-foreground/80 leading-snug">
                  Partners will receive an invitation to claim their equity share.
                </p>
              </div>
              <button
                type="button"
                onClick={addPartner}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-indigo-100 hover:border-primary text-xs font-bold text-primary shadow-sm cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5" /> Add Partner
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <AnimatePresence initial={false}>
                {partners.map((partner, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_120px_44px] gap-3 items-end"
                  >
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Partner Email</Label>
                      <Input
                        type="email"
                        value={partner.email}
                        name={`partner_email_${index}`}
                        onChange={(e) => updatePartner(index, "email", e.target.value)}
                        placeholder="partner@company.com"
                        className="h-10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Share %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={partner.share_percentage || ""}
                        name={`partner_share_${index}`}
                        onChange={(e) => updatePartner(index, "share_percentage", e.target.value)}
                        placeholder="Share %"
                        className="h-10 rounded-xl"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removePartner(index)}
                      disabled={partners.length <= 1}
                      className="h-10 w-11 rounded-xl border border-red-100 bg-white text-red-500 hover:bg-red-50/50 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

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
