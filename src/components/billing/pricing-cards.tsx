"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import {
  formatNaira,
  PLANS,
  type PlanId,
} from "@/lib/billing/plans";

interface PricingCardsProps {
  currentPlan: PlanId;
  pendingPlanId?: PlanId | null;
}

/**
 * The original plans design from the scope---plans-&-billing prototype:
 * a 3-card cream grid ("Choose The Plan Right For You") with the red
 * "Recommended" banner, warm buttons, and the Current plan badge.
 *
 * Billing behavior:
 * - Pro Monthly -> Pro Yearly: PRORATED charge (full yearly price minus credit
 *   for unused days of the current month), activates immediately. The proration
 *   math is persisted in a Proration row.
 * - Free -> Pro: full price, activates immediately.
 * - Pro Yearly -> Pro Monthly (downgrade): full price charged, applied at the
 *   end of the current period ("Applies at renewal").
 * - Pro -> Free: no-charge "Switch at renewal" schedule.
 */
export default function PricingCards({
  currentPlan,
  pendingPlanId = null,
}: PricingCardsProps) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>("pro_yearly");
  const [submittingPlan, setSubmittingPlan] = useState<PlanId | null>(null);
  const [schedulingPlan, setSchedulingPlan] = useState<PlanId | null>(null);

  const isCurrent = (plan: PlanId) => plan === currentPlan;
  /** Pro Monthly -> Pro Yearly upgrade: prorated charge, activates immediately. */
  const isProratedUpgrade = currentPlan === "pro_monthly";
  /** Pro Yearly -> Pro Monthly downgrade: charged in full, applied at period end. */
  const isDeferredDowngrade = currentPlan === "pro_yearly";

  const handleSelect = (plan: PlanId) => {
    setSelectedPlan(plan);
  };

  const handleSubscribe = async (plan: PlanId) => {
    if (submittingPlan) return;
    setSubmittingPlan(plan);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan }),
      });
      const data = await res.json();
      if (!res.ok || typeof data.paymentLink !== "string") {
        alert(data.error ?? "Payment could not be started.");
        return;
      }
      window.location.href = data.paymentLink;
    } catch {
      alert("Network error — please try again.");
    } finally {
      setSubmittingPlan(null);
    }
  };

  const handleSchedule = async (plan: PlanId) => {
    if (schedulingPlan) return;
    setSchedulingPlan(plan);
    try {
      const res = await fetch("/api/billing/plan-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(data?.error ?? "Could not schedule the change.");
        return;
      }
      router.refresh();
    } catch {
      alert("Network error — please try again.");
    } finally {
      setSchedulingPlan(null);
    }
  };

  const price = (plan: PlanId) => formatNaira(PLANS[plan].pricePerMonth);
  const periodSuffix = (plan: PlanId) =>
    PLANS[plan].periodLabel === "/year" ? "/Year" : "/Month";

  return (
    <div className="mx-auto w-full max-w-[1160px] px-4 py-6 sm:px-6 sm:py-10 font-sans tracking-[-0.02em]">
      <div className="mb-8 text-center sm:mb-10 md:mb-12 lg:mb-14">
        <h1 className="mb-2 font-display text-2xl tracking-tight text-neutral-500 sm:text-3xl md:text-[34px] lg:text-[40px] sm:mb-3">
          Choose The Plan Right For You
        </h1>
        <p className="text-sm tracking-[-0.02em] text-neutral-300 sm:text-base md:text-lg">
          Use a plan that fits your workflow
        </p>
      </div>

      <div className="mx-auto grid w-full grid-cols-1 gap-5 items-stretch md:max-w-none md:grid-cols-3 sm:gap-6 md:gap-4 lg:gap-6 xl:gap-7 max-w-[440px]">
        {/* FREE */}
        <div
          onClick={() => {
            if (currentPlan !== "free") handleSelect("free");
          }}
          className={`relative flex h-full min-h-[460px] flex-col justify-between rounded-[22px] border p-6 transition-all duration-200 sm:min-h-[500px] sm:rounded-[26px] sm:p-7 lg:min-h-[520px] lg:p-7 xl:p-8 md:p-5 ${
            currentPlan === "free"
              ? "cursor-default border-transparent"
              : selectedPlan === "free"
                ? "cursor-pointer border-[1.5px] border-[#D9241B]"
                : "cursor-pointer border-transparent hover:border-neutral-200"
          }`}
          style={{ backgroundColor: "#FFFBF0" }}
        >
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <div className="mb-3 flex min-h-[28px] items-center justify-between">
                <h3 className="font-sans text-[15px] font-semibold tracking-[-0.02em] text-[#5B6070] sm:text-[16px]">
                  {PLANS.free.name}
                </h3>
                {currentPlan === "free" && (
                  <span className="inline-flex select-none items-center rounded-full bg-[#FCE8E8] px-2.5 py-0.5 text-[11px] font-semibold tracking-[-0.02em] text-[#D9241B] sm:px-3 sm:py-1 sm:text-xs">
                    Current plan
                  </span>
                )}
              </div>

              <div className="mb-3 flex items-baseline">
                <span className="font-sans text-3xl font-bold leading-none tracking-tight text-[#09090b] sm:text-4xl md:text-[32px] lg:text-[42px] xl:text-[44px]">
                  {price("free")}
                </span>
                <span className="ml-1.5 font-sans text-sm font-normal tracking-[-0.02em] text-[#5B6070] sm:text-base">
                  /Month
                </span>
              </div>

              <p className="mb-6 font-sans text-xs leading-relaxed tracking-[-0.02em] text-[#5B6070] sm:mb-8 sm:text-sm">
                {PLANS.free.description}
              </p>

              <div className="mb-6 sm:mb-8">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isCurrent("free")) handleSchedule("free");
                  }}
                  disabled={
                    isCurrent("free") ||
                    pendingPlanId === "free" ||
                    schedulingPlan === "free"
                  }
                  className={`w-full rounded-xl px-4 py-3 font-sans text-xs font-semibold transition-all duration-150 sm:py-3.5 sm:text-sm ${
                    isCurrent("free") || pendingPlanId === "free"
                      ? "cursor-not-allowed bg-[#ECE7E0] border border-[#D5D0C7] text-[#5B6070]"
                      : "cursor-pointer bg-transparent border border-black text-black hover:bg-black/5 active:scale-[0.99]"
                  }`}
                >
                  {isCurrent("free")
                    ? "Current plan"
                    : pendingPlanId === "free"
                      ? "Scheduled"
                      : schedulingPlan === "free"
                        ? "Scheduling…"
                        : "Switch at renewal"}
                </button>
              </div>

              <ul className="space-y-3 font-sans text-xs sm:space-y-3.5 sm:text-[13px] lg:space-y-4 lg:text-sm">
                {PLANS.free.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2.5 sm:gap-3"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#5B6070] stroke-[1.5] sm:h-5 sm:w-5" />
                    <span className="tracking-[-0.02em] text-[#5B6070]">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* PRO YEARLY (RECOMMENDED) */}
        <div
          onClick={() => {
            if (currentPlan !== "pro_yearly") handleSelect("pro_yearly");
          }}
          className={`relative flex h-full min-h-[460px] flex-col justify-between overflow-hidden rounded-[22px] transition-all duration-200 sm:min-h-[500px] sm:rounded-[26px] lg:min-h-[520px] ${
            currentPlan === "pro_yearly"
              ? "cursor-default border border-transparent"
              : selectedPlan === "pro_yearly"
                ? "cursor-pointer border-[1.5px] border-[#D9241B]"
                : "cursor-pointer border border-transparent hover:border-neutral-200"
          }`}
          style={{ backgroundColor: "#FFFBF0" }}
        >
          <div className="w-full rounded-t-[22px] bg-[#D9241B] px-4 py-2 text-center text-white sm:rounded-t-[26px] sm:py-2.5">
            <span className="font-sans text-sm font-bold tracking-tight sm:text-base">
              Recommended
            </span>
          </div>

          <div className="flex flex-1 flex-col justify-between p-6 pt-5 sm:p-7 md:p-5 lg:p-7 xl:p-8 md:pt-5 lg:pt-6 sm:pt-6">
            <div>
              <div className="mb-3 flex min-h-[28px] items-center justify-between">
                <h3 className="font-sans text-[15px] font-semibold tracking-[-0.02em] text-[#5B6070] sm:text-[16px]">
                  {PLANS.pro_yearly.name}
                </h3>
                <span className="flex items-center gap-2">
                  {currentPlan === "pro_yearly" && (
                    <span className="inline-flex select-none items-center rounded-full bg-[#FCE8E8] px-2.5 py-0.5 text-[11px] font-semibold tracking-[-0.02em] text-[#D9241B] sm:px-3 sm:py-1 sm:text-xs">
                      Current plan
                    </span>
                  )}
                  {currentPlan !== "pro_yearly" && (
                    <span className="inline-flex select-none items-center rounded-full bg-[#FCE8E8] px-2.5 py-0.5 text-[11px] font-semibold tracking-[-0.02em] text-[#D9241B] sm:px-3 sm:py-1 sm:text-xs">
                      {PLANS.pro_yearly.discountBadge}
                    </span>
                  )}
                </span>
              </div>

              <div className="mb-3 flex items-baseline">
                <span className="font-sans text-3xl font-bold leading-none tracking-tight text-[#09090b] sm:text-4xl md:text-[32px] lg:text-[42px] xl:text-[44px]">
                  {price("pro_yearly")}
                </span>
                <span className="ml-1.5 font-sans text-sm font-normal tracking-[-0.02em] text-[#5B6070] sm:text-base">
                  {periodSuffix("pro_yearly")}
                </span>
              </div>

              <p className="mb-6 font-sans text-xs leading-relaxed tracking-[-0.02em] text-[#5B6070] sm:mb-8 sm:text-sm">
                {PLANS.pro_yearly.description}
              </p>

              <div className="mb-6 sm:mb-8">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isCurrent("pro_yearly")) handleSubscribe("pro_yearly");
                  }}
                  disabled={
                    submittingPlan === "pro_yearly" ||
                    currentPlan === "pro_yearly" ||
                    pendingPlanId === "pro_yearly"
                  }
                  className={`w-full rounded-xl px-4 py-3 font-sans text-xs font-semibold transition-all duration-150 sm:py-3.5 sm:text-sm ${
                    currentPlan === "pro_yearly" || pendingPlanId === "pro_yearly"
                      ? "cursor-not-allowed bg-[#ECE7E0] border border-[#D5D0C7] text-[#5B6070]"
                      : selectedPlan === "pro_yearly"
                        ? "cursor-pointer bg-[#D9241B] text-white hover:bg-[#C21E15]"
                        : "cursor-pointer bg-transparent border border-black text-black hover:bg-black/5 active:scale-[0.99]"
                  } ${
                    submittingPlan === "pro_yearly" &&
                    currentPlan !== "pro_yearly"
                      ? "opacity-70"
                      : ""
                  }`}
                >
                  {currentPlan === "pro_yearly"
                    ? "Current plan"
                    : pendingPlanId === "pro_yearly"
                      ? "Scheduled"
                      : submittingPlan === "pro_yearly"
                        ? "Starting…"
                        : "Get started"}
                </button>
                {isProratedUpgrade && (
                  <p className="mt-2 text-center text-[11px] font-medium text-[#71717a]">
                    Prorated — activates immediately
                  </p>
                )}
              </div>

              <ul className="space-y-3 font-sans text-xs sm:space-y-3.5 sm:text-[13px] lg:space-y-4 lg:text-sm">
                {PLANS.pro_yearly.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2.5 sm:gap-3"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#5B6070] stroke-[1.5] sm:h-5 sm:w-5" />
                    <span className="tracking-[-0.02em] text-[#5B6070]">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* PRO MONTHLY */}
        <div
          onClick={() => {
            if (currentPlan !== "pro_monthly") handleSelect("pro_monthly");
          }}
          className={`relative flex h-full min-h-[460px] flex-col justify-between rounded-[22px] border p-6 transition-all duration-200 sm:min-h-[500px] sm:rounded-[26px] sm:p-7 lg:min-h-[520px] lg:p-7 xl:p-8 md:p-5 ${
            currentPlan === "pro_monthly"
              ? "cursor-default border-transparent"
              : selectedPlan === "pro_monthly"
                ? "cursor-pointer border-[1.5px] border-[#D9241B]"
                : "cursor-pointer border-transparent hover:border-neutral-200"
          }`}
          style={{ backgroundColor: "#FFFBF0" }}
        >
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <div className="mb-3 flex min-h-[28px] items-center justify-between">
                <h3 className="font-sans text-[15px] font-semibold tracking-[-0.02em] text-[#5B6070] sm:text-[16px]">
                  {PLANS.pro_monthly.name}
                </h3>
                {currentPlan === "pro_monthly" && (
                  <span className="inline-flex select-none items-center rounded-full bg-[#FCE8E8] px-2.5 py-0.5 text-[11px] font-semibold tracking-[-0.02em] text-[#D9241B] sm:px-3 sm:py-1 sm:text-xs">
                    Current plan
                  </span>
                )}
              </div>

              <div className="mb-3 flex items-baseline">
                <span className="font-sans text-3xl font-bold leading-none tracking-tight text-[#09090b] sm:text-4xl md:text-[32px] lg:text-[42px] xl:text-[44px]">
                  {price("pro_monthly")}
                </span>
                <span className="ml-1.5 font-sans text-sm font-normal tracking-[-0.02em] text-[#5B6070] sm:text-base">
                  /Month
                </span>
              </div>

              <p className="mb-6 font-sans text-xs leading-relaxed tracking-[-0.02em] text-[#5B6070] sm:mb-8 sm:text-sm">
                {PLANS.pro_monthly.description}
              </p>

              <div className="mb-6 sm:mb-8">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isCurrent("pro_monthly")) handleSubscribe("pro_monthly");
                  }}
                  disabled={
                    submittingPlan === "pro_monthly" ||
                    currentPlan === "pro_monthly" ||
                    pendingPlanId === "pro_monthly"
                  }
                  className={`w-full rounded-xl px-4 py-3 font-sans text-xs font-semibold transition-all duration-150 sm:py-3.5 sm:text-sm ${
                    currentPlan === "pro_monthly" ||
                    pendingPlanId === "pro_monthly"
                      ? "cursor-not-allowed bg-[#ECE7E0] border border-[#D5D0C7] text-[#5B6070]"
                      : selectedPlan === "pro_monthly"
                        ? "cursor-pointer bg-[#D9241B] text-white hover:bg-[#C21E15]"
                        : "cursor-pointer bg-transparent border border-black text-black hover:bg-black/5 active:scale-[0.99]"
                  } ${
                    submittingPlan === "pro_monthly" &&
                    currentPlan !== "pro_monthly"
                      ? "opacity-70"
                      : ""
                  }`}
                >
                  {currentPlan === "pro_monthly"
                    ? "Current plan"
                    : pendingPlanId === "pro_monthly"
                      ? "Scheduled"
                      : submittingPlan === "pro_monthly"
                        ? "Starting…"
                        : "Get started"}
                </button>
                {isDeferredDowngrade && (
                  <p className="mt-2 text-center text-[11px] font-medium text-[#71717a]">
                    Applies at renewal
                  </p>
                )}
              </div>

              <ul className="space-y-3 font-sans text-xs sm:space-y-3.5 sm:text-[13px] lg:space-y-4 lg:text-sm">
                {PLANS.pro_monthly.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2.5 sm:gap-3"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#5B6070] stroke-[1.5] sm:h-5 sm:w-5" />
                    <span className="tracking-[-0.02em] text-[#5B6070]">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}