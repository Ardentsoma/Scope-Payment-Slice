import "server-only";

import { prisma } from "@/lib/prisma";
import {
  PLANS,
  isProPlan,
  koboToNaira,
  nairaToKobo,
  planMonthlyEquivalentKobo,
  formatNaira,
  type PlanId,
} from "@/lib/billing/plans";
import { Prisma, type PlanTier, type Subscription, type SubscriptionStatus, type PaymentEventType, type CancellationReason } from "@prisma/client";
import { sendSubscriptionReceiptEmail } from "@/lib/email";

const MONTH_MS = 1000 * 60 * 60 * 24 * 30;
const DAY_MS = 1000 * 60 * 60 * 24;

/** How many checkout starts a user may begin per window, then blocked. */
export const CHECKOUT_RATE_LIMIT_MAX = 5;
export const CHECKOUT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function planIdToTier(planId: PlanId): PlanTier {
  if (planId === "pro_yearly") return "PRO_YEARLY";
  if (planId === "pro_monthly") return "PRO_MONTHLY";
  return "FREE";
}

function tierToPlanId(tier: PlanTier): PlanId {
  if (tier === "PRO_YEARLY") return "pro_yearly";
  if (tier === "PRO_MONTHLY") return "pro_monthly";
  return "free";
}

function periodEndFor(planId: PlanId, from = new Date()): Date {
  const end = new Date(from.getTime());
  if (planId === "pro_yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else if (planId === "pro_monthly") {
    end.setMonth(end.getMonth() + 1);
  } else {
    end.setTime(from.getTime() + MONTH_MS);
  }
  return end;
}

function buildInvoiceNumber(): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function newTxRef(userId: string): string {
  return `SCOPE-${userId.slice(-6).toUpperCase()}-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
}

/** Ensures a Subscription row exists for the user (lazily seeds FREE). */
export async function getOrCreateSubscription(
  userId: string
): Promise<Subscription> {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
  });
  if (existing) return existing;

  const now = new Date();
  return prisma.subscription.create({
    data: {
      userId,
      planTier: "FREE",
      status: "ACTIVE",
      amount: 0,
      currentPeriodStart: now,
      currentPeriodEnd: periodEndFor("free", now),
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Append-only payment history                                                 */
/* -------------------------------------------------------------------------- */

interface PaymentEventFields {
  txRef?: string | null;
  planId?: PlanId | null;
  amountKobo?: number | null;
  currency?: string;
  details?: Record<string, unknown> | null;
}

/**
 * Appends a row to the payment ledger. This is the ONLY way history is
 * written — rows are never updated or deleted, so the ledger always reflects
 * exactly what happened, in order.
 */
export async function recordPaymentEvent(
  userId: string,
  eventType: PaymentEventType,
  fields: PaymentEventFields = {}
): Promise<void> {
  await prisma.paymentEvent.create({
    data: {
      userId,
      eventType,
      txRef: fields.txRef ?? null,
      planId: fields.planId ?? null,
      amountKobo: fields.amountKobo ?? null,
      currency: fields.currency ?? "NGN",
      details: (fields.details ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
    },
  });
}

/** Recent payment history for a user, newest first (read-only display). */
export async function getPaymentHistory(userId: string, limit = 25) {
  const events = await prisma.paymentEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return events.map((event) => ({
    id: event.id,
    eventType: event.eventType,
    txRef: event.txRef,
    planId: event.planId,
    amountKobo: event.amountKobo,
    currency: event.currency,
    details: event.details,
    createdAt: event.createdAt.toISOString(),
  }));
}

/* -------------------------------------------------------------------------- */
/* Status                                                                      */
/* -------------------------------------------------------------------------- */

export interface BillingStatus {
  user: { id: string; email: string; fullName: string };
  plan: {
    id: PlanId;
    name: string;
    /** Monthly-equivalent price in kobo (display purposes). */
    amountKobo: number;
    /** Total charged per billing cycle, in kobo. */
    chargeKobo: number;
    /** "/month" or "/year". */
    periodLabel: string;
    currency: string;
    status: SubscriptionStatus;
    isPro: boolean;
    periodStart: string;
    periodEnd: string;
    cancelAtPeriodEnd: boolean;
    pendingPlan: { id: PlanId; name: string } | null;
  };
  invoices: Array<{
    id: string;
    number: string;
    planName: string;
    amountKobo: number;
    currency: string;
    status: "PAID" | "PENDING" | "FAILED";
    paymentMethod: string;
    billingPeriod: string;
    createdAt: string;
  }>;
}

export async function getBillingStatus(userId: string): Promise<BillingStatus> {
  let subscription = await getOrCreateSubscription(userId);
  const now = new Date();

  // Period wrapped: apply any scheduled plan change (or cancel/downgrade), or
  // renew a still-active plan, then align the period window.
  if (subscription.currentPeriodEnd <= now) {
    const before = tierToPlanId(subscription.planTier);
    let next: PlanTier | null = null;
    let transition: "change" | "cancel" | "renew" | "extend" = "extend";
    if (subscription.pendingPlanTier) {
      // A scheduled switch takes effect exactly when the current period ends.
      next = subscription.pendingPlanTier;
      transition = "change";
    } else if (subscription.cancelAtPeriodEnd) {
      // Canceled -> fall back to FREE at period end.
      next = "FREE";
      transition = "cancel";
    } else if (subscription.planTier === "FREE") {
      // Free has no natural expiry; extend the window.
      next = null;
    } else {
      // Still active with no change: renew the same paid tier for another cycle.
      next = subscription.planTier;
      transition = "renew";
    }

    subscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data:
        next === null
          ? {
              currentPeriodStart: now,
              currentPeriodEnd: periodEndFor("free", now),
            }
          : {
              planTier: next,
              // A scheduled change/cancel takes effect now: amount becomes the
              // target plan's price (0 for FREE); a plain renewal already has
              // the same amount, so this is a no-op in that case.
              amount:
                next === "FREE" ? 0 : PLANS[tierToPlanId(next)].priceKobo,
              pendingPlanTier: null,
              cancelAtPeriodEnd: false,
              currentPeriodStart: now,
              currentPeriodEnd: periodEndFor(tierToPlanId(next), now),
            },
    });

    // Keep the ledger accurate when the rollover actually happens.
    if (transition !== "extend" && transition !== "renew") {
      await recordPaymentEvent(userId, "PLAN_CHANGE_APPLIED", {
        planId: tierToPlanId(next!),
        amountKobo: PLANS[tierToPlanId(next!)].priceKobo,
        details: { fromPlanId: before, toPlanId: tierToPlanId(next!), periodEndedAt: now.toISOString() },
      }).catch(() => undefined);
    }
  }

  const [user, invoices] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const planId = tierToPlanId(subscription.planTier);
  const plan = PLANS[planId];
  const isPro = isProPlan(planId);
  const pendingPlanId = subscription.pendingPlanTier
    ? tierToPlanId(subscription.pendingPlanTier)
    : null;

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    },
    plan: {
      id: planId,
      name: plan.name,
      amountKobo: planMonthlyEquivalentKobo(plan),
      chargeKobo: plan.priceKobo,
      periodLabel: plan.periodLabel,
      currency: plan.currency,
      status: subscription.status,
      isPro,
      periodStart: subscription.currentPeriodStart.toISOString(),
      periodEnd: subscription.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      pendingPlan: pendingPlanId ? { id: pendingPlanId, name: PLANS[pendingPlanId].name } : null,
    },
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.invoiceNumber,
      planName: invoice.planName,
      amountKobo: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      paymentMethod: invoice.paymentMethod,
      billingPeriod: invoice.billingPeriod,
      createdAt: invoice.createdAt.toISOString(),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Plan changes & cancellation                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Schedules a plan change that takes effect when the current period ends.
 * The active subscription stays effective until it expires. Downgrading to
 * FREE also stops auto-renewal.
 */
export async function schedulePlanChange(
  userId: string,
  planId: PlanId
): Promise<BillingStatus> {
  const subscription = await getOrCreateSubscription(userId);
  const tier = planIdToTier(planId);

  if (subscription.pendingPlanTier === tier || subscription.planTier === tier) {
    // Already the current plan or a change is already scheduled to it.
    return clearPendingPlan(userId);
  }

  // A pending change to a paid plan has already been charged in full — never
  // overwrite it with the no-charge scheduling path.
  if (
    subscription.pendingPlanTier &&
    subscription.pendingPlanTier !== "FREE"
  ) {
    throw new Error(
      "You already have a paid plan change scheduled. Wait for it to apply before changing again."
    );
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      pendingPlanTier: tier,
      cancelAtPeriodEnd: tier === "FREE",
      updatedAt: new Date(),
    },
  });

  await recordPaymentEvent(userId, "PLAN_CHANGE_SCHEDULED", {
    planId,
    amountKobo: PLANS[planId].priceKobo,
    details: {
      fromPlanId: tierToPlanId(subscription.planTier),
      toPlanId: planId,
      effectiveDate: subscription.currentPeriodEnd.toISOString(),
    },
  }).catch(() => undefined);

  return getBillingStatus(userId);
}

/** Discards any scheduled plan change (and re-enables renewal). */
export async function clearPendingPlan(userId: string): Promise<BillingStatus> {
  const subscription = await getOrCreateSubscription(userId);
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { pendingPlanTier: null, cancelAtPeriodEnd: false, updatedAt: new Date() },
  });
  return getBillingStatus(userId);
}

/**
 * Toggles whether the paid plan renews at the end of the current period.
 * Canceled plans stay ACTIVE until the period end, then must re-subscribe.
 * Cancellation is recorded in the ledger only on the actual transition.
 */
export async function setCancelAtPeriodEnd(
  userId: string,
  cancel: boolean
): Promise<BillingStatus> {
  const subscription = await getOrCreateSubscription(userId);
  const alreadyCanceled = subscription.cancelAtPeriodEnd;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      cancelAtPeriodEnd: cancel,
      pendingPlanTier: cancel ? subscription.pendingPlanTier : null,
      updatedAt: new Date(),
    },
  });

  if (cancel && !alreadyCanceled) {
    await recordPaymentEvent(userId, "SUBSCRIPTION_CANCELLED", {
      planId: tierToPlanId(subscription.planTier),
      details: {
        cancelAtPeriodEnd: true,
        keepsProUntil: subscription.currentPeriodEnd.toISOString(),
      },
    }).catch(() => undefined);
  }

  return getBillingStatus(userId);
}

/** Records an optional "why are you leaving" answer. Never blocks anything. */
export async function recordCancellationSurvey(
  userId: string,
  reason: CancellationReason,
  comment?: string | null
): Promise<void> {
  await prisma.cancellationSurvey.create({
    data: {
      userId,
      reason,
      comment: comment?.trim() ? comment.trim() : null,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Checkout (create intent, rate limit)                                        */
/* -------------------------------------------------------------------------- */

export class CheckoutRateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super(
      `You've started too many checkouts recently. Please try again in ${Math.max(retryAfterSeconds, 1)}s.`
    );
    this.name = "CheckoutRateLimitError";
    this.retryAfterSeconds = Math.max(retryAfterSeconds, 1);
  }
}

export interface PaymentIntentData {
  txRef: string;
  /** Amount Flutterwave is asked to charge, in whole naira. */
  amountNaira: number;
  /** Amount in kobo (what this system stores). */
  amountKobo: number;
  currency: string;
  redirectUrl: string;
}

/** Full proration math for a paid upgrade, kept with actual numbers. */
export interface ProrationResult {
  fromPlanId: PlanId;
  toPlanId: PlanId;
  /** Full price of the target plan (kobo). */
  fullPriceKobo: number;
  /** Monthly price of the current plan (kobo). */
  currentPriceKobo: number;
  /** Days in the current billing period the credit is based on. */
  totalDays: number;
  /** Whole days left in the current period at upgrade time. */
  daysRemaining: number;
  /** Prorated credit for the unused days (kobo). */
  creditKobo: number;
  /** Final amount charged (kobo) = full price minus credit. */
  chargeKobo: number;
  /** Human-readable calc with actual numbers. */
  formula: string;
}

/**
 * Computes the upgrade proration (Pro Monthly -> Pro Yearly).
 *
 * The user already paid for the current monthly cycle. At upgrade time we credit
 * them for the untouched remainder of that month, at the daily rate of their
 * current plan, and subtract that from the full yearly price:
 *
 *   dailyRate   = currentPriceKobo / totalDays
 *   creditKobo  = dailyRate * daysRemaining
 *   chargeKobo  = fullPriceKobo - creditKobo
 *
 * Formula, e.g. "Pro Yearly ₦99,000 − (₦400/day × 30 days) = ₦87,000".
 */
export function computeProration(
  subscription: Pick<Subscription, "currentPeriodStart" | "currentPeriodEnd">,
  fromPlanId: PlanId,
  toPlanId: PlanId
): ProrationResult {
  const now = new Date();
  const fromPlan = PLANS[fromPlanId];
  const targetPlan = PLANS[toPlanId];

  const totalDays = Math.max(
    1,
    Math.round(
      (subscription.currentPeriodEnd.getTime() -
        subscription.currentPeriodStart.getTime()) /
        DAY_MS
    )
  );

  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (subscription.currentPeriodEnd.getTime() - now.getTime()) / DAY_MS
    )
  );

  const dailyRateKobo = Math.round(fromPlan.priceKobo / totalDays);
  const creditKobo = dailyRateKobo * daysRemaining;
  const fullPriceKobo = targetPlan.priceKobo;
  const chargeKobo = Math.max(0, fullPriceKobo - creditKobo);

  const formula = `${targetPlan.name} ${formatNaira(koboToNaira(fullPriceKobo))} − (${formatNaira(
    koboToNaira(dailyRateKobo)
  )}/day × ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"}) = ${formatNaira(
    koboToNaira(chargeKobo)
  )}`;

  return {
    fromPlanId,
    toPlanId,
    fullPriceKobo,
    currentPriceKobo: fromPlan.priceKobo,
    totalDays,
    daysRemaining,
    creditKobo,
    chargeKobo,
    formula,
  };
}

function planNameFor(planId: PlanId): string {
  if (planId === "pro_yearly") return "Scope Pro Yearly";
  if (planId === "pro_monthly") return "Scope Pro Monthly";
  return "Scope Free Plan";
}

function billingPeriodFor(planId: PlanId): string {
  if (planId === "pro_yearly") return "Annual (31% discount applied)";
  return "Monthly";
}

/**
 * Creates a PENDING invoice keyed by a tx_ref, records CHECKOUT_STARTED in the
 * ledger, and returns everything needed to launch the Flutterwave checkout.
 * The plan is NOT activated here — activation only happens after the charge is
 * confirmed by asking Flutterwave (see confirmPayment).
 *
 * Amount charged:
 * - Pro Monthly -> Pro Yearly (paid upgrade): PRORATED today (full yearly price
 *   minus credit for the unused remainder of the current monthly cycle), and
 *   the plan activates IMMEDIATELY on confirmation. The proration math is
 *   written to a Proration row (one per tx_ref) so the numbers are auditable.
 * - Free -> Pro: the plan's full price, activates immediately on confirmation.
 * - Paid downgrade (Pro Yearly -> Pro Monthly): the full target price, and the
 *   switch is scheduled for the end of the current period (a pending plan
 *   change).
 * All amounts whole kobo.
 *
 * Rate limited: at most CHECKOUT_RATE_LIMIT_MAX starts per user in a
 * CHECKOUT_RATE_LIMIT_WINDOW_MS window (tracked durably via the ledger).
 */
export async function createCheckoutIntent(
  userId: string,
  planId: PlanId,
  baseUrl: string,
  input: { billingEmail?: string | null; cardholderName?: string | null }
): Promise<PaymentIntentData> {
  const plan = PLANS[planId];

  const cutoff = new Date(Date.now() - CHECKOUT_RATE_LIMIT_WINDOW_MS);
  const recentStarts = await prisma.paymentEvent.count({
    where: {
      userId,
      eventType: "CHECKOUT_STARTED",
      createdAt: { gte: cutoff },
    },
  });
  if (recentStarts >= CHECKOUT_RATE_LIMIT_MAX) {
    const oldest = await prisma.paymentEvent.findFirst({
      where: { userId, eventType: "CHECKOUT_STARTED", createdAt: { gte: cutoff } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const retryAfterSeconds = oldest
      ? Math.ceil((oldest.createdAt.getTime() + CHECKOUT_RATE_LIMIT_WINDOW_MS - Date.now()) / 1000)
      : 60;
    throw new CheckoutRateLimitError(retryAfterSeconds);
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  // Only one checkout may be in flight per user: any earlier PENDING invoice is
  // an abandoned checkout (user retried, previous tab sat open, etc.). Fail it
  // so it never lingers as an orphan receipt and can't collide with the new one.
  await prisma.invoice.updateMany({
    where: { userId, status: "PENDING" },
    data: { status: "FAILED" },
  });

  const subscription = await getOrCreateSubscription(userId);
  const fromPlanId = tierToPlanId(subscription.planTier);

  // PRO_MONTHLY -> PRO_YEARLY is a paid upgrade: charge the prorated amount.
  const proration =
    fromPlanId === "pro_monthly" && planId === "pro_yearly"
      ? computeProration(subscription, fromPlanId, planId)
      : null;
  const amountKobo = proration ? proration.chargeKobo : plan.priceKobo;

  // Collect cardholder/billing info for the receipt. No card data, ever.
  const billingEmail = input.billingEmail?.trim() || user.email;
  const cardholderName = input.cardholderName?.trim() || user.fullName;

  let txRef = newTxRef(userId);
  // Astronomically unlikely tx_ref collision; regenerate rather than fail.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const exists = await prisma.invoice.findUnique({
      where: { paymentReference: txRef },
    });
    if (!exists) break;
    txRef = newTxRef(userId);
  }

  const targetTier = planIdToTier(planId);
  await prisma.invoice.create({
    data: {
      userId,
      invoiceNumber: buildInvoiceNumber(),
      planName: planNameFor(planId),
      planTier: targetTier,
      amount: amountKobo, // kobo
      currency: plan.currency,
      status: "PENDING",
      paymentMethod: "Flutterwave",
      billingPeriod: billingPeriodFor(planId),
      paymentReference: txRef,
      billingEmail,
      cardholderName,
    },
  });

  // Persist the proration math (one row per tx_ref, with actual numbers).
  if (proration) {
    await prisma.proration.create({
      data: {
        userId,
        txRef,
        fromPlanId: proration.fromPlanId,
        toPlanId: proration.toPlanId,
        fullPriceKobo: proration.fullPriceKobo,
        chargeKobo: proration.chargeKobo,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        totalDays: proration.totalDays,
        daysRemaining: proration.daysRemaining,
        dailyRateKobo: Math.round(proration.currentPriceKobo / proration.totalDays),
        creditKobo: proration.creditKobo,
        formula: proration.formula,
      },
    });
  }

  await recordPaymentEvent(userId, "CHECKOUT_STARTED", {
    txRef,
    planId,
    amountKobo,
    currency: plan.currency,
    details: {
      fromPlanId,
      toPlanId: planId,
      amountKobo,
    },
  }).catch(() => undefined);

  return {
    txRef,
    amountNaira: koboToNaira(amountKobo),
    amountKobo,
    currency: plan.currency,
    redirectUrl: `${baseUrl}/api/billing/verify`,
  };
}

/** Marks a PENDING invoice FAILED (e.g. checkout could not be created). */
export async function markPaymentFailed(
  txRef: string,
  reason = "checkout could not be created"
): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { paymentReference: txRef },
  });
  if (!invoice) return;

  await prisma.invoice.updateMany({
    where: { paymentReference: txRef, status: "PENDING" },
    data: { status: "FAILED" },
  });

  await recordPaymentEvent(invoice.userId, "PAYMENT_FAILED", {
    txRef,
    planId: tierToPlanId(invoice.planTier),
    amountKobo: invoice.amount,
    details: { reason },
  }).catch(() => undefined);
}

/* -------------------------------------------------------------------------- */
/* Payment confirmation                                                        */
/* -------------------------------------------------------------------------- */

export interface ConfirmPaymentVerification {
  isSuccessful: boolean;
  transactionId: string | null;
  /** Charged amount as reported by Flutterwave (naira). */
  amountNaira: number | null;
  currency: string | null;
  paymentMethod: string | null;
}

export type ConfirmPaymentOutcome =
  | { outcome: "confirmed"; txRef: string; planId: PlanId }
  | { outcome: "already_processed"; txRef: string }
  | { outcome: "failed"; txRef: string; reason: string }
  | { outcome: "not_found"; txRef: string };

/**
 * Confirms a Flutterwave payment and reconciles the subscription. Never trusts
 * a redirect badge or a webhook on its own — it is always called with a fresh
 * server-side verification from Flutterwave, and it re-checks the charged
 * amount + currency before unlocking anything.
 *
 * Semantics depend on where the user starts from:
 * - FREE -> Pro: charges the full fee and activates Pro immediately.
 * - Paid -> different paid plan (upgrade OR downgrade): charges the full fee
 *   now, then SCHEDULES the switch for the end of the current period. The
 *   current plan stays active until the period ends and only then rolls over
 *   (see getBillingStatus).
 *
 * Idempotent: if this exact tx_ref was already processed (invoice PAID), it
 * returns already_processed and does nothing, so duplicate webhook deliveries
 * can never double-activate or double-log a subscription.
 */
export async function confirmPayment(
  txRef: string,
  source: "webhook" | "verify",
  verification: ConfirmPaymentVerification
): Promise<ConfirmPaymentOutcome> {
  const invoice = await prisma.invoice.findUnique({
    where: { paymentReference: txRef },
    include: { user: true },
  });
  if (!invoice) {
    return { outcome: "not_found", txRef };
  }

  // Duplicate / already handled?
  if (invoice.status === "PAID") {
    return { outcome: "already_processed", txRef };
  }
  const ledgerCheck = await prisma.paymentEvent.findFirst({
    where: { txRef, eventType: "PAYMENT_CONFIRMED" },
    select: { id: true },
  });
  if (ledgerCheck) {
    return { outcome: "already_processed", txRef };
  }

  const userId = invoice.userId;
  const targetPlanId = tierToPlanId(invoice.planTier);
  const expectedKobo = invoice.amount;

  if (!verification.isSuccessful) {
    await recordPaymentEvent(userId, "PAYMENT_FAILED", {
      txRef,
      planId: targetPlanId,
      amountKobo: expectedKobo,
      details: {
        source,
        reason: "Flutterwave did not confirm the charge as successful",
        transactionId: verification.transactionId,
      },
    }).catch(() => undefined);
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "FAILED" },
    });
    return { outcome: "failed", txRef, reason: "not_confirmed" };
  }

  const paidKobo =
    verification.amountNaira != null ? nairaToKobo(verification.amountNaira) : null;
  const currencyMatches =
    !verification.currency || verification.currency === "NGN";

  if (paidKobo === null || paidKobo !== expectedKobo || !currencyMatches) {
    // Amount/currency mismatch is treated as failed — never unlock on it.
    await recordPaymentEvent(userId, "PAYMENT_FAILED", {
      txRef,
      planId: targetPlanId,
      amountKobo: expectedKobo,
      details: {
        source,
        reason: "amount/currency mismatch with Flutterwave",
        expectedKobo,
        actualKobo: paidKobo,
        currency: verification.currency,
        transactionId: verification.transactionId,
      },
    }).catch(() => undefined);
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "FAILED" },
    });
    return { outcome: "failed", txRef, reason: "amount_mismatch" };
  }

  const now = new Date();
  const subscription = await getOrCreateSubscription(userId);
  const currentTier = subscription.planTier;
  const targetTier = invoice.planTier;

  // A PRO_MONTHLY -> PRO_YEARLY upgrade is charged prorated and ACTIVATES
  // IMMEDIATELY (the user paid for the current month already; we credited the
  // unused days against the yearly price). A paid downgrade (PRO_YEARLY ->
  // PRO_MONTHLY) is scheduled to apply at the end of the current period — its
  // fee was charged in full but the plan only changes at renewal. FREE->Pro and
  // same-plan renewals activate right away. The subscription's stored `amount`
  // is always the FULL per-cycle price of the target plan (never the prorated
  // charge that was collected for this transaction).
  const proratedUpgrade = currentTier === "PRO_MONTHLY" && targetTier === "PRO_YEARLY";
  const scheduledChange =
    !proratedUpgrade &&
    targetTier !== "FREE" &&
    currentTier !== "FREE" &&
    targetTier !== currentTier;

  if (scheduledChange) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        pendingPlanTier: targetTier,
        cancelAtPeriodEnd: false,
        updatedAt: now,
      },
    });
  } else {
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planTier: targetTier,
        status: "ACTIVE",
        amount: PLANS[targetPlanId].priceKobo, // full cycle price, never prorated
        currency: invoice.currency,
        currentPeriodStart: now,
        currentPeriodEnd: periodEndFor(targetPlanId, now),
      },
      update: {
        planTier: targetTier,
        status: "ACTIVE",
        amount: PLANS[targetPlanId].priceKobo, // full cycle price, never prorated
        currency: invoice.currency,
        currentPeriodStart: now,
        currentPeriodEnd: periodEndFor(targetPlanId, now),
        cancelAtPeriodEnd: false,
        pendingPlanTier: null,
        updatedAt: now,
      },
    });
  }

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "PAID",
      transactionId: verification.transactionId ?? txRef,
      paymentMethod: verification.paymentMethod ?? "Flutterwave",
    },
  });

  await recordPaymentEvent(userId, "PAYMENT_CONFIRMED", {
    txRef,
    planId: targetPlanId,
    amountKobo: expectedKobo,
    details: {
      source,
      transactionId: verification.transactionId,
      chargedKobo: paidKobo,
      currency: "NGN",
      appliesAtPeriodEnd: scheduledChange,
    },
  }).catch(() => undefined);

  if (scheduledChange) {
    await recordPaymentEvent(userId, "PLAN_CHANGE_SCHEDULED", {
      txRef,
      planId: targetPlanId,
      amountKobo: expectedKobo,
      details: {
        paidChange: true,
        fromPlanId: tierToPlanId(currentTier),
        toPlanId: targetPlanId,
        effectiveDate: subscription.currentPeriodEnd.toISOString(),
      },
    }).catch(() => undefined);
  } else {
    await recordPaymentEvent(userId, "SUBSCRIPTION_ACTIVATED", {
      txRef,
      planId: targetPlanId,
      amountKobo: expectedKobo,
      details: { effectivePeriodStart: now.toISOString(), periodEnd: periodEndFor(targetPlanId, now).toISOString() },
    }).catch(() => undefined);
  }

  // Receipt dispatch is best-effort via the shared nodemailer helper.
  await sendSubscriptionReceiptEmail({
    to: invoice.billingEmail?.trim() || invoice.user.email,
    userName: invoice.cardholderName?.trim() || invoice.user.fullName,
    planId: targetPlanId,
    amountKobo: expectedKobo,
    currency: invoice.currency,
  });

  return { outcome: "confirmed", txRef, planId: targetPlanId };
}