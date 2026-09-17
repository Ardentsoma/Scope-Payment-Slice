import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { verifyFlutterwaveTransaction } from "@/lib/billing/flutterwave";
import { confirmPayment } from "@/lib/billing/service";

/**
 * The customer lands on the dashboard after paying; the dashboard calls this
 * endpoint, which ALWAYS asks Flutterwave to confirm the charge server-side
 * before unlocking anything. Merely landing on a "success" page proves
 * nothing and never grants Pro.
 *
 * POST  -> verify + confirm, returns a structured outcome for the UI.
 * GET   -> legacy redirect for old checkout links that pointed here directly.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to confirm your payment." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const txRef: string | null =
    typeof body?.txRef === "string" && body.txRef.trim()
      ? body.txRef.trim()
      : null;
  if (!txRef) {
    return NextResponse.json(
      { error: "Missing payment reference. Please go back and try again." },
      { status: 400 }
    );
  }

  // Ask Flutterwave. If the call itself fails (network/API), we do NOT record
  // a failure or redirect anywhere — the customer can retry from the page.
  let verification;
  try {
    verification = await verifyFlutterwaveTransaction(txRef);
  } catch {
    return NextResponse.json(
      {
        outcome: "error",
        error:
          "We couldn't reach the payment provider to confirm your payment. Please wait a moment and try again — your payment should still be collected.",
        hint: "If your card was charged, your subscription will be activated automatically once the provider confirms it.",
      },
      { status: 200 }
    );
  }

  const result = await confirmPayment(txRef, "verify", verification).catch(
    () => null
  );

  if (!result) {
    return NextResponse.json(
      {
        outcome: "error",
        error:
          "Something unexpected went wrong while confirming your payment.",
        hint: "Please contact support with your payment reference, or try again in a moment.",
      },
      { status: 200 }
    );
  }

  switch (result.outcome) {
    case "confirmed":
      return NextResponse.json({
        outcome: "confirmed",
        planId: result.planId,
        message: "Payment confirmed — your Pro plan is now active.",
      });
    case "already_processed":
      return NextResponse.json({
        outcome: "confirmed",
        message:
          "This payment was already confirmed — your Pro plan is active.",
      });
    case "not_found":
      return NextResponse.json({
        outcome: "failed",
        error:
          "We couldn't find this payment in our records. It may have expired before completion.",
        hint: "Return to the Plans page to start a new checkout.",
      });
    case "failed":
      return NextResponse.json({
        outcome: "failed",
        error:
          result.reason === "amount_mismatch"
            ? "The amount charged does not match the plan price, so we could not activate your subscription."
            : "Your payment was not confirmed as successful.",
        hint: "If you believe you were charged, contact support with your payment reference before paying again.",
      });
  }
}

export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;
  const status = request.nextUrl.searchParams.get("status");
  const txRef = request.nextUrl.searchParams.get("tx_ref");

  // No completed checkout -> nothing was charged; return to a clean dashboard.
  if (!txRef || status !== "successful") {
    return NextResponse.redirect(new URL("/dashboard", baseUrl));
  }

  // Never trust the redirect's own status: re-confirm the charge with
  // Flutterwave server-side before unlocking anything.
  let verification: Awaited<
    ReturnType<typeof verifyFlutterwaveTransaction>
  >;
  try {
    verification = await verifyFlutterwaveTransaction(txRef);
  } catch {
    // Provider unreachable — don't claim success or failure. Land on the
    // dashboard; the webhook (once configured) reconciles the invoice.
    return NextResponse.redirect(new URL("/dashboard", baseUrl));
  }

  const result = await confirmPayment(txRef, "verify", verification).catch(
    () => null
  );

  if (
    result &&
    (result.outcome === "confirmed" ||
      result.outcome === "already_processed")
  ) {
    return NextResponse.redirect(
      new URL("/dashboard?payment=success", baseUrl)
    );
  }

  return NextResponse.redirect(
    new URL("/dashboard?payment=failed", baseUrl)
  );
}