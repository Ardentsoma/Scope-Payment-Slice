import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getBillingStatus } from "@/lib/billing/service";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const status = await getBillingStatus(user.id);
  return NextResponse.json({ status }, { status: 200 });
}