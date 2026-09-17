import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  schedulePlanChange,
  clearPendingPlan,
} from "@/lib/billing/service";
import { PLANS, type PlanId } from "@/lib/billing/plans";

/**
 * Schedules a plan change for the end of the current billing period.
 *
 * Only the FREE downgrade (Pro -> Free) is allowed here — it is the one plan
 * change that charges no fee, so it can be scheduled directly. Every paid
 * plan change (Pro Monthly <-> Pro Yearly) charges the full fee and MUST go
 * through the paid checkout (`/api/billing/subscribe`) instead.
 *
 * POST { planId: "free" } -> schedule; POST { planId: null }/{} -> revert.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let planId: PlanId | null = null;
  try {
    const body = await request.json();
    planId = body?.planId ?? null;
  } catch {
    // Empty body means "revert".
  }

  try {
    if (planId && planId !== "free") {
      return NextResponse.json(
        {
          error:
            "Paid plan changes are charged and handled in checkout — go back to the plans grid to pay.",
        },
        { status: 400 }
      );
    }
    const status =
      planId && planId in PLANS
        ? await schedulePlanChange(user.id, planId as PlanId)
        : await clearPendingPlan(user.id);
    return NextResponse.json({ plan: status.plan });
  } catch {
    return NextResponse.json(
      { error: "Could not update your plan. Please try again." },
      { status: 400 }
    );
  }
}