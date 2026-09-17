import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { z } from "zod";
import { recordCancellationSurvey } from "@/lib/billing/service";
import {
  cancellationReasons,
  cancellationReasonLabel,
} from "@/lib/billing/cancellation-survey";

const surveySchema = z.object({
  reason: z.enum(cancellationReasons),
  comment: z.string().max(1000).nullish(),
});

/**
 * Records an OPTIONAL "why are you leaving?" answer. The cancellation itself
 * is already done and never blocked or delayed by this endpoint — this only
 * saves feedback if the user chooses to give it.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = surveySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please choose a reason or skip this step." },
      { status: 400 }
    );
  }

  try {
    await recordCancellationSurvey(user.id, parsed.data.reason, parsed.data.comment);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not save your feedback. You can skip this step." },
      { status: 400 }
    );
  }
}

export { cancellationReasonLabel };