"use client";

import { useState } from "react";
import { Check, Star, Zap, Building2, Sparkles } from "lucide-react";
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
      "AI task assistant",
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

const FEATURE_GATE_TABLE: { feature: string; free: boolean; starter: boolean; pro: boolean; business: boolean }[] = [
  { feature: "Task management",        free: true,  starter: true,  pro: true,  business: true  },
  { feature: "Team members",           free: false, starter: false, pro: true,  business: true  },
  { feature: "Task approvals",         free: false, starter: true,  pro: true,  business: true  },
  { feature: "Calendar & scheduling",  free: false, starter: true,  pro: true,  business: true  },
  { feature: "Automations",            free: false, starter: false, pro: true,  business: true  },
  { feature: "AI assistant",           free: false, starter: false, pro: true,  business: true  },
  { feature: "Advanced analytics",     free: false, starter: false, pro: true,  business: true  },
  { feature: "API access",             free: false, starter: false, pro: true,  business: true  },
  { feature: "SSO / SAML",             free: false, starter: false, pro: false, business: true  },
  { feature: "Dedicated support",      free: false, starter: false, pro: false, business: true  },
];

export default function BillingPage() {
  const currentPlan: Plan = "free";
  const [toast, setToast] = useState<string | null>(null);

  function handleUpgrade(plan: Plan) {
    setToast(`${plan.charAt(0).toUpperCase() + plan.slice(1)} plan — Coming Soon! Billing is not yet active.`);
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="p-6 space-y-10 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Billing &amp; Plan</h1>
        <p className="mt-1 text-sm text-gray-500">
          You are currently on the{" "}
          <span className="font-medium text-gray-700">Free plan</span>. Upgrade
          anytime to unlock more features.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm bg-gray-900 text-white text-sm rounded-xl px-4 py-3 shadow-xl animate-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Pricing grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {TIERS.map((tier) => {
          const isCurrent = tier.id === currentPlan;
          const isPopular = tier.popular;

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col bg-white rounded-2xl border shadow-sm transition-all ${
                isPopular
                  ? "border-indigo-500 ring-2 ring-indigo-500 shadow-indigo-100"
                  : "border-gray-200 hover:border-indigo-200 hover:shadow-md"
              }`}
            >
              {/* Popular badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                    <Star size={10} />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-5 flex-1 space-y-4">
                {/* Icon + name */}
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      isPopular ? "bg-indigo-50" : "bg-gray-100"
                    }`}
                  >
                    {tier.icon}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{tier.name}</span>
                </div>

                {/* Price */}
                <div>
                  <span className="text-3xl font-bold text-gray-900">{tier.price}</span>
                  <span className="text-xs text-gray-400 ml-1">{tier.priceDetail}</span>
                </div>

                <p className="text-xs text-gray-500">{tier.description}</p>

                {/* Features */}
                <ul className="space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <Check size={13} className="mt-0.5 shrink-0 text-indigo-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="p-5 pt-0">
                {isCurrent ? (
                  <div className="w-full text-center rounded-lg bg-gray-100 py-2 text-xs font-medium text-gray-500">
                    Current Plan
                  </div>
                ) : (
                  <Button
                    onClick={() => handleUpgrade(tier.id)}
                    variant={isPopular ? "default" : "outline"}
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
        <h2 className="text-sm font-semibold text-gray-700">Feature availability by plan</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-1/2">
                  Feature
                </th>
                {(["Free", "Starter", "Pro", "Business"] as const).map((h) => (
                  <th
                    key={h}
                    className={`text-center px-3 py-3 text-xs font-semibold ${
                      h === "Pro" ? "text-indigo-600" : "text-gray-500"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_GATE_TABLE.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b border-gray-100 last:border-0 ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  }`}
                >
                  <td className="px-4 py-2.5 text-xs text-gray-700 font-medium">
                    {row.feature}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <PlanCheck checked={row.free} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <PlanCheck checked={row.starter} />
                  </td>
                  <td className="px-3 py-2.5 text-center bg-indigo-50/30">
                    <PlanCheck checked={row.pro} highlight />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <PlanCheck checked={row.business} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Billing footer note */}
      <p className="text-xs text-gray-400 pb-4">
        All prices are in USD. Billing is billed monthly per active user.
        Upgrade or downgrade at any time — changes apply from the next billing cycle.
        Payment processing coming soon.
      </p>
    </div>
  );
}

function PlanCheck({ checked, highlight }: { checked: boolean; highlight?: boolean }) {
  if (checked) {
    return (
      <span className="inline-flex justify-center">
        <Check
          size={14}
          className={highlight ? "text-indigo-600" : "text-green-500"}
        />
      </span>
    );
  }
  return (
    <span className="inline-block w-3 h-0.5 bg-gray-200 rounded mx-auto" />
  );
}
