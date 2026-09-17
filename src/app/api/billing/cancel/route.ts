import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { setCancelAtPeriodEnd } from "@/lib/billing/service";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let cancel = true;
  try {
    const body = await request.json();
    cancel = body?.cancel !== false;
  } catch {
    // Body is optional; the default action is to cancel.
  }

  try {
    const status = await setCancelAtPeriodEnd(user.id, cancel);
    return NextResponse.json({ plan: status.plan });
  } catch {
    return NextResponse.json(
      { error: "Could not update your subscription. Please try again." },
      { status: 400 }
    );
  }
}