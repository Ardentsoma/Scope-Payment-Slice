"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import {
  cancellationReasons,
  cancellationReasonLabel,
} from "@/lib/billing/cancellation-survey";
import PricingCards from "./pricing-cards";

interface BillingPageProps {
  currentPlanId: PlanId;
  planName: string;
  isPro: boolean;
  periodEnd: Date | string;
  cancelAtPeriodEnd: boolean;
  pendingPlan: { id: PlanId; name: string } | null;
}

function formatDate(iso: Date | string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BillingPage({
  currentPlanId,
  planName,
  isPro,
  periodEnd,
  cancelAtPeriodEnd,
  pendingPlan,
}: BillingPageProps) {
  const router = useRouter();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyDone, setSurveyDone] = useState(false);
  const [showThanks, setShowThanks] = useState(false);
  const [surveyReason, setSurveyReason] = useState<
    (typeof cancellationReasons)[number] | ""
  >("");
  const [surveyComment, setSurveyComment] = useState("");
  const [surveySubmitting, setSurveySubmitting] = useState(false);
  const [surveyError, setSurveyError] = useState<string | null>(null);

  const revertPlanChange = async () => {
    try {
      const res = await fetch("/api/billing/plan-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        setError("Could not revert the plan change. Please try again.");
        return;
      }
      setError(null);
      router.refresh();
    } catch {
      setError("Could not revert the plan change. Please try again.");
    }
  };

  const toggleCancel = async (cancel: boolean) => {
    setCancelling(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancel }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError("We couldn't update your subscription. Please try again.");
        return;
      }
      setNotice(
        cancel
          ? `Your Pro access continues until ${formatDate(json?.plan?.periodEnd ?? json?.planExpiresAt ?? periodEnd)}. You won't be charged again.`
          : "Auto-renewal is back on."
      );
      setConfirmingCancel(false);
      if (cancel) {
        setSurveyReason("");
        setSurveyComment("");
        setSurveyDone(false);
        setShowSurvey(true);
      }
      router.refresh();
    } catch {
      setError("We couldn't update your subscription. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const submitSurvey = async () => {
    if (!surveyReason) {
      setSurveyError("Please choose a reason.");
      return;
    }
    setSurveyError(null);
    setSurveySubmitting(true);
    try {
      const res = await fetch("/api/billing/cancellation-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: surveyReason,
          comment: surveyComment.trim() ? surveyComment.trim() : undefined,
        }),
      });
      if (res.ok) {
        setSurveyDone(true);
        setShowThanks(true);
      } else {
        setSurveyError("Could not save your feedback — you can skip this step.");
      }
    } catch {
      setSurveyError("Could not save your feedback — you can skip this step.");
    } finally {
      setSurveySubmitting(false);
    }
  };

  const skipSurvey = () => {
    setSurveyDone(true);
  };

  const planLabel = PLANS[currentPlanId]
    ? isPro
      ? `${planName} (${formatNaira(PLANS[currentPlanId].pricePerMonth)}${
          PLANS[currentPlanId].periodLabel === "/year" ? "/Year" : "/month"
        })`
      : "Free Tier (₦0/Month)"
    : planName;

  return (
    <div className="min-h-screen bg-warm-50 pb-16">
      <div className="mx-auto w-full max-w-[1220px] px-4 py-8 sm:px-6 sm:py-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#D9241B]">
              Billing &amp; Subscription
            </span>
            <h2 className="mt-0.5 text-xl font-black text-[#09090b] sm:text-2xl">
              Manage your plan
            </h2>
          </div>
          <Link
            href="/dashboard"
            className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-neutral-300 transition-colors hover:text-neutral-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>

          {/* Current plan info — PRO only */}
          {isPro && (
            <div className="mt-8 sm:mt-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#18181b]">
                      {planLabel}
                    </span>
                    <span className="rounded-full bg-[#D9241B] px-2 py-0.5 text-[10px] font-bold text-white">
                      {cancelAtPeriodEnd ? "CANCELLING" : "ACTIVE"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#71717a]">
                    {cancelAtPeriodEnd
                      ? `Cancels on ${formatDate(periodEnd)} — auto-renewal is off.`
                      : `Renews on ${formatDate(periodEnd)}.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmingCancel((v) => !v)}
                  className="cursor-pointer rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50"
                >
                  {cancelAtPeriodEnd ? "Turn on auto-renewal" : "Cancel subscription"}
                </button>
              </div>

              {pendingPlan && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-neutral-500">
                    {pendingPlan.id === "free"
                      ? "Switching to Free at renewal on "
                      : `Paid — switching to ${pendingPlan.name} at renewal on `}
                    {formatDate(periodEnd)}.
                  </span>
                  {pendingPlan.id === "free" && (
                    <button
                      type="button"
                      onClick={revertPlanChange}
                      className="cursor-pointer font-semibold text-[#D9241B] underline underline-offset-2 hover:text-[#B91C1C]"
                    >
                      Revert
                    </button>
                  )}
                </div>
              )}

              {error && (
                <p className="mt-3 text-sm text-red-700">{error}</p>
              )}

              {notice && (
                <p className="mt-3 text-sm text-emerald-700">{notice}</p>
              )}

              {confirmingCancel && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-[#18181b]">
                    Cancel your subscription? You&apos;ll keep Pro access until{" "}
                    <strong>{formatDate(periodEnd)}</strong>, then your plan returns
                    to Free. You won&apos;t be charged again.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCancel(true)}
                      disabled={cancelling}
                      className="cursor-pointer rounded-xl bg-[#D9241B] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#B91C1C] disabled:opacity-60"
                    >
                      {cancelling ? "Canceling…" : "Yes, cancel"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingCancel(false)}
                      disabled={cancelling}
                      className="cursor-pointer rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 disabled:opacity-60"
                    >
                      Keep plan
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cancellation survey — appears AFTER the cancellation succeeds */}
          {isPro && showSurvey && !surveyDone && (
            <div className="mt-8 sm:mt-10">
              <div className="rounded-[20px] border border-[#F6D7D7] bg-white p-5 shadow-lg sm:p-6">
                <h3 className="text-base font-black text-[#09090b]">
                  Help us improve Scope
                </h3>
                <p className="mt-0.5 text-sm text-[#71717a]">
                  Why did you cancel your plan?
                </p>

                <div className="mt-4 space-y-2.5">
                  {cancellationReasons.map((reason) => (
                    <label
                      key={reason}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium text-[#18181b] transition-colors ${
                        surveyReason === reason
                          ? "border-[#D9241B] bg-[#FFF8F7]"
                          : "border-neutral-200 bg-white hover:border-neutral-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancellation-reason"
                        value={reason}
                        checked={surveyReason === reason}
                        onChange={() => setSurveyReason(reason)}
                        className="h-4 w-4 shrink-0 accent-[#D9241B]"
                      />
                      {cancellationReasonLabel[reason]}
                    </label>
                  ))}
                </div>

                <textarea
                  value={surveyComment}
                  onChange={(e) => setSurveyComment(e.target.value)}
                  placeholder="Anything else you'd like us to know? (optional)"
                  rows={3}
                  maxLength={1000}
                  className="mt-4 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-[#D9241B] focus:outline-none"
                />

                {surveyError && (
                  <p className="mt-3 text-sm text-red-700">{surveyError}</p>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={submitSurvey}
                    disabled={surveySubmitting}
                    className="cursor-pointer rounded-xl bg-[#D9241B] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#B91C1C] disabled:opacity-60"
                  >
                    {surveySubmitting ? "Submitting…" : "Submit feedback"}
                  </button>
                  <button
                    type="button"
                    onClick={skipSurvey}
                    disabled={surveySubmitting}
                    className="cursor-pointer rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 disabled:opacity-60"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Plans grid */}
          <div className="mt-8 sm:mt-10">
            <PricingCards
              currentPlan={currentPlanId}
              pendingPlanId={pendingPlan?.id ?? null}
            />
          </div>
      </div>

      {/* Thank-you popup after the survey is submitted */}
      {showThanks && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowThanks(false)}
        >
          <div
            className="w-full max-w-sm rounded-[26px] border border-neutral-200 bg-white p-8 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FCE8E8]">
              <CheckCircle2 className="h-6 w-6 text-[#D9241B]" />
            </div>
            <h3 className="mt-4 text-xl font-black text-[#09090b]">
              Thank you!
            </h3>
            <p className="mt-1 text-sm text-[#71717a]">
              Thank you for filling the form — your feedback helps us improve
              Scope.
            </p>
            <button
              type="button"
              onClick={() => setShowThanks(false)}
              className="mt-5 w-full cursor-pointer rounded-xl bg-[#D9241B] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#B91C1C]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatNaira(amountNaira: number, currency = "NGN"): string {
  const symbol = currency === "NGN" ? "₦" : currency;
  return `${symbol}${Math.abs(amountNaira).toLocaleString("en-US")}`;
}