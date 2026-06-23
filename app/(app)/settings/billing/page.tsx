"use client";

import { useState } from "react";
import { Check, Star, Zap, Building2, Sparkles, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

type Plan = "free" | "starter" | "pro" | "business";

interface PricingTier {
  id: Plan;
  name: string;
  price: string;
  priceDetail: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  popular?: boolean;
}

const TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    priceDetail: "forever",
    description: "Perfect for individuals and small experiments.",
    icon: <Sparkles size={20} className="text-gray-400" />,
    features: [
      "Up to 3 team members",
      "5 active projects",
      "Basic task management",
      "In-app notifications",
      "Community support",
      "1 workspace",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "$6",
    priceDetail: "per user / month",
    description: "For small teams ready to move fast.",
    icon: <Zap size={20} className="text-indigo-400" />,
    features: [
      "Up to 15 team members",
      "Unlimited projects",
      "Task approvals & assignments",
      "Calendar & scheduling",
      "Email notifications",
      "Priority support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$12",
    priceDetail: "per user / month",
    description: "Everything your growing team needs.",
    icon: <Star size={20} className="text-indigo-600" />,
    features: [
      "Unlimited team members",
      "Advanced analytics & reports",
      "Automations (up to 50 rules)",
      "Chrona Nexus AI (exclusive)",
      "Custom roles & permissions",
      "API access + webhooks",
    ],
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    price: "$20",
    priceDetail: "per user / month",
    description: "Enterprise-grade for large organisations.",
    icon: <Building2 size={20} className="text-purple-500" />,
    features: [
      "Everything in Pro",
      "Unlimited automations",
      "SSO / SAML authentication",
      "Dedicated account manager",
      "SLA guarantee (99.9% uptime)",
      "Custom onboarding & training",
    ],
  },
];

const FEATURE_GATE_TABLE: {
  feature: string;
  free: boolean;
  starter: boolean;
  pro: boolean;
  business: boolean;
}[] = [
  { feature: "Task management",       free: true,  starter: true,  pro: true,  business: true  },
  { feature: "Team members",          free: false, starter: false, pro: true,  business: true  },
  { feature: "Task approvals",        free: false, starter: true,  pro: true,  business: true  },
  { feature: "Calendar & scheduling", free: false, starter: true,  pro: true,  business: true  },
  { feature: "Automations",           free: false, starter: false, pro: true,  business: true  },
  { feature: "AI assistant",          free: false, starter: false, pro: true,  business: true  },
  { feature: "Advanced analytics",    free: false, starter: false, pro: true,  business: true  },
  { feature: "API access",            free: false, starter: false, pro: true,  business: true  },
  { feature: "SSO / SAML",            free: false, starter: false, pro: false, business: true  },
  { feature: "Dedicated support",     free: false, starter: false, pro: false, business: true  },
  { feature: "Chrona Nexus AI",       free: false, starter: false, pro: true,  business: false },
];

export default function BillingPage() {
  const currentPlan: Plan = "free";
  const [toast, setToast] = useState<string | null>(null);

  function handleUpgrade(plan: Plan) {
    setToast(
      `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan — Coming Soon! Billing is not yet active.`
    );
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="p-6 space-y-10 max-w-5xl mx-auto animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight gradient-text inline-block">
          Billing &amp; Plan
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          You are currently on the{" "}
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
            Free plan
          </span>
          . Upgrade anytime to unlock more features.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm bg-gray-900 text-white text-sm rounded-xl px-4 py-3 shadow-xl animate-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Pricing grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
        {TIERS.map((tier) => {
          const isCurrent = tier.id === currentPlan;
          const isPopular = tier.popular;

          if (isPopular) {
            return (
              <div
                key={tier.id}
                className="relative p-px rounded-[18px] flex flex-col"
                style={{
                  background:
                    "linear-gradient(135deg, #4338ca 0%, #6366f1 30%, #8b5cf6 60%, #6366f1 85%, #4338ca 100%)",
                  boxShadow:
                    "0 8px 32px rgba(99,102,241,0.28), 0 2px 8px rgba(99,102,241,0.18)",
                }}
              >
                {/* Popular badge */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <span
                    className="inline-flex items-center gap-1.5 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg"
                    style={{
                      background:
                        "linear-gradient(120deg, #4338ca 0%, #6366f1 50%, #8b5cf6 100%)",
                      boxShadow: "0 2px 12px rgba(99,102,241,0.40)",
                    }}
                  >
                    <Star size={9} fill="currentColor" />
                    Most Popular
                  </span>
                </div>

                <div
                  className="relative flex flex-col rounded-[17px] flex-1"
                  style={{
                    background: "rgba(255,255,255,0.78)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                  }}
                >
                  <div className="p-5 flex-1 space-y-4">
                    {/* Icon + name */}
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%)",
                          border: "1px solid rgba(99,102,241,0.25)",
                        }}
                      >
                        <Star size={20} className="text-indigo-600" />
                      </span>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {tier.name}
                      </span>
                    </div>

                    {/* Price */}
                    <div>
                      <span
                        className="text-3xl font-bold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {tier.price}
                      </span>
                      <span
                        className="text-xs ml-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {tier.priceDetail}
                      </span>
                    </div>

                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {tier.description}
                    </p>

                    {/* Nexus AI badge */}
                    <div
                      className="rounded-xl px-3 py-2.5 flex items-center gap-2.5"
                      style={{
                        background:
                          "linear-gradient(120deg, rgba(67,56,202,0.10) 0%, rgba(139,92,246,0.14) 100%)",
                        border: "1px solid rgba(99,102,241,0.30)",
                      }}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background: "linear-gradient(135deg, #4338ca, #8b5cf6)",
                          boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
                        }}
                      >
                        <Brain size={14} className="text-white" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-[10px] font-black uppercase tracking-widest"
                          style={{
                            background:
                              "linear-gradient(120deg, #4338ca 0%, #6366f1 50%, #8b5cf6 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                          }}
                        >
                          Chrona Nexus AI
                        </p>
                        <p
                          className="text-[10px] leading-tight mt-0.5"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Exclusive AI workspace intelligence
                        </p>
                      </div>
                      <span
                        className="ml-auto shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md text-white"
                        style={{
                          background: "linear-gradient(120deg, #4338ca, #8b5cf6)",
                        }}
                      >
                        Pro Only
                      </span>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2">
                      {tier.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-xs"
                          style={{ color: "var(--text-body)" }}
                        >
                          <Check size={13} className="mt-0.5 shrink-0 text-indigo-500" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  <div className="p-5 pt-0">
                    <Button
                      onClick={() => handleUpgrade(tier.id)}
                      className="w-full text-xs text-white border-0 shadow-lg hover:brightness-110 active:scale-[0.97]"
                      style={{
                        background:
                          "linear-gradient(120deg, #4338ca 0%, #6366f1 50%, #8b5cf6 100%)",
                        boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                      }}
                      size="sm"
                    >
                      Upgrade to {tier.name}
                    </Button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={tier.id}
              className="relative flex flex-col glass-card rounded-2xl"
            >
              <div className="p-5 flex-1 space-y-4">
                {/* Icon + name */}
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/60">
                    {tier.icon}
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {tier.name}
                  </span>
                </div>

                {/* Price */}
                <div>
                  <span
                    className="text-3xl font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {tier.price}
                  </span>
                  <span
                    className="text-xs ml-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {tier.priceDetail}
                  </span>
                </div>

                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {tier.description}
                </p>

                {/* Features */}
                <ul className="space-y-2">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-xs"
                      style={{ color: "var(--text-body)" }}
                    >
                      <Check size={13} className="mt-0.5 shrink-0 text-indigo-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="p-5 pt-0">
                {isCurrent ? (
                  <div
                    className="w-full text-center rounded-lg py-2 text-xs font-medium"
                    style={{
                      background: "rgba(255,255,255,0.50)",
                      border: "1px solid rgba(255,255,255,0.70)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Current Plan
                  </div>
                ) : (
                  <Button
                    onClick={() => handleUpgrade(tier.id)}
                    variant="outline"
                    className="w-full text-xs"
                    size="sm"
                  >
                    Upgrade to {tier.name}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature gating table */}
      <div className="space-y-3">
        <h2
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Feature availability by plan
        </h2>
        <div
          className="overflow-x-auto rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.45)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.50)",
            boxShadow:
              "0 2px 16px rgba(100,140,180,0.12), inset 0 1px 0 rgba(255,255,255,0.80)",
          }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b"
                style={{
                  background: "rgba(255,255,255,0.30)",
                  borderColor: "rgba(200,220,235,0.60)",
                }}
              >
                <th
                  className="text-left px-4 py-3 text-xs font-semibold w-1/2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Feature
                </th>
                {(["Free", "Starter", "Pro", "Business"] as const).map((h) => (
                  <th
                    key={h}
                    className={`text-center px-3 py-3 text-xs font-semibold ${
                      h === "Pro" ? "text-indigo-600" : ""
                    }`}
                    style={h !== "Pro" ? { color: "var(--text-muted)" } : {}}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_GATE_TABLE.map((row, i) => {
                const isNexusRow = row.feature === "Chrona Nexus AI";
                return (
                  <tr
                    key={row.feature}
                    className="border-b last:border-0"
                    style={{
                      background: isNexusRow
                        ? "linear-gradient(120deg, rgba(67,56,202,0.06) 0%, rgba(139,92,246,0.08) 100%)"
                        : i % 2 === 0
                        ? "rgba(255,255,255,0.28)"
                        : "rgba(255,255,255,0.15)",
                      borderColor: isNexusRow
                        ? "rgba(99,102,241,0.20)"
                        : "rgba(200,220,235,0.40)",
                    }}
                  >
                    <td
                      className="px-4 py-2.5 text-xs font-medium"
                      style={{ color: "var(--text-body)" }}
                    >
                      {isNexusRow ? (
                        <span className="flex items-center gap-1.5">
                          <Brain size={12} className="text-indigo-500 shrink-0" />
                          <span className="gradient-text font-semibold">
                            {row.feature}
                          </span>
                        </span>
                      ) : (
                        row.feature
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <PlanCheck checked={row.free} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <PlanCheck checked={row.starter} />
                    </td>
                    <td
                      className="px-3 py-2.5 text-center"
                      style={{ background: "rgba(99,102,241,0.06)" }}
                    >
                      {isNexusRow ? (
                        <span className="inline-flex justify-center">
                          <Star
                            size={13}
                            className="text-indigo-600"
                            fill="currentColor"
                          />
                        </span>
                      ) : (
                        <PlanCheck checked={row.pro} highlight />
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <PlanCheck checked={row.business} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Billing footer note */}
      <p className="text-xs pb-4" style={{ color: "var(--text-muted)" }}>
        All prices are in USD. Billing is billed monthly per active user. Upgrade
        or downgrade at any time — changes apply from the next billing cycle.
        Payment processing coming soon.
      </p>
    </div>
  );
}

function PlanCheck({
  checked,
  highlight,
}: {
  checked: boolean;
  highlight?: boolean;
}) {
  if (checked) {
    return (
      <span className="inline-flex justify-center">
        <Check
          size={14}
          className={highlight ? "text-indigo-600" : "text-[#34C98A]"}
        />
      </span>
    );
  }
  return (
    <span
      className="inline-block w-3 h-0.5 rounded mx-auto"
      style={{ background: "rgba(200,220,235,0.80)" }}
    />
  );
}
