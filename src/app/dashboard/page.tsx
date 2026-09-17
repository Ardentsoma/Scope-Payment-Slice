import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/config";
import { getBillingStatus } from "@/lib/billing/service";
import { formatNaira, PLANS } from "@/lib/billing/plans";
import AppHeader from "@/components/layout/app-header";

export const metadata: Metadata = {
  title: "Dashboard | SCOPE",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  if (!isAuthConfigured()) {
    redirect("/signin");
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/signin");
  }

  const status = await getBillingStatus(user.id);
  const { payment } = await searchParams;
  const firstName = user.fullName.trim().split(/\s+/)[0] || "there";
  const planDisplay = status.plan.isPro
    ? `${status.plan.name} (${formatNaira(PLANS[status.plan.id].pricePerMonth)}${
        PLANS[status.plan.id].periodLabel === "/year" ? "/Year" : "/Month"
      })`
    : "Free Tier (₦0/Month)";

  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <AppHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
        {payment === "success" && (
          <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
            {status.plan.pendingPlan && status.plan.isPro ? (
              <>
                Payment confirmed — you&apos;re switching to{" "}
                <strong>{status.plan.pendingPlan.name}</strong> at your next
                renewal.
              </>
            ) : (
              <>
                Payment confirmed — your account is now on the{" "}
                <strong>{status.plan.name}</strong> plan. Check your inbox for
                the receipt.
              </>
            )}
          </div>
        )}

        {payment === "failed" && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
            Your payment was not completed. If you were charged, contact
            support — otherwise you can try again.
          </div>
        )}

        {/* Top banner with user status — the initial design */}
        <div className="flex flex-col justify-between gap-6 rounded-3xl border border-[#eee7dc] bg-[#FAF7F2] p-6 sm:p-8 md:flex-row md:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D9241B]">
                Scope Workspace
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  status.plan.isPro
                    ? "bg-[#D9241B] text-white"
                    : "bg-[#EAE7E1] text-[#71717a]"
                }`}
              >
                {status.plan.isPro ? "PRO ACTIVE" : "FREE PLAN"}
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#09090b] sm:text-3xl">
              Hello, {firstName}
            </h2>
            <p className="mt-1 text-sm text-[#71717a]">
              Current Tier: <strong className="text-[#18181b]">{planDisplay}</strong>{" "}
              • Linked to {status.user.email}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/billing"
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#09090b] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-neutral-800"
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              {status.plan.isPro ? "Change Plan" : "Upgrade to Pro"}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}