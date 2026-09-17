/**
 * Plan definitions shared between the server (subscribe/status logic) and the
 * client (pricing cards + checkout). Plain data + types only so this module is
 * safe to import from both server components and "use client" components.
 *
 * MONEY RULE: every amount in this system lives as a WHOLE number of kobo
 * (1 naira = 100 kobo). Nothing is stored as a decimal, and nothing is stored
 * as naira. Flutterwave wants naira integers when we talk to IT, so we convert
 * kobo -> naira right before building the payment request and naira -> kobo
 * right after receiving amounts in a webhook/verification response.
 */

export type PlanId = "free" | "pro_yearly" | "pro_monthly";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  /** Total charged for one billing cycle, in whole kobo. */
  priceKobo: number;
  /** Naira amount for one billing cycle (display only; never used for charges). */
  pricePerMonth: number;
  period: "month" | "year";
  /** Billing-cycle display label, e.g. "/month" or "/year". */
  periodLabel: string;
  currency: string;
  description: string;
  isRecommended?: boolean;
  discountBadge?: string;
  features: string[];
  /** FREE quota limits; PRO is unlimited (null). */
  limits: {
    maxProjects: number | null; // null = unlimited
    maxBriefConversions: number | null; // null = unlimited
  };
}

/**
 * Canonical prices, whole kobo:
 *   Free          ₦0
 *   Pro Monthly   ₦12,000   -> 1,200,000 kobo per month
 *   Pro Yearly    ₦99,000   -> 9,900,000 kobo per year
 */
export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceKobo: 0,
    pricePerMonth: 0,
    period: "month",
    periodLabel: "/month",
    currency: "NGN",
    description:
      "Everything you need to try Scope with a couple of clients.",
    features: [
      "Up to 3 client projects",
      "5 AI brief conversions a month",
      "Core project tracking",
    ],
    limits: { maxProjects: 3, maxBriefConversions: 5 },
  },
  pro_yearly: {
    id: "pro_yearly",
    name: "Pro Yearly",
    priceKobo: 9_900_000, // ₦99,000 billed once per year
    pricePerMonth: 99_000,
    period: "year",
    periodLabel: "/year",
    currency: "NGN",
    isRecommended: true,
    discountBadge: "Save 31%",
    description:
      "Everything you need to try Scope with a couple of clients.",
    features: [
      "Unlimited client projects",
      "Unlimited AI brief conversions a month",
      "Priority support",
    ],
    limits: { maxProjects: null, maxBriefConversions: null },
  },
  pro_monthly: {
    id: "pro_monthly",
    name: "Pro Monthly",
    priceKobo: 1_200_000, // ₦12,000 billed once per month
    pricePerMonth: 12_000,
    period: "month",
    periodLabel: "/month",
    currency: "NGN",
    description:
      "Everything you need to try Scope with a couple of clients.",
    features: [
      "Unlimited client projects",
      "Unlimited AI brief conversions a month",
      "Priority support",
    ],
    limits: { maxProjects: null, maxBriefConversions: null },
  },
};

/**
 * Monthly-equivalent price in kobo (used for "from ₦X/month" comparisons).
 * Yearly plans divide the annual price by 12.
 */
export function planMonthlyEquivalentKobo(
  plan: PlanDefinition
): number {
  if (plan.id === "pro_yearly") {
    return Math.round(plan.priceKobo / 12);
  }
  return plan.priceKobo;
}

/** kobo -> whole naira (Flutterwave wants integer naira amounts). */
export function koboToNaira(amountKobo: number): number {
  return Math.round(amountKobo / 100);
}

/** naira (as Flutterwave reports it) -> whole kobo. */
export function nairaToKobo(amountNaira: number): number {
  return Math.round(amountNaira * 100);
}

const NGN_SYMBOL = "₦";

/**
 * Formats a kobo amount as a currency string, e.g. ₦12,000. Whole numbers only.
 * `displayBase` allows combining values into "₦99,000/year" style labels.
 */
export function formatKobo(amountKobo: number, currency = "NGN"): string {
  const symbol = currency === "NGN" ? NGN_SYMBOL : currency;
  return `${symbol}${Math.abs(amountKobo).toLocaleString("en-US")}`;
}

export function isProPlan(planId: PlanId): boolean {
  return planId === "pro_yearly" || planId === "pro_monthly";
}

/** Naira display only (used by pricing cards / modals). */
export function formatNaira(amountNaira: number, currency = "NGN"): string {
  const symbol = currency === "NGN" ? NGN_SYMBOL : currency;
  return `${symbol}${Math.abs(amountNaira).toLocaleString("en-US")}`;
}