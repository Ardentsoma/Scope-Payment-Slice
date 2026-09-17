import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { subscribeSchema } from "@/lib/validation/billing";
import {
  CheckoutRateLimitError,
  createCheckoutIntent,
  markPaymentFailed,
} from "@/lib/billing/service";
import { createFlutterwavePayment } from "@/lib/billing/flutterwave";

/**
 * Starts a checkout: pre-registers the PENDING invoice, records a
 * CHECKOUT_STARTED ledger event, and returns the Flutterwave hosted-checkout
 * link. The plan is never unlocked here — approval happens later when we ask
 * Flutterwave to confirm the charge (verify route or webhook).
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated. Please sign in before continuing." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (!errors[path]) errors[path] = issue.message;
    }
    return NextResponse.json({ errors }, { status: 400 });
  }

  let checkout;
  try {
    checkout = await createCheckoutIntent(
      user.id,
      parsed.data.planId,
      request.nextUrl.origin,
      parsed.data
    );
  } catch (error) {
    if (error instanceof CheckoutRateLimitError) {
      return NextResponse.json(
        {
          error: error.message,
          retryAfterSeconds: error.retryAfterSeconds,
          hint: "You can try again in a few minutes. Each checkout uses one of your recent starts.",
        },
        { status: 429 }
      );
    }
    console.error("[subscribe] createCheckoutIntent failed", error);
    return NextResponse.json(
      {
        error:
          "We couldn't prepare your checkout. Give it a moment and try again — nothing was charged.",
      },
      { status: 500 }
    );
  }

  let paymentLink: string;
  try {
    const payment = await createFlutterwavePayment({
      txRef: checkout.txRef,
      // Flutterwave charges whole naira; convert from kobo right here.
      amountNaira: checkout.amountNaira,
      currency: checkout.currency,
      email: parsed.data.billingEmail?.trim() || user.email,
      name: parsed.data.cardholderName?.trim() || user.fullName,
      redirectUrl: checkout.redirectUrl,
      meta: {
        planId: parsed.data.planId,
        userId: user.id,
      },
    });
    paymentLink = payment.link;
  } catch (error) {
    console.error("[subscribe] Flutterwave payment creation failed", error);
    await markPaymentFailed(
      checkout.txRef,
      error instanceof Error ? error.message : "checkout could not be created"
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Payment gateway error: ${error.message}`
            : "We couldn't connect to the payment gateway. Please try again shortly.",
        hint: "No money has been charged. If this keeps happening, contact support.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      paymentLink,
      checkout: {
        txRef: checkout.txRef,
        amountKobo: checkout.amountKobo,
        amountNaira: checkout.amountNaira,
        currency: checkout.currency,
        planId: parsed.data.planId,
      },
    },
    { status: 200 }
  );
}