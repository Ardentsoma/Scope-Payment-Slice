import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/auth/config";
import { getBillingStatus } from "@/lib/billing/service";
import BillingPage from "@/components/billing/billing-page";

export const metadata: Metadata = {
  title: "Billing | SCOPE",
};

export const dynamic = "force-dynamic";

export default async function BillingRoute() {
  if (!isAuthConfigured()) {
    redirect("/signin");
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/signin");
  }

  const status = await getBillingStatus(user.id);

  return (
    <BillingPage
      currentPlanId={status.plan.id}
      planName={status.plan.name}
      isPro={status.plan.isPro}
      periodEnd={status.plan.periodEnd}
      cancelAtPeriodEnd={status.plan.cancelAtPeriodEnd}
      pendingPlan={status.plan.pendingPlan}
    />
  );
}